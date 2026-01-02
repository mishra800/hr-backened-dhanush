"""
Enhanced Analysis Router with Advanced Metrics and Filtering
"""
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, desc, and_, or_
from typing import List, Optional
from datetime import datetime, timedelta
from app import database, models
import json

router = APIRouter(
    prefix="/analysis-enhanced",
    tags=["analysis-enhanced"]
)

# ============================================
# ADVANCED ANALYTICS
# ============================================

@router.get("/dashboard/overview")
async def get_dashboard_overview(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    db: Session = Depends(database.get_db)
):
    """Get comprehensive dashboard overview with all key metrics"""
    
    # Date filtering
    query_filter = []
    if start_date:
        query_filter.append(models.Application.applied_date >= start_date)
    if end_date:
        query_filter.append(models.Application.applied_date <= end_date)
    
    # Recruitment metrics
    total_applications = db.query(models.Application).filter(*query_filter).count()
    active_jobs = db.query(models.Job).filter(models.Job.status == 'open').count()
    
    # Employee metrics
    total_employees = db.query(models.Employee).count()
    new_hires = db.query(models.Employee).filter(
        models.Employee.hire_date >= (datetime.utcnow() - timedelta(days=30))
    ).count() if not start_date else 0
    
    # Attendance metrics
    today = datetime.utcnow().date()
    present_today = db.query(models.Attendance).filter(
        models.Attendance.date == today,
        models.Attendance.status == 'present'
    ).count()
    
    # Performance metrics
    avg_performance = db.query(func.avg(models.Performance.overall_rating)).scalar() or 0
    
    return {
        "recruitment": {
            "total_applications": total_applications,
            "active_jobs": active_jobs,
            "applications_this_month": total_applications
        },
        "employees": {
            "total_employees": total_employees,
            "new_hires_this_month": new_hires,
            "present_today": present_today
        },
        "performance": {
            "avg_rating": round(float(avg_performance), 2)
        }
    }


@router.get("/recruitment/funnel")
async def get_recruitment_funnel(
    job_id: Optional[int] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    db: Session = Depends(database.get_db)
):
    """Get recruitment funnel data with conversion rates"""
    
    query = db.query(models.Application)
    
    if job_id:
        query = query.filter(models.Application.job_id == job_id)
    if start_date:
        query = query.filter(models.Application.applied_date >= start_date)
    if end_date:
        query = query.filter(models.Application.applied_date <= end_date)
    
    applications = query.all()
    
    stages = {
        'applied': 0,
        'screening': 0,
        'assessment': 0,
        'interview': 0,
        'offer': 0,
        'hired': 0,
        'rejected': 0
    }
    
    for app in applications:
        status = app.status or 'applied'
        if status in stages:
            stages[status] += 1
    
    total = len(applications)
    
    funnel_data = []
    for stage, count in stages.items():
        if stage != 'rejected':
            funnel_data.append({
                "stage": stage,
                "count": count,
                "percentage": round((count / total * 100), 2) if total > 0 else 0
            })
    
    return {
        "funnel": funnel_data,
        "total_applications": total,
        "rejected": stages['rejected']
    }

@router.get("/kpis/summary")
async def get_kpi_summary(
    db: Session = Depends(database.get_db)
):
    """Get all key performance indicators in one call"""
    
    # Recruitment KPIs
    total_applications = db.query(models.Application).count()
    hired_count = db.query(models.Application).filter(models.Application.status == 'hired').count()
    
    # Employee KPIs
    total_employees = db.query(models.Employee).count()
    active_employees = db.query(models.Employee).filter(models.Employee.status == 'active').count()
    
    # Attendance KPIs
    today = datetime.utcnow().date()
    present_today = db.query(models.Attendance).filter(
        models.Attendance.date == today,
        models.Attendance.status == 'present'
    ).count()
    
    # Performance KPIs
    avg_performance = db.query(func.avg(models.Performance.overall_rating)).scalar() or 0
    
    return {
        "recruitment": {
            "total_applications": total_applications,
            "total_hired": hired_count,
            "conversion_rate": round((hired_count / total_applications * 100), 2) if total_applications > 0 else 0
        },
        "employees": {
            "total": total_employees,
            "active": active_employees,
            "inactive": total_employees - active_employees
        },
        "attendance": {
            "present_today": present_today,
            "total_employees": total_employees,
            "attendance_rate": round((present_today / total_employees * 100), 2) if total_employees > 0 else 0
        },
        "performance": {
            "average_rating": round(float(avg_performance), 2)
        }
    }
