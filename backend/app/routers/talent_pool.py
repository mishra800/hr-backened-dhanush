"""
Talent Pool (TRM - Talent Relationship Management) Router
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_, func
from typing import List, Optional
from datetime import datetime, timedelta
from app import database, models
from pydantic import BaseModel

router = APIRouter(
    prefix="/talent-pool",
    tags=["talent-pool"]
)

# ============================================
# SCHEMAS
# ============================================

class TalentPoolCreate(BaseModel):
    candidate_name: str
    candidate_email: str
    phone: Optional[str] = None
    resume_url: Optional[str] = None
    skills: List[str] = []
    experience_years: Optional[int] = None
    tags: List[str] = []
    source: str = "manual"
    original_application_id: Optional[int] = None
    notes: Optional[str] = None

class TalentPoolUpdate(BaseModel):
    tags: Optional[List[str]] = None
    status: Optional[str] = None
    notes: Optional[str] = None
    last_contacted: Optional[datetime] = None

class TalentPoolSearch(BaseModel):
    skills: Optional[List[str]] = None
    min_experience: Optional[int] = None
    max_experience: Optional[int] = None
    tags: Optional[List[str]] = None
    status: Optional[str] = "active"

# ============================================
# ENDPOINTS
# ============================================

@router.post("/")
async def add_to_talent_pool(
    data: TalentPoolCreate,
    current_user_id: int = 1,  # TODO: Get from auth
    db: Session = Depends(database.get_db)
):
    """Add candidate to talent pool"""
    
    # Check if candidate already exists
    existing = db.query(models.TalentPool).filter(
        models.TalentPool.candidate_email == data.candidate_email
    ).first()
    
    if existing:
        raise HTTPException(status_code=400, detail="Candidate already in talent pool")
    
    talent = models.TalentPool(
        candidate_name=data.candidate_name,
        candidate_email=data.candidate_email,
        phone=data.phone,
        resume_url=data.resume_url,
        skills=data.skills,
        experience_years=data.experience_years,
        tags=data.tags,
        source=data.source,
        original_application_id=data.original_application_id,
        notes=data.notes,
        created_by=current_user_id
    )
    
    db.add(talent)
    db.commit()
    db.refresh(talent)
    
    return {"message": "Candidate added to talent pool", "id": talent.id}

@router.post("/from-application/{application_id}")
async def move_application_to_talent_pool(
    application_id: int,
    tags: List[str] = [],
    notes: Optional[str] = None,
    current_user_id: int = 1,
    db: Session = Depends(database.get_db)
):
    """Move rejected application to talent pool"""
    
    app = db.query(models.Application).filter(models.Application.id == application_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")
    
    # Check if already in pool
    existing = db.query(models.TalentPool).filter(
        models.TalentPool.candidate_email == app.candidate_email
    ).first()
    
    if existing:
        # Update existing entry
        existing.tags = list(set(existing.tags + tags))
        existing.notes = f"{existing.notes}\n\n{notes}" if existing.notes else notes
        existing.updated_at = datetime.utcnow()
        db.commit()
        return {"message": "Talent pool entry updated", "id": existing.id}
    
    # Create new entry
    talent = models.TalentPool(
        candidate_name=app.candidate_name,
        candidate_email=app.candidate_email,
        phone=app.phone,
        resume_url=app.resume_url,
        skills=app.skills or [],
        experience_years=app.years_of_experience,
        tags=tags,
        source="rejected_application",
        original_application_id=app.id,
        ai_fit_score=app.ai_fit_score,
        notes=notes,
        created_by=current_user_id
    )
    
    db.add(talent)
    db.commit()
    db.refresh(talent)
    
    return {"message": "Candidate moved to talent pool", "id": talent.id}

@router.get("/")
async def get_talent_pool(
    status: Optional[str] = "active",
    tags: Optional[str] = None,  # Comma-separated
    skills: Optional[str] = None,  # Comma-separated
    min_experience: Optional[int] = None,
    search: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(database.get_db)
):
    """Get talent pool candidates with filters"""
    
    query = db.query(models.TalentPool)
    
    if status:
        query = query.filter(models.TalentPool.status == status)
    
    if tags:
        tag_list = tags.split(",")
        for tag in tag_list:
            query = query.filter(models.TalentPool.tags.contains([tag]))
    
    if skills:
        skill_list = skills.split(",")
        for skill in skill_list:
            query = query.filter(models.TalentPool.skills.contains([skill]))
    
    if min_experience:
        query = query.filter(models.TalentPool.experience_years >= min_experience)
    
    if search:
        query = query.filter(
            or_(
                models.TalentPool.candidate_name.ilike(f"%{search}%"),
                models.TalentPool.candidate_email.ilike(f"%{search}%")
            )
        )
    
    total = query.count()
    candidates = query.order_by(models.TalentPool.added_date.desc()).offset(skip).limit(limit).all()
    
    return {
        "total": total,
        "candidates": candidates
    }

@router.post("/search")
async def search_talent_pool(
    search_data: TalentPoolSearch,
    db: Session = Depends(database.get_db)
):
    """Advanced search in talent pool for job matching"""
    
    query = db.query(models.TalentPool)
    
    if search_data.status:
        query = query.filter(models.TalentPool.status == search_data.status)
    
    if search_data.skills:
        for skill in search_data.skills:
            query = query.filter(models.TalentPool.skills.contains([skill]))
    
    if search_data.min_experience:
        query = query.filter(models.TalentPool.experience_years >= search_data.min_experience)
    
    if search_data.max_experience:
        query = query.filter(models.TalentPool.experience_years <= search_data.max_experience)
    
    if search_data.tags:
        for tag in search_data.tags:
            query = query.filter(models.TalentPool.tags.contains([tag]))
    
    candidates = query.order_by(models.TalentPool.ai_fit_score.desc()).all()
    
    return {
        "total": len(candidates),
        "matches": candidates
    }

@router.get("/{talent_id}")
async def get_talent_detail(
    talent_id: int,
    db: Session = Depends(database.get_db)
):
    """Get detailed talent profile"""
    
    talent = db.query(models.TalentPool).filter(models.TalentPool.id == talent_id).first()
    if not talent:
        raise HTTPException(status_code=404, detail="Talent not found")
    
    return talent

@router.patch("/{talent_id}")
async def update_talent(
    talent_id: int,
    data: TalentPoolUpdate,
    db: Session = Depends(database.get_db)
):
    """Update talent pool entry"""
    
    talent = db.query(models.TalentPool).filter(models.TalentPool.id == talent_id).first()
    if not talent:
        raise HTTPException(status_code=404, detail="Talent not found")
    
    if data.tags is not None:
        talent.tags = data.tags
    if data.status is not None:
        talent.status = data.status
    if data.notes is not None:
        talent.notes = data.notes
    if data.last_contacted is not None:
        talent.last_contacted = data.last_contacted
    
    talent.updated_at = datetime.utcnow()
    db.commit()
    
    return {"message": "Talent updated successfully"}

@router.delete("/{talent_id}")
async def remove_from_talent_pool(
    talent_id: int,
    db: Session = Depends(database.get_db)
):
    """Remove candidate from talent pool"""
    
    talent = db.query(models.TalentPool).filter(models.TalentPool.id == talent_id).first()
    if not talent:
        raise HTTPException(status_code=404, detail="Talent not found")
    
    db.delete(talent)
    db.commit()
    
    return {"message": "Candidate removed from talent pool"}

@router.get("/stats/overview")
async def get_talent_pool_stats(
    db: Session = Depends(database.get_db)
):
    """Get talent pool statistics"""
    
    total = db.query(models.TalentPool).count()
    active = db.query(models.TalentPool).filter(models.TalentPool.status == "active").count()
    contacted = db.query(models.TalentPool).filter(models.TalentPool.status == "contacted").count()
    
    # Aging analysis
    six_months_ago = datetime.utcnow() - timedelta(days=180)
    aging = db.query(models.TalentPool).filter(
        models.TalentPool.added_date < six_months_ago,
        models.TalentPool.status == "active"
    ).count()
    
    # Top skills
    all_talents = db.query(models.TalentPool).all()
    skill_count = {}
    for talent in all_talents:
        for skill in (talent.skills or []):
            skill_count[skill] = skill_count.get(skill, 0) + 1
    
    top_skills = sorted(skill_count.items(), key=lambda x: x[1], reverse=True)[:10]
    
    return {
        "total": total,
        "active": active,
        "contacted": contacted,
        "aging_candidates": aging,
        "top_skills": [{"skill": s[0], "count": s[1]} for s in top_skills]
    }

@router.post("/match-job/{job_id}")
async def match_job_with_talent_pool(
    job_id: int,
    min_score: float = 50.0,
    db: Session = Depends(database.get_db)
):
    """Find matching candidates from talent pool for a job"""
    
    job = db.query(models.Job).filter(models.Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    # Get active candidates
    candidates = db.query(models.TalentPool).filter(
        models.TalentPool.status == "active"
    ).all()
    
    # Simple matching logic (can be enhanced with AI)
    matches = []
    required_skills = job.required_skills or []
    
    for candidate in candidates:
        candidate_skills = candidate.skills or []
        
        # Calculate skill match percentage
        if required_skills:
            matching_skills = set(required_skills) & set(candidate_skills)
            match_percentage = (len(matching_skills) / len(required_skills)) * 100
        else:
            match_percentage = 50.0  # Default if no required skills
        
        # Experience match
        if job.min_experience_years and candidate.experience_years:
            if candidate.experience_years >= job.min_experience_years:
                match_percentage += 20
        
        if match_percentage >= min_score:
            matches.append({
                "candidate": candidate,
                "match_score": round(match_percentage, 2),
                "matching_skills": list(set(required_skills) & set(candidate_skills))
            })
    
    # Sort by match score
    matches.sort(key=lambda x: x["match_score"], reverse=True)
    
    return {
        "job_id": job_id,
        "job_title": job.title,
        "total_matches": len(matches),
        "matches": matches[:20]  # Top 20 matches
    }
