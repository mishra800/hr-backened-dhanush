"""
Candidate Portal Router
Handles candidate login creation, exam access, and AI interview
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime, timedelta
import secrets
import string
from passlib.context import CryptContext
from app import database, models, schemas
from app.email_service import email_service
from pydantic import BaseModel

router = APIRouter(
    prefix="/candidate-portal",
    tags=["candidate-portal"]
)

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# ============================================
# SCHEMAS
# ============================================

class CandidateLoginCreate(BaseModel):
    application_id: int
    send_email: bool = True

class CandidateLoginResponse(BaseModel):
    email: str
    password: str
    login_url: str
    message: str

class ExamAccessRequest(BaseModel):
    application_id: int
    exam_duration_minutes: int = 60

# ============================================
# HELPER FUNCTIONS
# ============================================

def generate_password(length=12):
    """Generate a secure random password"""
    alphabet = string.ascii_letters + string.digits + "!@#$%"
    password = ''.join(secrets.choice(alphabet) for i in range(length))
    return password

def get_password_hash(password):
    """Hash a password"""
    return pwd_context.hash(password)

# ============================================
# ENDPOINTS
# ============================================

@router.post("/create-candidate-login", response_model=CandidateLoginResponse)
async def create_candidate_login(
    data: CandidateLoginCreate,
    db: Session = Depends(database.get_db)
):
    """
    Create login credentials for a candidate
    Admin/HR uses this after shortlisting a candidate
    """
    
    # Get application
    application = db.query(models.Application).filter(
        models.Application.id == data.application_id
    ).first()
    
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")
    
    # Check if user already exists
    existing_user = db.query(models.User).filter(
        models.User.email == application.candidate_email
    ).first()
    
    if existing_user:
        # User already has login
        return CandidateLoginResponse(
            email=application.candidate_email,
            password="[Already exists - password not shown]",
            login_url="http://localhost:3000/login",
            message="Candidate already has login credentials"
        )
    
    # Generate password
    temp_password = generate_password()
    
    # Create user account with role='candidate'
    new_user = models.User(
        email=application.candidate_email,
        hashed_password=get_password_hash(temp_password),
        role="candidate",
        is_active=True
    )
    
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    # Update application status to 'assessment'
    application.status = "assessment"
    db.commit()
    
    # Send email with credentials
    if data.send_email:
        try:
            await email_service.send_candidate_credentials(
                candidate_email=application.candidate_email,
                candidate_name=application.candidate_name,
                job_title=application.job.title if application.job else "Position",
                login_email=application.candidate_email,
                temporary_password=temp_password,
                login_url="http://localhost:3000/login"
            )
        except Exception as e:
            print(f"Failed to send email: {e}")
    
    return CandidateLoginResponse(
        email=application.candidate_email,
        password=temp_password,
        login_url="http://localhost:3000/login",
        message="Login credentials created successfully. Email sent to candidate."
    )

@router.post("/grant-exam-access")
async def grant_exam_access(
    data: ExamAccessRequest,
    db: Session = Depends(database.get_db)
):
    """
    Grant exam access to a candidate
    Assigns assessment and sets deadline
    """
    
    application = db.query(models.Application).filter(
        models.Application.id == data.application_id
    ).first()
    
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")
    
    # Find assessment for this job
    assessment = db.query(models.Assessment).filter(
        models.Assessment.job_id == application.job_id,
        models.Assessment.is_active == True
    ).first()
    
    if not assessment:
        # Update status anyway
        application.status = "assessment"
        db.commit()
        return {
            "message": "Exam access granted (no assessment configured)",
            "application_id": application.id,
            "candidate_email": application.candidate_email,
            "note": "Please create an assessment for this job first"
        }
    
    # Check if already assigned
    existing = db.query(models.CandidateAssessment).filter(
        models.CandidateAssessment.application_id == data.application_id,
        models.CandidateAssessment.assessment_id == assessment.id
    ).first()
    
    if existing:
        return {
            "message": "Assessment already assigned",
            "candidate_assessment_id": existing.id,
            "status": existing.status,
            "deadline": existing.deadline
        }
    
    # Create candidate assessment
    from datetime import timedelta
    deadline = datetime.utcnow() + timedelta(hours=48)
    
    candidate_assessment = models.CandidateAssessment(
        application_id=data.application_id,
        assessment_id=assessment.id,
        status="pending",
        deadline=deadline
    )
    
    db.add(candidate_assessment)
    
    # Update application status
    application.status = "assessment"
    db.commit()
    db.refresh(candidate_assessment)
    
    return {
        "message": "Exam access granted",
        "application_id": application.id,
        "candidate_assessment_id": candidate_assessment.id,
        "candidate_email": application.candidate_email,
        "exam_duration_minutes": assessment.duration_minutes,
        "deadline": deadline
    }

@router.post("/grant-ai-interview-access/{application_id}")
async def grant_ai_interview_access(
    application_id: int,
    db: Session = Depends(database.get_db)
):
    """
    Grant AI interview access after exam completion
    """
    
    application = db.query(models.Application).filter(
        models.Application.id == application_id
    ).first()
    
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")
    
    # Check if AI interview already exists
    existing_interview = db.query(models.AIInterview).filter(
        models.AIInterview.application_id == application_id
    ).first()
    
    if existing_interview:
        return {
            "message": "AI interview already exists",
            "interview_id": existing_interview.id,
            "status": existing_interview.status
        }
    
    # Create AI interview session
    ai_interview = models.AIInterview(
        application_id=application_id,
        status="pending"
    )
    
    db.add(ai_interview)
    db.commit()
    db.refresh(ai_interview)
    
    # Send email notification
    try:
        await email_service.send_ai_interview_invitation(
            candidate_email=application.candidate_email,
            candidate_name=application.candidate_name,
            job_title=application.job.title if application.job else "Position",
            interview_link=f"http://localhost:3000/recruitment/interview/{application_id}"
        )
    except Exception as e:
        print(f"Failed to send email: {e}")
    
    return {
        "message": "AI interview access granted",
        "interview_id": ai_interview.id,
        "interview_link": f"http://localhost:3000/recruitment/interview/{application_id}"
    }

@router.get("/candidate-dashboard/{email}")
async def get_candidate_dashboard(
    email: str,
    db: Session = Depends(database.get_db)
):
    """
    Get candidate's dashboard with their applications and pending tasks
    """
    
    # Get all applications for this candidate
    applications = db.query(models.Application).filter(
        models.Application.candidate_email == email
    ).all()
    
    result = []
    for app in applications:
        # Check for pending exam
        has_exam = app.status == "assessment"
        
        # Check for AI interview
        ai_interview = db.query(models.AIInterview).filter(
            models.AIInterview.application_id == app.id
        ).first()
        
        # Check for scheduled interviews
        interviews = db.query(models.Interview).filter(
            models.Interview.application_id == app.id
        ).all()
        
        result.append({
            "application_id": app.id,
            "job_title": app.job.title if app.job else "N/A",
            "job_department": app.job.department if app.job else "N/A",
            "applied_date": app.applied_date,
            "status": app.status,
            "ai_fit_score": app.ai_fit_score,
            "pending_tasks": {
                "exam": has_exam and not ai_interview,
                "ai_interview": ai_interview and ai_interview.status == "pending",
                "face_to_face_interview": len([i for i in interviews if i.status == "scheduled"]) > 0
            },
            "ai_interview_link": f"/recruitment/interview/{app.id}" if ai_interview else None,
            "interviews": [
                {
                    "id": i.id,
                    "scheduled_time": i.scheduled_time,
                    "meeting_link": i.meeting_link,
                    "status": i.status
                }
                for i in interviews
            ]
        })
    
    return {
        "candidate_email": email,
        "total_applications": len(applications),
        "applications": result
    }

@router.post("/bulk-create-logins")
async def bulk_create_candidate_logins(
    application_ids: list[int],
    db: Session = Depends(database.get_db)
):
    """
    Create login credentials for multiple candidates at once
    """
    
    results = []
    
    for app_id in application_ids:
        try:
            result = await create_candidate_login(
                CandidateLoginCreate(application_id=app_id, send_email=True),
                db
            )
            results.append({
                "application_id": app_id,
                "success": True,
                "email": result.email
            })
        except Exception as e:
            results.append({
                "application_id": app_id,
                "success": False,
                "error": str(e)
            })
    
    return {
        "total": len(application_ids),
        "successful": len([r for r in results if r["success"]]),
        "failed": len([r for r in results if not r["success"]]),
        "results": results
    }
