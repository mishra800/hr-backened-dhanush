"""
Agency/Vendor Portal Router
"""
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from datetime import datetime
from app import database, models
from pydantic import BaseModel

router = APIRouter(
    prefix="/agency",
    tags=["agency-portal"]
)

# ============================================
# SCHEMAS
# ============================================

class AgencyCreate(BaseModel):
    name: str
    contact_person: str
    email: str
    phone: str
    commission_percentage: float = 10.0

class AgencyUpdate(BaseModel):
    name: Optional[str] = None
    contact_person: Optional[str] = None
    phone: Optional[str] = None
    commission_percentage: Optional[float] = None
    is_active: Optional[bool] = None

class AgencySubmissionCreate(BaseModel):
    job_id: int
    candidate_name: str
    candidate_email: str
    phone: Optional[str] = None
    resume_url: str
    years_of_experience: Optional[int] = None
    current_company: Optional[str] = None
    expected_salary: Optional[float] = None
    notice_period_days: Optional[int] = None

# ============================================
# AGENCY MANAGEMENT (Admin/HR)
# ============================================

@router.post("/")
async def create_agency(
    data: AgencyCreate,
    db: Session = Depends(database.get_db)
):
    """Create new agency"""
    
    # Check if email already exists
    existing = db.query(models.Agency).filter(models.Agency.email == data.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Agency with this email already exists")
    
    agency = models.Agency(
        name=data.name,
        contact_person=data.contact_person,
        email=data.email,
        phone=data.phone,
        commission_percentage=data.commission_percentage
    )
    
    db.add(agency)
    db.commit()
    db.refresh(agency)
    
    # TODO: Create agency user account with role='agency'
    
    return {"message": "Agency created successfully", "id": agency.id}

@router.get("/")
async def get_agencies(
    is_active: Optional[bool] = None,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(database.get_db)
):
    """Get all agencies"""
    
    query = db.query(models.Agency)
    
    if is_active is not None:
        query = query.filter(models.Agency.is_active == is_active)
    
    total = query.count()
    agencies = query.offset(skip).limit(limit).all()
    
    return {
        "total": total,
        "agencies": agencies
    }

@router.get("/{agency_id}")
async def get_agency_detail(
    agency_id: int,
    db: Session = Depends(database.get_db)
):
    """Get agency details with performance metrics"""
    
    agency = db.query(models.Agency).filter(models.Agency.id == agency_id).first()
    if not agency:
        raise HTTPException(status_code=404, detail="Agency not found")
    
    # Get submissions
    submissions = db.query(models.AgencySubmission).filter(
        models.AgencySubmission.agency_id == agency_id
    ).all()
    
    # Calculate metrics
    total_submissions = len(submissions)
    total_hires = sum(1 for s in submissions if s.application and s.application.status == 'hired')
    total_commission_paid = sum(s.commission_amount for s in submissions if s.commission_paid)
    pending_commission = sum(s.commission_amount for s in submissions if not s.commission_paid and s.application and s.application.status == 'hired')
    
    return {
        "agency": agency,
        "metrics": {
            "total_submissions": total_submissions,
            "total_hires": total_hires,
            "conversion_rate": round((total_hires / total_submissions * 100), 2) if total_submissions > 0 else 0,
            "total_commission_paid": total_commission_paid,
            "pending_commission": pending_commission
        }
    }

@router.patch("/{agency_id}")
async def update_agency(
    agency_id: int,
    data: AgencyUpdate,
    db: Session = Depends(database.get_db)
):
    """Update agency details"""
    
    agency = db.query(models.Agency).filter(models.Agency.id == agency_id).first()
    if not agency:
        raise HTTPException(status_code=404, detail="Agency not found")
    
    if data.name is not None:
        agency.name = data.name
    if data.contact_person is not None:
        agency.contact_person = data.contact_person
    if data.phone is not None:
        agency.phone = data.phone
    if data.commission_percentage is not None:
        agency.commission_percentage = data.commission_percentage
    if data.is_active is not None:
        agency.is_active = data.is_active
    
    agency.updated_at = datetime.utcnow()
    db.commit()
    
    return {"message": "Agency updated successfully"}

@router.delete("/{agency_id}")
async def delete_agency(
    agency_id: int,
    db: Session = Depends(database.get_db)
):
    """Delete agency"""
    
    agency = db.query(models.Agency).filter(models.Agency.id == agency_id).first()
    if not agency:
        raise HTTPException(status_code=404, detail="Agency not found")
    
    db.delete(agency)
    db.commit()
    
    return {"message": "Agency deleted successfully"}

# ============================================
# AGENCY SUBMISSIONS (Agency User)
# ============================================

@router.post("/submit-candidate")
async def submit_candidate(
    data: AgencySubmissionCreate,
    agency_id: int = 1,  # TODO: Get from auth token
    db: Session = Depends(database.get_db)
):
    """Agency submits a candidate for a job"""
    
    # Verify agency exists and is active
    agency = db.query(models.Agency).filter(
        models.Agency.id == agency_id,
        models.Agency.is_active == True
    ).first()
    
    if not agency:
        raise HTTPException(status_code=403, detail="Agency not found or inactive")
    
    # Verify job exists and is active
    job = db.query(models.Job).filter(
        models.Job.id == data.job_id,
        models.Job.is_active == True
    ).first()
    
    if not job:
        raise HTTPException(status_code=404, detail="Job not found or inactive")
    
    # Check if candidate already applied
    existing_app = db.query(models.Application).filter(
        models.Application.job_id == data.job_id,
        models.Application.candidate_email == data.candidate_email
    ).first()
    
    if existing_app:
        raise HTTPException(status_code=400, detail="Candidate already applied for this job")
    
    # Create application
    application = models.Application(
        job_id=data.job_id,
        candidate_name=data.candidate_name,
        candidate_email=data.candidate_email,
        phone=data.phone,
        resume_url=data.resume_url,
        years_of_experience=data.years_of_experience,
        current_company=data.current_company,
        expected_salary=data.expected_salary,
        notice_period_days=data.notice_period_days,
        source="agency",
        status="applied"
    )
    
    db.add(application)
    db.flush()  # Get application ID
    
    # Calculate commission
    commission_amount = 0
    if job.salary_range_min:
        commission_amount = job.salary_range_min * (agency.commission_percentage / 100)
    
    # Create agency submission record
    submission = models.AgencySubmission(
        agency_id=agency_id,
        application_id=application.id,
        job_id=data.job_id,
        commission_amount=commission_amount
    )
    
    db.add(submission)
    db.commit()
    db.refresh(application)
    
    return {
        "message": "Candidate submitted successfully",
        "application_id": application.id,
        "potential_commission": commission_amount
    }

@router.get("/my-submissions")
async def get_agency_submissions(
    agency_id: int = 1,  # TODO: Get from auth token
    job_id: Optional[int] = None,
    status: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(database.get_db)
):
    """Get submissions by agency"""
    
    query = db.query(models.AgencySubmission).filter(
        models.AgencySubmission.agency_id == agency_id
    )
    
    if job_id:
        query = query.filter(models.AgencySubmission.job_id == job_id)
    
    if status:
        query = query.join(models.Application).filter(models.Application.status == status)
    
    total = query.count()
    submissions = query.order_by(models.AgencySubmission.submitted_date.desc()).offset(skip).limit(limit).all()
    
    # Enrich with application data
    result = []
    for sub in submissions:
        app = sub.application
        result.append({
            "submission_id": sub.id,
            "job_title": sub.job.title if sub.job else "N/A",
            "candidate_name": app.candidate_name if app else "N/A",
            "candidate_email": app.candidate_email if app else "N/A",
            "status": app.status if app else "unknown",
            "submitted_date": sub.submitted_date,
            "commission_amount": sub.commission_amount,
            "commission_paid": sub.commission_paid
        })
    
    return {
        "total": total,
        "submissions": result
    }

@router.get("/available-jobs")
async def get_available_jobs_for_agency(
    agency_id: int = 1,  # TODO: Get from auth token
    db: Session = Depends(database.get_db)
):
    """Get active jobs available for agency submissions"""
    
    # Verify agency is active
    agency = db.query(models.Agency).filter(
        models.Agency.id == agency_id,
        models.Agency.is_active == True
    ).first()
    
    if not agency:
        raise HTTPException(status_code=403, detail="Agency not found or inactive")
    
    # Get active jobs
    jobs = db.query(models.Job).filter(
        models.Job.is_active == True,
        models.Job.requisition_status == "published"
    ).all()
    
    result = []
    for job in jobs:
        # Calculate potential commission
        potential_commission = 0
        if job.salary_range_min:
            potential_commission = job.salary_range_min * (agency.commission_percentage / 100)
        
        result.append({
            "job_id": job.id,
            "title": job.title,
            "department": job.department,
            "location": job.location,
            "posted_date": job.posted_date,
            "required_skills": job.required_skills,
            "min_experience_years": job.min_experience_years,
            "salary_range": f"{job.salary_range_min} - {job.salary_range_max}" if job.salary_range_min else "Not disclosed",
            "potential_commission": potential_commission
        })
    
    return {
        "total": len(result),
        "jobs": result
    }

# ============================================
# COMMISSION MANAGEMENT (Admin/HR)
# ============================================

@router.get("/commissions/pending")
async def get_pending_commissions(
    agency_id: Optional[int] = None,
    db: Session = Depends(database.get_db)
):
    """Get pending commission payments"""
    
    query = db.query(models.AgencySubmission).filter(
        models.AgencySubmission.commission_paid == False
    ).join(models.Application).filter(
        models.Application.status == 'hired'
    )
    
    if agency_id:
        query = query.filter(models.AgencySubmission.agency_id == agency_id)
    
    pending = query.all()
    
    result = []
    for sub in pending:
        result.append({
            "submission_id": sub.id,
            "agency_name": sub.agency.name,
            "candidate_name": sub.application.candidate_name,
            "job_title": sub.job.title,
            "commission_amount": sub.commission_amount,
            "submitted_date": sub.submitted_date
        })
    
    total_pending = sum(s["commission_amount"] for s in result if s["commission_amount"])
    
    return {
        "total_pending_amount": total_pending,
        "count": len(result),
        "commissions": result
    }

@router.post("/commissions/{submission_id}/pay")
async def mark_commission_paid(
    submission_id: int,
    db: Session = Depends(database.get_db)
):
    """Mark commission as paid"""
    
    submission = db.query(models.AgencySubmission).filter(
        models.AgencySubmission.id == submission_id
    ).first()
    
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found")
    
    if submission.commission_paid:
        raise HTTPException(status_code=400, detail="Commission already paid")
    
    submission.commission_paid = True
    submission.payment_date = datetime.utcnow()
    db.commit()
    
    return {"message": "Commission marked as paid"}

# ============================================
# ANALYTICS
# ============================================

@router.get("/analytics/performance")
async def get_agency_performance_analytics(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    db: Session = Depends(database.get_db)
):
    """Get agency performance analytics"""
    
    query = db.query(models.AgencySubmission)
    
    if start_date:
        query = query.filter(models.AgencySubmission.submitted_date >= start_date)
    if end_date:
        query = query.filter(models.AgencySubmission.submitted_date <= end_date)
    
    submissions = query.all()
    
    # Group by agency
    agency_stats = {}
    for sub in submissions:
        agency_id = sub.agency_id
        if agency_id not in agency_stats:
            agency_stats[agency_id] = {
                "agency_name": sub.agency.name,
                "total_submissions": 0,
                "total_hires": 0,
                "total_commission": 0,
                "paid_commission": 0
            }
        
        agency_stats[agency_id]["total_submissions"] += 1
        
        if sub.application and sub.application.status == 'hired':
            agency_stats[agency_id]["total_hires"] += 1
            agency_stats[agency_id]["total_commission"] += sub.commission_amount or 0
            
            if sub.commission_paid:
                agency_stats[agency_id]["paid_commission"] += sub.commission_amount or 0
    
    # Calculate conversion rates
    result = []
    for agency_id, stats in agency_stats.items():
        stats["conversion_rate"] = round(
            (stats["total_hires"] / stats["total_submissions"] * 100), 2
        ) if stats["total_submissions"] > 0 else 0
        
        stats["pending_commission"] = stats["total_commission"] - stats["paid_commission"]
        result.append(stats)
    
    # Sort by conversion rate
    result.sort(key=lambda x: x["conversion_rate"], reverse=True)
    
    return {
        "agencies": result,
        "summary": {
            "total_agencies": len(result),
            "total_submissions": sum(a["total_submissions"] for a in result),
            "total_hires": sum(a["total_hires"] for a in result),
            "total_commission_paid": sum(a["paid_commission"] for a in result),
            "total_pending_commission": sum(a["pending_commission"] for a in result)
        }
    }
