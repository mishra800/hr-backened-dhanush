"""
Enhanced Recruitment Router with advanced features
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from typing import List, Optional
from datetime import datetime, timedelta
from app import database, models
from app.email_service import email_service
import json

router = APIRouter(
    prefix="/recruitment-enhanced",
    tags=["recruitment-enhanced"]
)

# ============================================
# APPLICATION MANAGEMENT
# ============================================

@router.get("/applications/{application_id}/comments")
async def get_application_comments(
    application_id: int,
    db: Session = Depends(database.get_db)
):
    """Get all comments for an application"""
    # Check if application exists
    app = db.query(models.Application).filter(models.Application.id == application_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")
    
    # For now, return mock data since table might not exist yet
    # In production, query from application_comments table
    return []

@router.post("/applications/{application_id}/comments")
async def add_application_comment(
    application_id: int,
    comment_data: dict,
    db: Session = Depends(database.get_db)
):
    """Add a comment to an application"""
    app = db.query(models.Application).filter(models.Application.id == application_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")
    
    # TODO: Insert into application_comments table
    # For now, just return success
    return {"message": "Comment added successfully"}

@router.get("/applications/{application_id}/history")
async def get_application_history(
    application_id: int,
    db: Session = Depends(database.get_db)
):
    """Get stage change history for an application"""
    app = db.query(models.Application).filter(models.Application.id == application_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")
    
    # TODO: Query from application_stage_history table
    # For now, return mock data
    return [
        {
            "id": 1,
            "from_stage": "applied",
            "to_stage": "screening",
            "changed_by": 1,
            "notes": "Initial screening passed",
            "created_at": datetime.utcnow().isoformat()
        }
    ]

@router.post("/applications/{application_id}/tags")
async def update_application_tags(
    application_id: int,
    tag_data: dict,
    db: Session = Depends(database.get_db)
):
    """Update tags for an application"""
    app = db.query(models.Application).filter(models.Application.id == application_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")
    
    # Update tags
    app.tags = json.dumps(tag_data.get("tags", []))
    db.commit()
    
    return {"message": "Tags updated successfully"}

@router.post("/applications/{application_id}/star")
async def toggle_application_star(
    application_id: int,
    db: Session = Depends(database.get_db)
):
    """Star/unstar an application"""
    app = db.query(models.Application).filter(models.Application.id == application_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")
    
    # Toggle star
    app.is_starred = not (app.is_starred or False)
    db.commit()
    
    return {"is_starred": app.is_starred}

@router.post("/applications/bulk-action")
async def bulk_action_applications(
    action_data: dict,
    db: Session = Depends(database.get_db)
):
    """Perform bulk action on multiple applications"""
    application_ids = action_data.get("application_ids", [])
    action = action_data.get("action")  # shortlist, reject, email
    
    if not application_ids:
        raise HTTPException(status_code=400, detail="No applications selected")
    
    applications = db.query(models.Application).filter(
        models.Application.id.in_(application_ids)
    ).all()
    
    if action == "shortlist":
        for app in applications:
            app.status = "interview"
        db.commit()
        return {"message": f"{len(applications)} applications shortlisted"}
    
    elif action == "reject":
        for app in applications:
            app.status = "rejected"
        db.commit()
        return {"message": f"{len(applications)} applications rejected"}
    
    elif action == "email":
        # TODO: Send bulk email
        return {"message": "Email feature coming soon"}
    
    else:
        raise HTTPException(status_code=400, detail="Invalid action")

# ============================================
# ANALYTICS & METRICS
# ============================================

@router.get("/metrics/pipeline")
async def get_pipeline_metrics(
    job_id: Optional[int] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    db: Session = Depends(database.get_db)
):
    """Get pipeline metrics"""
    query = db.query(models.Application)
    
    if job_id:
        query = query.filter(models.Application.job_id == job_id)
    
    if start_date:
        query = query.filter(models.Application.applied_date >= start_date)
    
    if end_date:
        query = query.filter(models.Application.applied_date <= end_date)
    
    applications = query.all()
    
    # Calculate metrics
    total = len(applications)
    by_status = {}
    for app in applications:
        status = app.status or 'applied'
        by_status[status] = by_status.get(status, 0) + 1
    
    # Calculate conversion rates
    conversion_rates = {}
    if total > 0:
        for status, count in by_status.items():
            conversion_rates[status] = round((count / total) * 100, 2)
    
    return {
        "total_applications": total,
        "by_status": by_status,
        "conversion_rates": conversion_rates,
        "avg_score": round(sum(app.ai_fit_score or 0 for app in applications) / total, 2) if total > 0 else 0
    }

@router.get("/metrics/time-to-hire")
async def get_time_to_hire_metrics(
    job_id: Optional[int] = None,
    db: Session = Depends(database.get_db)
):
    """Calculate time-to-hire metrics"""
    query = db.query(models.Application).filter(
        models.Application.status == 'hired'
    )
    
    if job_id:
        query = query.filter(models.Application.job_id == job_id)
    
    hired_applications = query.all()
    
    if not hired_applications:
        return {
            "avg_time_to_hire_days": 0,
            "min_time_to_hire_days": 0,
            "max_time_to_hire_days": 0,
            "total_hires": 0
        }
    
    # Calculate time differences
    times = []
    for app in hired_applications:
        # Assuming stage_changed_at is when they were hired
        if hasattr(app, 'stage_changed_at') and app.stage_changed_at:
            days = (app.stage_changed_at - app.applied_date).days
            times.append(days)
    
    if not times:
        # Fallback calculation
        times = [(datetime.utcnow() - app.applied_date).days for app in hired_applications]
    
    return {
        "avg_time_to_hire_days": round(sum(times) / len(times), 1) if times else 0,
        "min_time_to_hire_days": min(times) if times else 0,
        "max_time_to_hire_days": max(times) if times else 0,
        "total_hires": len(hired_applications)
    }

@router.get("/metrics/source-effectiveness")
async def get_source_effectiveness(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    db: Session = Depends(database.get_db)
):
    """Analyze effectiveness of different candidate sources"""
    query = db.query(models.Application)
    
    if start_date:
        query = query.filter(models.Application.applied_date >= start_date)
    
    if end_date:
        query = query.filter(models.Application.applied_date <= end_date)
    
    applications = query.all()
    
    # Group by source
    by_source = {}
    for app in applications:
        source = app.source or 'direct'
        if source not in by_source:
            by_source[source] = {
                "total": 0,
                "hired": 0,
                "avg_score": 0,
                "scores": []
            }
        
        by_source[source]["total"] += 1
        by_source[source]["scores"].append(app.ai_fit_score or 0)
        
        if app.status == 'hired':
            by_source[source]["hired"] += 1
    
    # Calculate averages and conversion rates
    result = []
    for source, data in by_source.items():
        result.append({
            "source": source,
            "total_applications": data["total"],
            "total_hired": data["hired"],
            "conversion_rate": round((data["hired"] / data["total"]) * 100, 2) if data["total"] > 0 else 0,
            "avg_quality_score": round(sum(data["scores"]) / len(data["scores"]), 2) if data["scores"] else 0
        })
    
    # Sort by conversion rate
    result.sort(key=lambda x: x["conversion_rate"], reverse=True)
    
    return result

@router.get("/metrics/conversion-rates")
async def get_conversion_rates(
    job_id: Optional[int] = None,
    db: Session = Depends(database.get_db)
):
    """Calculate conversion rates between stages"""
    query = db.query(models.Application)
    
    if job_id:
        query = query.filter(models.Application.job_id == job_id)
    
    applications = query.all()
    
    stages = ['applied', 'screening', 'assessment', 'interview', 'offer', 'hired']
    stage_counts = {stage: 0 for stage in stages}
    
    for app in applications:
        status = app.status or 'applied'
        if status in stage_counts:
            stage_counts[status] += 1
    
    # Calculate conversion rates
    conversions = []
    for i in range(len(stages) - 1):
        from_stage = stages[i]
        to_stage = stages[i + 1]
        
        from_count = stage_counts[from_stage]
        to_count = stage_counts[to_stage]
        
        rate = round((to_count / from_count) * 100, 2) if from_count > 0 else 0
        
        conversions.append({
            "from_stage": from_stage,
            "to_stage": to_stage,
            "from_count": from_count,
            "to_count": to_count,
            "conversion_rate": rate
        })
    
    return conversions

# ============================================
# EMAIL NOTIFICATIONS
# ============================================

@router.post("/applications/{application_id}/send-email")
async def send_application_email(
    application_id: int,
    email_data: dict,
    db: Session = Depends(database.get_db)
):
    """Send email to candidate"""
    app = db.query(models.Application).filter(models.Application.id == application_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")
    
    email_type = email_data.get("type", "status_update")
    
    try:
        if email_type == "status_update":
            await email_service.send_stage_update(
                candidate_email=app.candidate_email,
                candidate_name=app.candidate_name,
                job_title=app.job.title if app.job else "Position",
                new_stage=app.status or "applied",
                message=email_data.get("message")
            )
        elif email_type == "rejection":
            await email_service.send_rejection(
                candidate_email=app.candidate_email,
                candidate_name=app.candidate_name,
                job_title=app.job.title if app.job else "Position",
                feedback=email_data.get("feedback")
            )
        
        return {"message": "Email sent successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to send email: {str(e)}")

# ============================================
# CANDIDATE PORTAL
# ============================================

@router.get("/candidate/applications")
async def get_candidate_applications(
    email: str = Query(...),
    db: Session = Depends(database.get_db)
):
    """Get all applications for a candidate (for candidate portal)"""
    applications = db.query(models.Application).filter(
        models.Application.candidate_email == email
    ).all()
    
    return applications

@router.get("/candidate/applications/{application_id}")
async def get_candidate_application_detail(
    application_id: int,
    email: str = Query(...),
    db: Session = Depends(database.get_db)
):
    """Get detailed application info for candidate"""
    app = db.query(models.Application).filter(
        models.Application.id == application_id,
        models.Application.candidate_email == email
    ).first()
    
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")
    
    return app

# ============================================
# REPORTING
# ============================================

@router.get("/reports/recruiter-performance")
async def get_recruiter_performance(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    db: Session = Depends(database.get_db)
):
    """Get recruiter performance metrics"""
    # TODO: Implement recruiter tracking
    # For now, return mock data
    return {
        "total_applications_processed": 150,
        "total_hires": 12,
        "avg_time_to_hire_days": 18,
        "candidate_satisfaction": 4.5
    }

@router.get("/reports/diversity-metrics")
async def get_diversity_metrics(
    job_id: Optional[int] = None,
    db: Session = Depends(database.get_db)
):
    """Get diversity hiring metrics"""
    # TODO: Implement diversity tracking
    # For now, return mock data
    return {
        "total_applications": 200,
        "diversity_percentage": 45,
        "by_category": {
            "gender": {"male": 55, "female": 40, "other": 5},
            "ethnicity": {"diverse": 45, "non_diverse": 55}
        }
    }
