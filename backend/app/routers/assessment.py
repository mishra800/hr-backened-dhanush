"""
Assessment/Exam Router
Handles online exams for candidates
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timedelta
import secrets
from app import database, models
from pydantic import BaseModel

router = APIRouter(
    prefix="/assessment",
    tags=["assessment"]
)

# ============================================
# SCHEMAS
# ============================================

class QuestionCreate(BaseModel):
    question_text: str
    question_type: str  # multiple_choice, coding, text
    options: Optional[List[str]] = None
    correct_answer: Optional[str] = None
    points: int = 1

class AssessmentCreate(BaseModel):
    title: str
    description: str
    job_id: int
    duration_minutes: int = 60
    passing_score: float = 60.0
    questions: List[QuestionCreate]

class AnswerSubmit(BaseModel):
    question_id: int
    answer: str

class AssessmentSubmit(BaseModel):
    candidate_assessment_id: int
    answers: List[AnswerSubmit]

# ============================================
# ADMIN ENDPOINTS - Create & Manage Assessments
# ============================================

@router.post("/create")
async def create_assessment(
    data: AssessmentCreate,
    db: Session = Depends(database.get_db)
):
    """Admin creates an assessment for a job"""
    
    # Verify job exists
    job = db.query(models.Job).filter(models.Job.id == data.job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    # Create assessment
    assessment = models.Assessment(
        title=data.title,
        description=data.description,
        job_id=data.job_id,
        duration_minutes=data.duration_minutes,
        passing_score=data.passing_score,
        questions=[q.dict() for q in data.questions]
    )
    
    db.add(assessment)
    db.commit()
    db.refresh(assessment)
    
    return {
        "message": "Assessment created successfully",
        "assessment_id": assessment.id,
        "total_questions": len(data.questions)
    }

@router.post("/assign/{application_id}")
async def assign_assessment_to_candidate(
    application_id: int,
    assessment_id: int,
    deadline_hours: int = 48,
    db: Session = Depends(database.get_db)
):
    """Admin assigns assessment to a candidate"""
    
    # Verify application exists
    application = db.query(models.Application).filter(
        models.Application.id == application_id
    ).first()
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")
    
    # Verify assessment exists
    assessment = db.query(models.Assessment).filter(
        models.Assessment.id == assessment_id
    ).first()
    if not assessment:
        raise HTTPException(status_code=404, detail="Assessment not found")
    
    # Check if already assigned
    existing = db.query(models.CandidateAssessment).filter(
        models.CandidateAssessment.application_id == application_id,
        models.CandidateAssessment.assessment_id == assessment_id
    ).first()
    
    if existing:
        return {
            "message": "Assessment already assigned",
            "candidate_assessment_id": existing.id,
            "status": existing.status
        }
    
    # Create candidate assessment
    deadline = datetime.utcnow() + timedelta(hours=deadline_hours)
    
    candidate_assessment = models.CandidateAssessment(
        application_id=application_id,
        assessment_id=assessment_id,
        status="pending",
        deadline=deadline
    )
    
    db.add(candidate_assessment)
    db.commit()
    db.refresh(candidate_assessment)
    
    # Update application status
    application.status = "assessment"
    db.commit()
    
    return {
        "message": "Assessment assigned successfully",
        "candidate_assessment_id": candidate_assessment.id,
        "deadline": deadline,
        "duration_minutes": assessment.duration_minutes
    }

@router.get("/list")
async def list_assessments(
    job_id: Optional[int] = None,
    db: Session = Depends(database.get_db)
):
    """List all assessments"""
    
    query = db.query(models.Assessment)
    
    if job_id:
        query = query.filter(models.Assessment.job_id == job_id)
    
    assessments = query.all()
    
    return {
        "total": len(assessments),
        "assessments": [
            {
                "id": a.id,
                "title": a.title,
                "job_id": a.job_id,
                "duration_minutes": a.duration_minutes,
                "total_questions": len(a.questions) if a.questions else 0,
                "passing_score": a.passing_score
            }
            for a in assessments
        ]
    }

# ============================================
# CANDIDATE ENDPOINTS - Take Assessment
# ============================================

@router.post("/start/{candidate_assessment_id}")
async def start_assessment(
    candidate_assessment_id: int,
    db: Session = Depends(database.get_db)
):
    """Candidate starts the assessment"""
    
    candidate_assessment = db.query(models.CandidateAssessment).filter(
        models.CandidateAssessment.id == candidate_assessment_id
    ).first()
    
    if not candidate_assessment:
        raise HTTPException(status_code=404, detail="Assessment not found")
    
    # Check if already completed
    if candidate_assessment.status == "completed":
        raise HTTPException(status_code=400, detail="Assessment already completed")
    
    # Check if expired
    if candidate_assessment.deadline and datetime.utcnow() > candidate_assessment.deadline:
        candidate_assessment.status = "expired"
        db.commit()
        raise HTTPException(status_code=400, detail="Assessment deadline has passed")
    
    # Create exam session
    session_token = secrets.token_urlsafe(32)
    expires_at = datetime.utcnow() + timedelta(minutes=candidate_assessment.assessment.duration_minutes)
    
    exam_session = models.ExamSession(
        application_id=candidate_assessment.application_id,
        candidate_assessment_id=candidate_assessment_id,
        session_token=session_token,
        expires_at=expires_at
    )
    
    db.add(exam_session)
    
    # Update status
    candidate_assessment.status = "in_progress"
    candidate_assessment.started_at = datetime.utcnow()
    
    db.commit()
    db.refresh(exam_session)
    
    # Return questions (without correct answers)
    questions = candidate_assessment.assessment.questions
    safe_questions = []
    for i, q in enumerate(questions):
        safe_q = {
            "id": i,
            "question_text": q.get("question_text"),
            "question_type": q.get("question_type"),
            "options": q.get("options"),
            "points": q.get("points", 1)
        }
        safe_questions.append(safe_q)
    
    return {
        "session_token": session_token,
        "expires_at": expires_at,
        "duration_minutes": candidate_assessment.assessment.duration_minutes,
        "total_questions": len(safe_questions),
        "questions": safe_questions
    }

@router.post("/submit")
async def submit_assessment(
    data: AssessmentSubmit,
    db: Session = Depends(database.get_db)
):
    """Candidate submits assessment answers"""
    
    candidate_assessment = db.query(models.CandidateAssessment).filter(
        models.CandidateAssessment.id == data.candidate_assessment_id
    ).first()
    
    if not candidate_assessment:
        raise HTTPException(status_code=404, detail="Assessment not found")
    
    if candidate_assessment.status == "completed":
        raise HTTPException(status_code=400, detail="Assessment already submitted")
    
    # Calculate score
    questions = candidate_assessment.assessment.questions
    total_points = sum(q.get("points", 1) for q in questions)
    earned_points = 0
    
    for answer in data.answers:
        if answer.question_id < len(questions):
            question = questions[answer.question_id]
            correct_answer = question.get("correct_answer")
            
            if correct_answer and answer.answer.strip().lower() == correct_answer.strip().lower():
                earned_points += question.get("points", 1)
    
    score = (earned_points / total_points * 100) if total_points > 0 else 0
    
    # Update candidate assessment
    candidate_assessment.status = "completed"
    candidate_assessment.completed_at = datetime.utcnow()
    candidate_assessment.score = score
    candidate_assessment.answers = [a.dict() for a in data.answers]
    
    if candidate_assessment.started_at:
        time_taken = (datetime.utcnow() - candidate_assessment.started_at).total_seconds() / 60
        candidate_assessment.time_taken_minutes = int(time_taken)
    
    db.commit()
    
    # Check if passed
    passed = score >= candidate_assessment.assessment.passing_score
    
    return {
        "message": "Assessment submitted successfully",
        "score": round(score, 2),
        "passing_score": candidate_assessment.assessment.passing_score,
        "passed": passed,
        "time_taken_minutes": candidate_assessment.time_taken_minutes,
        "total_questions": len(questions),
        "correct_answers": int(earned_points)
    }

@router.get("/candidate/{application_id}")
async def get_candidate_assessments(
    application_id: int,
    db: Session = Depends(database.get_db)
):
    """Get all assessments for a candidate"""
    
    assessments = db.query(models.CandidateAssessment).filter(
        models.CandidateAssessment.application_id == application_id
    ).all()
    
    return {
        "total": len(assessments),
        "assessments": [
            {
                "id": a.id,
                "assessment_title": a.assessment.title,
                "status": a.status,
                "score": a.score,
                "deadline": a.deadline,
                "started_at": a.started_at,
                "completed_at": a.completed_at,
                "passed": a.score >= a.assessment.passing_score if a.score else False
            }
            for a in assessments
        ]
    }

@router.get("/results/{candidate_assessment_id}")
async def get_assessment_results(
    candidate_assessment_id: int,
    db: Session = Depends(database.get_db)
):
    """Get detailed assessment results"""
    
    candidate_assessment = db.query(models.CandidateAssessment).filter(
        models.CandidateAssessment.id == candidate_assessment_id
    ).first()
    
    if not candidate_assessment:
        raise HTTPException(status_code=404, detail="Assessment not found")
    
    if candidate_assessment.status != "completed":
        raise HTTPException(status_code=400, detail="Assessment not completed yet")
    
    return {
        "assessment_title": candidate_assessment.assessment.title,
        "score": candidate_assessment.score,
        "passing_score": candidate_assessment.assessment.passing_score,
        "passed": candidate_assessment.score >= candidate_assessment.assessment.passing_score,
        "time_taken_minutes": candidate_assessment.time_taken_minutes,
        "completed_at": candidate_assessment.completed_at,
        "total_questions": len(candidate_assessment.assessment.questions),
        "answers": candidate_assessment.answers
    }
