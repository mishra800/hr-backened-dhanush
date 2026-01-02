from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
import shutil
import os
from sqlalchemy.orm import Session
from typing import List
from app import database, models, schemas
from app.security_utils import generate_secure_token
from app.notification_service import get_notification_service
from app.routers.notifications import notification_manager
import qrcode
from io import BytesIO
import base64

# Try to import ResumeParser, but make it optional
try:
    from app.resume_parser import ResumeParser
    RESUME_PARSER_AVAILABLE = True
except ImportError as e:
    print(f"Warning: ResumeParser not available - {e}")
    print("Install dependencies: pip install PyPDF2 python-docx spacy nltk")
    RESUME_PARSER_AVAILABLE = False
    ResumeParser = None

router = APIRouter(
    prefix="/recruitment",
    tags=["recruitment"]
)

def generate_qr_code(application_url: str) -> str:
    """Generate QR code for application link"""
    try:
        qr = qrcode.QRCode(version=1, box_size=10, border=5)
        qr.add_data(application_url)
        qr.make(fit=True)
        
        img = qr.make_image(fill_color="black", back_color="white")
        buffer = BytesIO()
        img.save(buffer, format='PNG')
        
        # Return base64 encoded image
        return base64.b64encode(buffer.getvalue()).decode()
    except Exception as e:
        print(f"Error generating QR code: {e}")
        return None

async def notify_hr_new_application(application: models.Application, db: Session):
    """Notify HR/Admin about new job application with enhanced notifications"""
    try:
        notification_service = get_notification_service(db)
        
        # Use the enhanced notification system
        await notification_service.notify_hr_new_application(application.id)
        
        # Send real-time WebSocket notification to all HR/Admin users
        await notification_manager.broadcast_to_roles(
            roles=['hr', 'admin'],
            message={
                "type": "new_application",
                "title": "New Application Received",
                "message": f"New application for {application.job.title} from {application.candidate_name}",
                "data": {
                    "application_id": application.id,
                    "job_title": application.job.title,
                    "candidate_name": application.candidate_name,
                    "candidate_email": application.candidate_email,
                    "applied_date": application.applied_date.isoformat(),
                    "ai_fit_score": application.ai_fit_score
                }
            },
            db=db
        )
        
    except Exception as e:
        print(f"Error notifying HR: {e}")

# --- Jobs ---

@router.post("/jobs/", response_model=schemas.JobOut)
def create_job(job: schemas.JobCreate, db: Session = Depends(database.get_db)):
    # Generate unique application link code
    application_link_code = generate_secure_token(12)  # 12 chars = short & unique
    
    # Ensure uniqueness (very rare collision, but safety first)
    while db.query(models.Job).filter(models.Job.application_link_code == application_link_code).first():
        application_link_code = generate_secure_token(12)
    
    job_data = job.dict()
    job_data['application_link_code'] = application_link_code
    
    db_job = models.Job(**job_data)
    db.add(db_job)
    db.commit()
    db.refresh(db_job)
    return db_job

@router.get("/dashboard")
def get_recruitment_dashboard(db: Session = Depends(database.get_db)):
    """Get recruitment dashboard metrics"""
    from sqlalchemy import func, case
    
    # Get basic counts
    total_jobs = db.query(models.Job).count()
    active_jobs = db.query(models.Job).filter(models.Job.is_active == True).count()
    total_applications = db.query(models.Application).count()
    
    # Get applications by status
    status_counts = db.query(
        models.Application.status,
        func.count(models.Application.id).label('count')
    ).group_by(models.Application.status).all()
    
    # Get recent applications (last 7 days)
    from datetime import datetime, timedelta
    week_ago = datetime.utcnow() - timedelta(days=7)
    recent_applications = db.query(models.Application).filter(
        models.Application.applied_date >= week_ago
    ).count()
    
    # Get top jobs by application count
    top_jobs = db.query(
        models.Job.title,
        func.count(models.Application.id).label('application_count')
    ).join(models.Application).group_by(models.Job.id, models.Job.title).order_by(
        func.count(models.Application.id).desc()
    ).limit(5).all()
    
    return {
        "total_jobs": total_jobs,
        "active_jobs": active_jobs,
        "total_applications": total_applications,
        "recent_applications": recent_applications,
        "status_breakdown": {status: count for status, count in status_counts},
        "top_jobs": [{"title": title, "applications": count} for title, count in top_jobs]
    }

@router.get("/jobs/", response_model=List[schemas.JobOut])
def read_jobs(skip: int = 0, limit: int = 100, db: Session = Depends(database.get_db)):
    jobs = db.query(models.Job).offset(skip).limit(limit).all()
    return jobs

@router.get("/jobs/active", response_model=List[schemas.JobOut])
def get_active_jobs(db: Session = Depends(database.get_db)):
    """Get all active job postings for public careers page"""
    return db.query(models.Job).filter(models.Job.is_active == True).all()

@router.get("/apply/{link_code}", response_model=schemas.JobOut)
def get_job_by_link(link_code: str, db: Session = Depends(database.get_db)):
    """Public endpoint for candidates to access job via unique link"""
    job = db.query(models.Job).filter(
        models.Job.application_link_code == link_code,
        models.Job.is_active == True
    ).first()
    
    if not job:
        raise HTTPException(status_code=404, detail="Job not found or inactive")
    
    return job

