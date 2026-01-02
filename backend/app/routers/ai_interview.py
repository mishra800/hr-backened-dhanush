from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app import database, models, schemas
import random

router = APIRouter(
    prefix="/ai-interview",
    tags=["ai-interview"]
)

QUESTIONS = [
    "Tell me about yourself and your background.",
    "What is your greatest strength and weakness?",
    "Describe a challenging project you worked on.",
    "Why do you want to join our company?",
    "Where do you see yourself in 5 years?"
]

@router.post("/start", response_model=schemas.AIInterviewOut)
def start_ai_interview(interview_data: schemas.AIInterviewCreate, db: Session = Depends(database.get_db)):
    # Check if interview already exists
    existing = db.query(models.AIInterview).filter(models.AIInterview.application_id == interview_data.application_id).first()
    if existing:
        return existing
    
    new_interview = models.AIInterview(
        application_id=interview_data.application_id,
        status="in_progress"
    )
    db.add(new_interview)
    db.commit()
    db.refresh(new_interview)
    return new_interview

@router.get("/{interview_id}", response_model=schemas.AIInterviewOut)
def get_interview(interview_id: int, db: Session = Depends(database.get_db)):
    interview = db.query(models.AIInterview).filter(models.AIInterview.id == interview_id).first()
    if not interview:
        raise HTTPException(status_code=404, detail="Interview not found")
    return interview

@router.post("/respond", response_model=dict)
def submit_response(request: schemas.AIResponseRequest, db: Session = Depends(database.get_db)):
    interview = db.query(models.AIInterview).filter(models.AIInterview.id == request.interview_id).first()
    if not interview:
        raise HTTPException(status_code=404, detail="Interview not found")
    
    # Determine the current question index based on logs count
    current_q_index = len(interview.logs)
    
    if current_q_index >= len(QUESTIONS):
        return {"message": "Interview completed", "next_question": None, "completed": True}

    current_question = QUESTIONS[current_q_index]
    
    # Real AI Analysis using ai_utils
    from app import ai_utils
    
    sentiment_res = ai_utils.analyze_sentiment(request.candidate_response)
    sentiment_label = sentiment_res["label"]
    sentiment_score = sentiment_res["score"]
    
    # Calculate score based on sentiment and length (Heuristic)
    # Base score 5.0
    # Length bonus: up to 3.0 (for > 200 chars)
    # Sentiment bonus: up to 2.0 (for positive)
    
    length_score = min(len(request.candidate_response) / 50.0, 3.0)
    sent_bonus = 0
    if sentiment_label == "Positive": sent_bonus = 2.0
    elif sentiment_label == "Neutral": sent_bonus = 1.0
    
    final_score = 5.0 + length_score + sent_bonus
    final_score = min(round(final_score, 1), 10.0)
    
    evaluation = f"Candidate response analyzed. Sentiment: {sentiment_label} ({round(sentiment_score, 2)}). Depth: {'Good' if length_score > 2 else 'Brief'}."
    
    # Map sentiment label to tone
    sentiment = sentiment_label # Use the label directly or map to "Confident", etc.
    score = final_score
    
    # Save Log
    log = models.AIInterviewLog(
        interview_id=interview.id,
        question=current_question,
        candidate_response=request.candidate_response,
        ai_evaluation=evaluation,
        score=score,
        sentiment=sentiment
    )
    db.add(log)
    
    # Check if this was the last question
    next_q_index = current_q_index + 1
    next_question = None
    completed = False
    
    if next_q_index < len(QUESTIONS):
        next_question = QUESTIONS[next_q_index]
    else:
        completed = True
        interview.status = "completed"
        # Calculate overall score
        total_score = sum([l.score for l in interview.logs]) + score
        interview.overall_score = round(total_score / (len(interview.logs) + 1), 1)
        interview.emotional_tone = "Confident & Professional" # Mock aggregate
    
    db.commit()
    
    return {
        "message": "Response recorded",
        "next_question": next_question,
        "completed": completed,
        "ai_feedback": evaluation # Optional: show immediate feedback
    }

@router.get("/{interview_id}/next-question", response_model=dict)
def get_next_question(interview_id: int, db: Session = Depends(database.get_db)):
    interview = db.query(models.AIInterview).filter(models.AIInterview.id == interview_id).first()
    if not interview:
        raise HTTPException(status_code=404, detail="Interview not found")
        
    current_q_index = len(interview.logs)
    if current_q_index >= len(QUESTIONS):
        return {"question": None, "completed": True}
        
    return {"question": QUESTIONS[current_q_index], "completed": False}

@router.post("/generate-questions/{application_id}", response_model=List[str])
def generate_questions_from_resume(application_id: int, db: Session = Depends(database.get_db)):
    application = db.query(models.Application).filter(models.Application.id == application_id).first()
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")
    
    # Mock Resume Parsing & Question Generation
    # In a real app, this would read the PDF/Docx from application.resume_url
    
    # We'll use the job title as a proxy for resume content for this demo
    job_title = application.job.title.lower() if application.job else "general"
    
    questions = [
        "Could you walk me through your resume?",
    ]
    
    if "react" in job_title:
        questions.extend([
            "I see you have React experience. Describe a complex component you built.",
            "How do you handle state management in your recent projects?",
            "Have you worked with Server-Side Rendering?"
        ])
    elif "python" in job_title:
        questions.extend([
            "Your resume mentions Python. What frameworks are you most comfortable with?",
            "Describe a situation where you had to optimize a slow database query.",
            "How do you manage dependencies in your Python projects?"
        ])
    else:
        questions.extend([
            "What is your greatest professional achievement listed here?",
            "Describe a time you demonstrated leadership.",
            "How do your skills align with this role?"
        ])
        
    questions.append("Do you have any questions for us?")
    
    return questions

@router.post("/proctor/log")
def log_proctoring_event(event: dict, db: Session = Depends(database.get_db)):
    # event: { "interview_id": int, "type": "eye_movement" | "hand_movement" | "tab_switch", "timestamp": str }
    print(f"⚠️ PROCTORING ALERT: {event.get('type')} detected for Interview {event.get('interview_id')}")
    # In real app, save to DB
    return {"status": "logged", "severity": "high" if event.get('type') == 'tab_switch' else "medium"}