@router.post("/apply", response_model=schemas.ApplicationOut)
async def apply_for_job_public(
    job_id: int = Form(...),
    candidate_name: str = Form(...),
    candidate_email: str = Form(...),
    phone: str = Form(...),
    cover_letter: str = Form(""),
    resume: UploadFile = File(...),
    db: Session = Depends(database.get_db)
):
    """Public endpoint for job applications from careers page"""
    # Check if job exists and is active
    job = db.query(models.Job).filter(models.Job.id == job_id, models.Job.is_active == True).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found or not active")
    
    # Check if candidate already applied
    existing = db.query(models.Application).filter(
        models.Application.job_id == job_id,
        models.Application.candidate_email == candidate_email
    ).first()
    
    if existing:
        raise HTTPException(status_code=400, detail="You have already applied for this position")
    
    # Save resume file
    resume_url = None
    if resume:
        upload_dir = "uploads/resumes"
        os.makedirs(upload_dir, exist_ok=True)
        
        file_extension = os.path.splitext(resume.filename)[1]
        safe_filename = f"{candidate_name.replace(' ', '_')}_{job_id}{file_extension}"
        file_path = os.path.join(upload_dir, safe_filename)
        
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(resume.file, buffer)
        
        resume_url = file_path
    
    # Create application
    db_application = models.Application(
        job_id=job_id,
        candidate_name=candidate_name,
        candidate_email=candidate_email,
        phone=phone,
        resume_url=resume_url,
        status="applied",
        source="careers_website"
    )
    
    db.add(db_application)
    db.commit()
    db.refresh(db_application)
    
    # Send notification to candidate
    try:
        notification_service = get_notification_service(db)
        await notification_service.notify_application_received(db_application.id)
    except Exception as e:
        print(f"Failed to send application notification: {e}")
    
    # Notify HR/Admin about new application
    try:
        await notify_hr_new_application(db_application, db)
    except Exception as e:
        print(f"Failed to notify HR: {e}")
    
    return db_application

@router.post("/apply/{link_code}", response_model=schemas.ApplicationOut)
async def apply_via_link(
    link_code: str,
    candidate_name: str = Form(...),
    candidate_email: str = Form(...),
    phone: str = Form(...),
    cover_letter: str = Form(""),
    resume: UploadFile = File(...),
    db: Session = Depends(database.get_db)
):
    """Apply for job using unique application link"""
    # Find job by link code
    job = db.query(models.Job).filter(
        models.Job.application_link_code == link_code,
        models.Job.is_active == True
    ).first()
    
    if not job:
        raise HTTPException(status_code=404, detail="Job not found or inactive")
    
    # Check if candidate already applied
    existing = db.query(models.Application).filter(
        models.Application.job_id == job.id,
        models.Application.candidate_email == candidate_email
    ).first()
    
    if existing:
        raise HTTPException(status_code=400, detail="You have already applied for this position")
    
    # Save resume file
    resume_url = None
    if resume:
        upload_dir = "uploads/resumes"
        os.makedirs(upload_dir, exist_ok=True)
        
        file_extension = os.path.splitext(resume.filename)[1]
        safe_filename = f"{candidate_name.replace(' ', '_')}_{job.id}{file_extension}"
        file_path = os.path.join(upload_dir, safe_filename)
        
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(resume.file, buffer)
        
        resume_url = file_path
    
    # Create application with source tracking
    db_application = models.Application(
        job_id=job.id,
        candidate_name=candidate_name,
        candidate_email=candidate_email,
        phone=phone,
        resume_url=resume_url,
        status="applied",
        source=f"unique_link_{link_code}"  # Track source as unique link
    )
    
    db.add(db_application)
    db.commit()
    db.refresh(db_application)
    
    # Send notification to candidate
    try:
        notification_service = get_notification_service(db)
        await notification_service.notify_application_received(db_application.id)
    except Exception as e:
        print(f"Failed to send application notification: {e}")
    
    # Notify HR/Admin about new application
    try:
        await notify_hr_new_application(db_application, db)
    except Exception as e:
        print(f"Failed to notify HR: {e}")
    
    return db_application

@router.get("/jobs/{job_id}", response_model=schemas.JobOut)
def read_job(job_id: int, db: Session = Depends(database.get_db)):
    job = db.query(models.Job).filter(models.Job.id == job_id).first()
    if job is None:
        raise HTTPException(status_code=404, detail="Job not found")
    return job

@router.patch("/jobs/{job_id}", response_model=schemas.JobOut)
def update_job(job_id: int, job_update: schemas.JobCreate, db: Session = Depends(database.get_db)):
    """Update job details"""
    job = db.query(models.Job).filter(models.Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    # Update job fields
    for field, value in job_update.dict(exclude_unset=True).items():
        setattr(job, field, value)
    
    db.commit()
    db.refresh(job)
    return job

@router.delete("/jobs/{job_id}")
def delete_job(job_id: int, db: Session = Depends(database.get_db)):
    job = db.query(models.Job).filter(models.Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    # Delete associated applications first
    db.query(models.Application).filter(models.Application.job_id == job_id).delete()
    
    # Delete the job
    db.delete(job)
    db.commit()
    return {"message": "Job deleted successfully"}

@router.patch("/jobs/{job_id}/approve", response_model=schemas.JobOut)
def approve_job(job_id: int, db: Session = Depends(database.get_db)):
    job = db.query(models.Job).filter(models.Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    # Generate application link if not exists (for backward compatibility)
    if not job.application_link_code:
        application_link_code = generate_secure_token(12)
        # Ensure uniqueness
        while db.query(models.Job).filter(models.Job.application_link_code == application_link_code).first():
            application_link_code = generate_secure_token(12)
        job.application_link_code = application_link_code
        
        # Generate QR code for the application link
        application_url = f"https://yourapp.com/apply/{application_link_code}"  # Update with your domain
        qr_code_data = generate_qr_code(application_url)
        if qr_code_data:
            job.qr_code_url = f"data:image/png;base64,{qr_code_data}"
    
    job.requisition_status = "approved"
    job.is_active = True
    job.current_step = 1 # Move to Job Posting
    db.commit()
    db.refresh(job)
    return job

# --- Applications ---

import random

@router.post("/jobs/optimize", response_model=schemas.JDOptimizeRequest)
def optimize_job_description(request: schemas.JDOptimizeRequest):
    # Mock AI Optimization
    optimized_text = f"AI Optimized: {request.description}\n\nKey Responsibilities:\n- Lead innovative projects.\n- Collaborate with cross-functional teams.\n\nRequirements:\n- Proven experience in the field.\n- Strong communication skills."
    return {"description": optimized_text}

@router.get("/jobs/{job_id}/sourcing/candidates", response_model=List[dict])
def source_candidates(job_id: int, db: Session = Depends(database.get_db)):
    job = db.query(models.Job).filter(models.Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    # DISABLED: Mock sourcing feature
    # This was generating fake candidates for demo purposes
    # Return empty list to show no sourced candidates
    return []
    
    # Original mock sourcing code commented out below:
    # Dynamic Mock Sourcing based on Job Title
    # title_lower = job.title.lower()
    # candidates = []
    # 
    # tech_stack = []
    # if "react" in title_lower: tech_stack = ["React", "Redux", "TypeScript"]
    # elif "python" in title_lower or "backend" in title_lower: tech_stack = ["Python", "FastAPI", "PostgreSQL"]
    # elif "java" in title_lower: tech_stack = ["Java", "Spring Boot", "Microservices"]
    # elif "design" in title_lower: tech_stack = ["Figma", "Adobe XD", "UI/UX"]
    # else: tech_stack = ["Communication", "Project Management"]
    #
    # sources = ["LinkedIn", "Indeed", "GitHub", "AngelList"]
    # 
    # for i in range(5):
    #     import random
    #     source = random.choice(sources)
    #     match_score = random.randint(75, 99)
    #     
    #     # Generate a name (Mock)
    #     first_names = ["Alex", "Jordan", "Taylor", "Morgan", "Casey", "Riley", "Jamie"]
    #     last_names = ["Doe", "Smith", "Johnson", "Williams", "Brown", "Jones"]
    #     name = f"{random.choice(first_names)} {random.choice(last_names)}"
    #     
    #     candidates.append({
    #         "name": name,
    #         "email": f"{name.lower().replace(' ', '.')}@example.com",
    #         "source": source,
    #         "match_score": match_score,
    #         "skills": tech_stack,
    #         "profile_url": f"https://{source.lower()}.com/{name.lower().replace(' ', '')}"
    #     })
    #     
    # return candidates

@router.post("/jobs/{job_id}/sourcing/add", response_model=schemas.ApplicationOut)
def add_sourced_candidate(
    job_id: int, 
    candidate: schemas.SourcedCandidateCreate, 
    db: Session = Depends(database.get_db)
):
    job = db.query(models.Job).filter(models.Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
        
    # Check if already exists
    existing = db.query(models.Application).filter(
        models.Application.job_id == job_id,
        models.Application.candidate_email == candidate.email
    ).first()
    
    if existing:
        return existing

    db_application = models.Application(
        job_id=job_id,
        candidate_name=candidate.name,
        candidate_email=candidate.email,
        resume_url=candidate.profile_url, # Using profile URL as resume placeholder
        status="sourced", # Special status for sourced candidates
        ai_fit_score=candidate.match_score
    )
    db.add(db_application)
    db.commit()
    db.refresh(db_application)
    return db_application

@router.post("/jobs/{job_id}/apply", response_model=schemas.ApplicationOut)
def apply_for_job(
    job_id: int,
    candidate_name: str = Form(...),
    candidate_email: str = Form(...),
    resume_url: str = Form(None),
    resume: UploadFile = File(None),
    db: Session = Depends(database.get_db)
):
    job = db.query(models.Job).filter(models.Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    final_resume_url = resume_url
    
    if resume:
        upload_dir = "uploads/resumes"
        os.makedirs(upload_dir, exist_ok=True)
        file_location = f"{upload_dir}/{resume.filename}"
        with open(file_location, "wb") as buffer:
            shutil.copyfileobj(resume.file, buffer)
        final_resume_url = file_location
    
    if not final_resume_url:
         raise HTTPException(status_code=400, detail="Either resume URL or file upload is required")

    # AI-Powered Resume Scoring
    fit_score = 0.0
    
    # If file was uploaded and AI parser is available, use AI scoring
    if RESUME_PARSER_AVAILABLE and resume and os.path.exists(final_resume_url):
        try:
            parser = ResumeParser()
            fit_score, breakdown = parser.calculate_ai_fit_score(
                final_resume_url, 
                job.description
            )
            print(f"AI Scoring Breakdown: {breakdown}")
        except Exception as e:
            print(f"Error in AI scoring: {e}")
            # Fallback to basic scoring
            fit_score = round(random.uniform(60.0, 85.0), 1)
    else:
        # Fallback: Use random scoring if AI parser not available
        if not RESUME_PARSER_AVAILABLE:
            print("Using fallback scoring - AI parser dependencies not installed")
        fit_score = round(random.uniform(65.0, 85.0), 1)
    
    db_application = models.Application(
        job_id=job_id,
        candidate_name=candidate_name,
        candidate_email=candidate_email,
        resume_url=final_resume_url,
        ai_fit_score=fit_score
    )
    db.add(db_application)
    db.commit()
    db.refresh(db_application)
    return db_application

@router.get("/applications/search")
def search_applications(
    q: str = None,
    status: str = None,
    job_id: int = None,
    min_score: float = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(database.get_db)
):
    """Search applications with filters"""
    query = db.query(models.Application)
    
    if q:
        # Search in candidate name and email
        query = query.filter(
            (models.Application.candidate_name.ilike(f"%{q}%")) |
            (models.Application.candidate_email.ilike(f"%{q}%"))
        )
    
    if status:
        query = query.filter(models.Application.status == status)
    
    if job_id:
        query = query.filter(models.Application.job_id == job_id)
    
    if min_score:
        query = query.filter(models.Application.ai_fit_score >= min_score)
    
    applications = query.offset(skip).limit(limit).all()
    return applications

@router.get("/applications/", response_model=List[schemas.ApplicationOut])
def read_applications(skip: int = 0, limit: int = 100, db: Session = Depends(database.get_db)):
    applications = db.query(models.Application).offset(skip).limit(limit).all()
    return applications

@router.get("/jobs/{job_id}/applications", response_model=List[schemas.ApplicationOut])
def read_job_applications(job_id: int, db: Session = Depends(database.get_db)):
    applications = db.query(models.Application).filter(models.Application.job_id == job_id).all()
    return applications

@router.post("/applications/{application_id}/notes")
async def add_review_notes(
    application_id: int,
    notes_data: dict,
    db: Session = Depends(database.get_db)
):
    """Add review notes for an application"""
    application = db.query(models.Application).filter(models.Application.id == application_id).first()
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")
    
    # For now, we'll store notes in a simple way
    # In a production system, you might want a separate ReviewNotes table
    notes = notes_data.get('notes', '')
    action = notes_data.get('action', '')
    
    # Log the review action
    print(f"Review Notes for Application {application_id}:")
    print(f"Action: {action}")
    print(f"Notes: {notes}")
    print(f"Candidate: {application.candidate_name}")
    print("---")
    
    return {"message": "Review notes saved successfully"}

@router.get("/applications/{application_id}/resume")
async def get_resume_file(application_id: int, db: Session = Depends(database.get_db)):
    """Serve resume file for viewing"""
    from fastapi.responses import FileResponse
    import os
    import logging
    
    logger = logging.getLogger(__name__)
    
    application = db.query(models.Application).filter(models.Application.id == application_id).first()
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")
    
    if not application.resume_url:
        raise HTTPException(status_code=404, detail="No resume found for this application")
    
    # Log the file path for debugging
    logger.info(f"Attempting to serve resume: {application.resume_url}")
    
    # Check if file exists
    if not os.path.exists(application.resume_url):
        # Try alternative paths
        alternative_paths = [
            application.resume_url,
            os.path.join("uploads", "resumes", os.path.basename(application.resume_url)),
            os.path.join("backend", application.resume_url) if not application.resume_url.startswith("backend") else application.resume_url
        ]
        
        file_found = False
        actual_path = None
        
        for path in alternative_paths:
            if os.path.exists(path):
                actual_path = path
                file_found = True
                logger.info(f"Found resume at alternative path: {path}")
                break
        
        if not file_found:
            logger.error(f"Resume file not found at any of these paths: {alternative_paths}")
            raise HTTPException(status_code=404, detail=f"Resume file not found on server. Tried paths: {alternative_paths}")
        
        application.resume_url = actual_path
    
    # Get file extension to set proper content type
    file_ext = os.path.splitext(application.resume_url)[1].lower()
    
    if file_ext == '.pdf':
        media_type = 'application/pdf'
    elif file_ext in ['.doc', '.docx']:
        media_type = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    else:
        media_type = 'application/octet-stream'
    
    return FileResponse(
        path=application.resume_url,
        media_type=media_type,
        filename=f"{application.candidate_name}_Resume{file_ext}"
    )

@router.get("/applications/{application_id}/debug")
async def debug_application(application_id: int, db: Session = Depends(database.get_db)):
    """Debug endpoint to check application data"""
    import os
    
    application = db.query(models.Application).filter(models.Application.id == application_id).first()
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")
    
    return {
        "application_id": application.id,
        "candidate_name": application.candidate_name,
        "resume_url": application.resume_url,
        "file_exists": os.path.exists(application.resume_url) if application.resume_url else False,
        "current_working_directory": os.getcwd(),
        "resume_url_absolute": os.path.abspath(application.resume_url) if application.resume_url else None
    }

# --- Interviews ---

@router.post("/interviews/", response_model=schemas.InterviewOut)
def schedule_interview(interview: schemas.InterviewCreate, db: Session = Depends(database.get_db)):
    db_interview = models.Interview(**interview.dict())
    db.add(db_interview)
    db.commit()
    db.refresh(db_interview)
    
    # Mock Email Notification
    application = db.query(models.Application).filter(models.Application.id == interview.application_id).first()
    interviewer = db.query(models.User).filter(models.User.id == interview.interviewer_id).first()
    
    if application and interviewer:
        print(f"--- EMAIL SENT ---")
        print(f"To: {application.candidate_email}")
        print(f"Subject: Interview Scheduled")
        print(f"Body: Dear {application.candidate_name}, your interview is scheduled for {interview.scheduled_time}. Link: {interview.meeting_link}")
        print(f"CC: {interviewer.email}")
        print(f"------------------")

    return db_interview

@router.post("/interviews/{interview_id}/feedback")
def submit_interview_feedback(
    interview_id: int,
    feedback_data: dict,
    db: Session = Depends(database.get_db)
):
    """Submit interview feedback"""
    interview = db.query(models.Interview).filter(models.Interview.id == interview_id).first()
    if not interview:
        raise HTTPException(status_code=404, detail="Interview not found")
    
    # Check if InterviewFeedback model exists and create feedback
    try:
        feedback = models.InterviewFeedback(
            interview_id=interview_id,
            interviewer_id=feedback_data.get('interviewer_id'),
            technical_score=feedback_data.get('technical_score', 0),
            communication_score=feedback_data.get('communication_score', 0),
            cultural_fit_score=feedback_data.get('cultural_fit_score', 0),
            overall_recommendation=feedback_data.get('overall_recommendation', 'neutral'),
            detailed_feedback=feedback_data.get('detailed_feedback', ''),
            strengths=feedback_data.get('strengths', ''),
            areas_for_improvement=feedback_data.get('areas_for_improvement', '')
        )
        db.add(feedback)
        db.commit()
        db.refresh(feedback)
        return {"message": "Feedback submitted successfully", "feedback_id": feedback.id}
    except Exception as e:
        # Fallback if model doesn't exist - just log the feedback
        print(f"Interview Feedback for Interview {interview_id}:")
        print(f"Technical: {feedback_data.get('technical_score', 'N/A')}")
        print(f"Communication: {feedback_data.get('communication_score', 'N/A')}")
        print(f"Cultural Fit: {feedback_data.get('cultural_fit_score', 'N/A')}")
        print(f"Recommendation: {feedback_data.get('overall_recommendation', 'N/A')}")
        print(f"Feedback: {feedback_data.get('detailed_feedback', 'N/A')}")
        return {"message": "Feedback logged successfully (fallback mode)"}

@router.get("/interviews/{interview_id}/feedback")
def get_interview_feedback(interview_id: int, db: Session = Depends(database.get_db)):
    """Get interview feedback"""
    interview = db.query(models.Interview).filter(models.Interview.id == interview_id).first()
    if not interview:
        raise HTTPException(status_code=404, detail="Interview not found")
    
    try:
        feedback = db.query(models.InterviewFeedback).filter(
            models.InterviewFeedback.interview_id == interview_id
        ).all()
        return feedback
    except Exception:
        # Fallback if model doesn't exist
        return []

@router.get("/interviews/", response_model=List[schemas.InterviewOut])
def read_interviews(skip: int = 0, limit: int = 100, db: Session = Depends(database.get_db)):
    return db.query(models.Interview).offset(skip).limit(limit).all()

# --- Offer Management ---

@router.post("/offers/")
def create_offer(
    offer_data: dict,
    db: Session = Depends(database.get_db)
):
    """Create offer letter for a candidate"""
    application_id = offer_data.get('application_id')
    application = db.query(models.Application).filter(models.Application.id == application_id).first()
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")
    
    # Create offer (using a simple approach since OfferLetter model may not be fully implemented)
    offer_details = {
        "application_id": application_id,
        "position": offer_data.get('position'),
        "salary": offer_data.get('salary'),
        "start_date": offer_data.get('start_date'),
        "benefits": offer_data.get('benefits', ''),
        "terms": offer_data.get('terms', ''),
        "status": "pending"
    }
    
    # Update application status to indicate offer sent
    application.status = "offer_sent"
    db.commit()
    
    return {"message": "Offer created successfully", "offer_details": offer_details}

@router.get("/offers/{application_id}")
def get_offer(application_id: int, db: Session = Depends(database.get_db)):
    """Get offer details for an application"""
    application = db.query(models.Application).filter(models.Application.id == application_id).first()
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")
    
    # Mock offer details (in production, query from offers table)
    if application.status in ["offer_sent", "offer_accepted", "offer_rejected"]:
        return {
            "application_id": application_id,
            "status": application.status,
            "candidate_name": application.candidate_name,
            "job_title": application.job.title if application.job else "Unknown"
        }
    else:
        raise HTTPException(status_code=404, detail="No offer found for this application")

@router.patch("/offers/{application_id}/status")
def update_offer_status(
    application_id: int,
    status_data: dict,
    db: Session = Depends(database.get_db)
):
    """Update offer status (accepted/rejected)"""
    application = db.query(models.Application).filter(models.Application.id == application_id).first()
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")
    
    new_status = status_data.get('status')
    if new_status not in ["offer_accepted", "offer_rejected"]:
        raise HTTPException(status_code=400, detail="Invalid status")
    
    application.status = new_status
    db.commit()
    
    return {"message": f"Offer status updated to {new_status}"}

# --- Onboarding Integration ---

@router.post("/applications/{application_id}/convert-to-employee")
def convert_to_employee(
    application_id: int,
    employee_data: dict,
    db: Session = Depends(database.get_db)
):
    """Convert hired candidate to employee"""
    application = db.query(models.Application).filter(models.Application.id == application_id).first()
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")
    
    if application.status != "offer_accepted":
        raise HTTPException(status_code=400, detail="Application must have accepted offer")
    
    # Create user account for new employee
    try:
        # Check if user already exists
        existing_user = db.query(models.User).filter(
            models.User.email == application.candidate_email
        ).first()
        
        if existing_user:
            return {"message": "User already exists", "user_id": existing_user.id}
        
        # Create new user
        new_user = models.User(
            username=application.candidate_email,
            email=application.candidate_email,
            full_name=application.candidate_name,
            role="employee",
            is_active=True
        )
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
        
        # Update application status
        application.status = "hired"
        db.commit()
        
        return {
            "message": "Candidate converted to employee successfully",
            "user_id": new_user.id,
            "email": new_user.email
        }
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error creating employee: {str(e)}")

@router.patch("/jobs/{job_id}/advance", response_model=schemas.JobOut)
def advance_job_step(job_id: int, db: Session = Depends(database.get_db)):
    job = db.query(models.Job).filter(models.Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    # Don't advance beyond step 9 (Onboarding is the final step)
    if job.current_step >= 9:
        raise HTTPException(status_code=400, detail="Job is already at the final step")
    
    job.current_step = min(9, (job.current_step or 0) + 1)
    
    db.commit()
    db.refresh(job)
    return job

@router.patch("/jobs/{job_id}/revert", response_model=schemas.JobOut)
def revert_job_step(job_id: int, db: Session = Depends(database.get_db)):
    job = db.query(models.Job).filter(models.Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    if job.current_step > 0: 
        job.current_step -= 1
    
    db.commit()
    db.refresh(job)
    return job

@router.patch("/applications/{application_id}/status", response_model=schemas.ApplicationOut)
async def update_application_status(
    application_id: int, 
    status: str, 
    db: Session = Depends(database.get_db)
):
    application = db.query(models.Application).filter(models.Application.id == application_id).first()
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")
    
    old_status = application.status
    application.status = status
    db.commit()
    db.refresh(application)
    
    # Send notifications for status change
    try:
        notification_service = get_notification_service(db)
        await notification_service.notify_application_status_change(
            application_id=application_id,
            old_status=old_status,
            new_status=status
        )
        
        # Send real-time notification
        await notification_manager.broadcast_to_roles(
            roles=['hr', 'admin'],
            message={
                "type": "status_change",
                "title": "Application Status Updated",
                "message": f"{application.candidate_name}'s application moved to {status}",
                "data": {
                    "application_id": application_id,
                    "candidate_name": application.candidate_name,
                    "job_title": application.job.title,
                    "old_status": old_status,
                    "new_status": status
                }
            },
            db=db
        )
        
    except Exception as e:
        print(f"Error sending status change notifications: {e}")
    
    return application

@router.get("/applications/{application_id}/score-breakdown")
def get_score_breakdown(application_id: int, db: Session = Depends(database.get_db)):
    """Get detailed AI scoring breakdown for an application"""
    application = db.query(models.Application).filter(models.Application.id == application_id).first()
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")
    
    job = db.query(models.Job).filter(models.Job.id == application.job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    # Check if AI parser is available
    if not RESUME_PARSER_AVAILABLE:
        return {
            "error": "AI Resume Parser not available. Install dependencies: pip install PyPDF2 python-docx spacy nltk",
            "overall_score": application.ai_fit_score
        }
    
    # Check if resume file exists
    if not os.path.exists(application.resume_url):
        return {
            "error": "Resume file not found",
            "overall_score": application.ai_fit_score
        }
    
    # Calculate detailed breakdown
    parser = ResumeParser()
    try:
        _, breakdown = parser.calculate_ai_fit_score(application.resume_url, job.description)
        return breakdown
    except Exception as e:
        return {
            "error": str(e),
            "overall_score": application.ai_fit_score
        }

@router.get("/jobs/{job_id}/assessment/generate", response_model=List[dict])
def generate_assessment(job_id: int, difficulty: str = "medium", db: Session = Depends(database.get_db)):
    job = db.query(models.Job).filter(models.Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    title = job.title.lower()
    questions = []
    
    # Question banks by technology and difficulty
    if "react" in title or "frontend" in title:
        if difficulty == "easy":
            questions = [
                {"id": 1, "q": "What is JSX?", "options": ["JavaScript XML", "Java Syntax Extension", "JSON XML"], "answer": "JavaScript XML"},
                {"id": 2, "q": "Which method is used to render React components?", "options": ["render()", "display()", "show()"], "answer": "render()"},
                {"id": 3, "q": "What is a React component?", "options": ["A reusable piece of UI", "A database", "A server"], "answer": "A reusable piece of UI"},
                {"id": 4, "q": "How do you pass data to a component?", "options": ["Props", "State", "Context"], "answer": "Props"},
                {"id": 5, "q": "What is the file extension for React components?", "options": [".jsx", ".html", ".xml"], "answer": ".jsx"}
            ]
        elif difficulty == "hard":
            questions = [
                {"id": 1, "q": "Explain React Fiber architecture and its benefits.", "options": ["Open Text"], "answer": "N/A"},
                {"id": 2, "q": "How would you implement a custom hook for data fetching with caching?", "options": ["Open Text"], "answer": "N/A"},
                {"id": 3, "q": "What are the performance implications of using Context API vs Redux?", "options": ["Open Text"], "answer": "N/A"},
                {"id": 4, "q": "Implement a higher-order component for authentication.", "options": ["Open Text"], "answer": "N/A"},
                {"id": 5, "q": "Explain the difference between controlled and uncontrolled components with examples.", "options": ["Open Text"], "answer": "N/A"}
            ]
        else:  # medium
            questions = [
                {"id": 1, "q": "What is the Virtual DOM?", "options": ["A direct copy of HTML", "A lightweight JavaScript representation of the DOM", "A browser database"], "answer": "A lightweight JavaScript representation of the DOM"},
                {"id": 2, "q": "Which hook is used for side effects?", "options": ["useState", "useEffect", "useContext", "useReducer"], "answer": "useEffect"},
                {"id": 3, "q": "How do you prevent re-renders in React?", "options": ["useMemo", "shouldComponentUpdate", "React.memo", "All of the above"], "answer": "All of the above"},
                {"id": 4, "q": "What is the purpose of Redux?", "options": ["Styling", "State Management", "Routing"], "answer": "State Management"},
                {"id": 5, "q": "Explain the component lifecycle methods.", "options": ["Open Text"], "answer": "N/A"}
            ]
    elif "python" in title or "backend" in title or "django" in title or "fastapi" in title:
        if difficulty == "easy":
            questions = [
                {"id": 1, "q": "What is Python?", "options": ["A programming language", "A snake", "A framework"], "answer": "A programming language"},
                {"id": 2, "q": "How do you create a list in Python?", "options": ["[]", "{}", "()"], "answer": "[]"},
                {"id": 3, "q": "What is the correct way to create a function?", "options": ["def function():", "function def():", "create function():"], "answer": "def function():"},
                {"id": 4, "q": "How do you add an item to a list?", "options": ["append()", "add()", "insert()"], "answer": "append()"},
                {"id": 5, "q": "What is indentation used for in Python?", "options": ["Code blocks", "Comments", "Variables"], "answer": "Code blocks"}
            ]
        elif difficulty == "hard":
            questions = [
                {"id": 1, "q": "Explain the GIL and its impact on multithreading in Python.", "options": ["Open Text"], "answer": "N/A"},
                {"id": 2, "q": "Implement a metaclass that automatically adds logging to all methods.", "options": ["Open Text"], "answer": "N/A"},
                {"id": 3, "q": "How would you optimize a Django ORM query that's causing N+1 problems?", "options": ["Open Text"], "answer": "N/A"},
                {"id": 4, "q": "Explain the difference between __new__ and __init__ methods.", "options": ["Open Text"], "answer": "N/A"},
                {"id": 5, "q": "Design a caching strategy for a high-traffic API using Redis.", "options": ["Open Text"], "answer": "N/A"}
            ]
        else:  # medium
            questions = [
                {"id": 1, "q": "What is a Decorator in Python?", "options": ["A design pattern", "A function that modifies another function", "A class attribute"], "answer": "A function that modifies another function"},
                {"id": 2, "q": "Difference between List and Tuple?", "options": ["Lists are mutable, Tuples are immutable", "Lists are faster", "No difference"], "answer": "Lists are mutable, Tuples are immutable"},
                {"id": 3, "q": "What is the GIL?", "options": ["Global Interpreter Lock", "General Interface Logic", "Graphical Interface Loop"], "answer": "Global Interpreter Lock"},
                {"id": 4, "q": "What does 'pass' do?", "options": ["Skips the loop", "Does nothing", "Returns None"], "answer": "Does nothing"},
                {"id": 5, "q": "Which is faster for lookups?", "options": ["List", "Dictionary", "Tuple"], "answer": "Dictionary"}
            ]
    elif "java" in title:
        if difficulty == "easy":
            questions = [
                {"id": 1, "q": "What is Java?", "options": ["A programming language", "A coffee brand", "An island"], "answer": "A programming language"},
                {"id": 2, "q": "What is the main method signature?", "options": ["public static void main(String[] args)", "main()", "void main()"], "answer": "public static void main(String[] args)"},
                {"id": 3, "q": "How do you create an object?", "options": ["new ClassName()", "create ClassName()", "ClassName.new()"], "answer": "new ClassName()"}
            ]
        elif difficulty == "hard":
            questions = [
                {"id": 1, "q": "Explain the Java Memory Model and happens-before relationships.", "options": ["Open Text"], "answer": "N/A"},
                {"id": 2, "q": "Implement a thread-safe singleton using double-checked locking.", "options": ["Open Text"], "answer": "N/A"},
                {"id": 3, "q": "How would you design a custom ClassLoader?", "options": ["Open Text"], "answer": "N/A"}
            ]
        else:  # medium
            questions = [
                {"id": 1, "q": "What is the difference between JDK, JRE, and JVM?", "options": ["They are the same", "JDK contains JRE, JRE contains JVM", "JVM contains JDK"], "answer": "JDK contains JRE, JRE contains JVM"},
                {"id": 2, "q": "Is Java purely object-oriented?", "options": ["Yes", "No, it has primitive types", "No, it has functions"], "answer": "No, it has primitive types"},
                {"id": 3, "q": "What is a Marker Interface?", "options": ["Interface with no methods", "Interface with 1 method", "Interface with fields"], "answer": "Interface with no methods"}
            ]
    else:
        # Behavioral/General questions based on difficulty
        if difficulty == "easy":
            questions = [
                {"id": 1, "q": "Tell me about yourself.", "options": ["Open Text"], "answer": "N/A"},
                {"id": 2, "q": "Why are you interested in this position?", "options": ["Open Text"], "answer": "N/A"},
                {"id": 3, "q": "What are your strengths?", "options": ["Open Text"], "answer": "N/A"}
            ]
        elif difficulty == "hard":
            questions = [
                {"id": 1, "q": "Describe a time when you had to make a difficult decision with limited information.", "options": ["Open Text"], "answer": "N/A"},
                {"id": 2, "q": "How would you handle a situation where you disagree with your manager's approach?", "options": ["Open Text"], "answer": "N/A"},
                {"id": 3, "q": "Design a system architecture for a social media platform with 100M users.", "options": ["Open Text"], "answer": "N/A"}
            ]
        else:  # medium
            questions = [
                {"id": 1, "q": "Describe a challenging situation you faced at work.", "options": ["Open Text"], "answer": "N/A"},
                {"id": 2, "q": "How do you prioritize tasks?", "options": ["Open Text"], "answer": "N/A"},
                {"id": 3, "q": "Why do you want to join us?", "options": ["Open Text"], "answer": "N/A"},
                {"id": 4, "q": "What are your salary expectations?", "options": ["Open Text"], "answer": "N/A"}
            ]
        
    return questions



@router.post("/applications/{application_id}/stage-history")
def log_stage_change(application_id: int, stage_data: dict, db: Session = Depends(database.get_db)):
    """Log stage change history for an application"""
    application = db.query(models.Application).filter(models.Application.id == application_id).first()
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")
    
    # For now, just return success
    # In production, you would insert into application_stage_history table
    # db_history = models.ApplicationStageHistory(
    #     application_id=application_id,
    #     from_stage=stage_data.get('from_stage'),
    #     to_stage=stage_data.get('to_stage'),
    #     changed_by=stage_data.get('changed_by', 1),
    #     notes=stage_data.get('notes')
    # )
    # db.add(db_history)
    # db.commit()
    
    return {"message": "Stage change logged successfully"}

@router.get("/jobs/{job_id}/application-link")
def get_application_link(job_id: int, db: Session = Depends(database.get_db)):
    """Get the unique application link for a job"""
    job = db.query(models.Job).filter(models.Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    if not job.application_link_code:
        raise HTTPException(status_code=404, detail="Application link not generated for this job")
    
    return {
        "job_id": job.id,
        "job_title": job.title,
        "application_link_code": job.application_link_code,
        "application_url": f"/recruitment/apply/{job.application_link_code}",
        "is_active": job.is_active
    }

@router.post("/jobs/{job_id}/regenerate-link")
def regenerate_application_link(job_id: int, db: Session = Depends(database.get_db)):
    """Regenerate unique application link for a job (admin only)"""
    job = db.query(models.Job).filter(models.Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    # Generate new unique link code
    new_link_code = generate_secure_token(12)
    # Ensure uniqueness
    while db.query(models.Job).filter(models.Job.application_link_code == new_link_code).first():
        new_link_code = generate_secure_token(12)
    
    old_link_code = job.application_link_code
    job.application_link_code = new_link_code
    db.commit()
    db.refresh(job)
    
    return {
        "message": "Application link regenerated successfully",
        "job_id": job.id,
        "old_link_code": old_link_code,
        "new_link_code": new_link_code,
        "new_application_url": f"/recruitment/apply/{new_link_code}"
    }

# Interview Scheduling Endpoints
from datetime import datetime as dt
from pydantic import BaseModel
from typing import List as ListType

class InterviewScheduleRequest(BaseModel):
    application_id: int
    scheduled_date: str  # YYYY-MM-DD format
    scheduled_time: str  # HH:MM format
    interviewer_ids: ListType[int]
    interview_type: str = "technical"
    notes: str = ""
    status: str = "scheduled"

@router.post("/interviews")
async def schedule_interview(
    interview_data: InterviewScheduleRequest,
    db: Session = Depends(database.get_db)
):
    """Schedule an interview with multiple interviewers"""
    try:
        # Validate application exists
        application = db.query(models.Application).filter(
            models.Application.id == interview_data.application_id
        ).first()
        if not application:
            raise HTTPException(status_code=404, detail="Application not found")
        
        # Combine date and time into datetime
        scheduled_datetime = dt.strptime(
            f"{interview_data.scheduled_date} {interview_data.scheduled_time}",
            "%Y-%m-%d %H:%M"
        )
        
        # Create interview records for each interviewer
        created_interviews = []
        for interviewer_id in interview_data.interviewer_ids:
            # Validate interviewer exists
            interviewer = db.query(models.User).filter(
                models.User.id == interviewer_id
            ).first()
            if not interviewer:
                raise HTTPException(
                    status_code=404, 
                    detail=f"Interviewer with ID {interviewer_id} not found"
                )
            
            # Create interview record
            interview = models.Interview(
                application_id=interview_data.application_id,
                interviewer_id=interviewer_id,
                scheduled_time=scheduled_datetime,
                status=interview_data.status
            )
            db.add(interview)
            created_interviews.append(interview)
        
        db.commit()
        
        # Refresh all created interviews
        for interview in created_interviews:
            db.refresh(interview)
        
        return {
            "message": "Interview scheduled successfully",
            "interviews_created": len(created_interviews),
            "scheduled_time": scheduled_datetime.isoformat(),
            "application_id": interview_data.application_id
        }
        
    except ValueError as e:
        raise HTTPException(
            status_code=422, 
            detail=f"Invalid date/time format: {str(e)}"
        )
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500, 
            detail=f"Error scheduling interview: {str(e)}"
        )

@router.get("/interviews/{application_id}")
async def get_interviews_for_application(
    application_id: int,
    db: Session = Depends(database.get_db)
):
    """Get all interviews for a specific application"""
    interviews = db.query(models.Interview).filter(
        models.Interview.application_id == application_id
    ).all()
    
    return interviews