from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app import database, models
from app.dependencies import get_current_user
from app.dashboard_service import DashboardService
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
from pydantic import BaseModel

router = APIRouter(
    prefix="/dashboard",
    tags=["dashboard"]
)

# Response models for better API documentation
class DashboardStats(BaseModel):
    total_employees: int
    total_users: int
    open_jobs: int = 0
    pending_applications: int = 0
    total_applications: int = 0
    pending_leave_requests: int = 0
    active_surveys: int = 0
    recent_hires: int = 0
    application_rate: float = 0
    timestamp: str

class ActivityItem(BaseModel):
    type: str
    message: str
    timestamp: Optional[str]
    icon: str
    user_id: Optional[int] = None
    related_id: Optional[int] = None

class NotificationItem(BaseModel):
    type: str
    title: str
    message: str
    count: Optional[int] = None
    action_url: Optional[str] = None
    priority: str = "medium"

class CalendarEvent(BaseModel):
    id: str
    title: str
    date: str
    type: str
    icon: str
    description: Optional[str] = None

@router.get("/stats", response_model=DashboardStats)
def get_dashboard_stats(
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Get comprehensive dashboard statistics with role-based filtering and caching"""
    dashboard_service = DashboardService(db)
    stats = dashboard_service.get_dashboard_stats(current_user)
    return DashboardStats(**stats)

@router.get("/activities", response_model=List[ActivityItem])
def get_recent_activities(
    limit: int = Query(10, ge=1, le=50),
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Get recent activities for dashboard feed with role-based filtering and pagination"""
    dashboard_service = DashboardService(db)
    activities = dashboard_service.get_recent_activities(current_user, limit)
    return [ActivityItem(**activity) for activity in activities]

@router.get("/notifications", response_model=List[NotificationItem])
def get_dashboard_notifications(
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Get dashboard notifications with role-based filtering and enhanced alerts"""
    dashboard_service = DashboardService(db)
    notifications = dashboard_service.get_dashboard_notifications(current_user)
    return [NotificationItem(**notification) for notification in notifications]

@router.get("/calendar", response_model=List[CalendarEvent])
def get_calendar_events(
    days_ahead: int = Query(7, ge=1, le=30),
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Get upcoming calendar events for dashboard with role-based filtering"""
    dashboard_service = DashboardService(db)
    events = dashboard_service.get_calendar_events(current_user, days_ahead)
    return [CalendarEvent(**event) for event in events]

# New endpoints for role-specific dashboard data

@router.get("/employee-stats")
def get_employee_dashboard_stats(
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Get employee-specific dashboard statistics"""
    if current_user.role != 'employee' or not current_user.employee:
        raise HTTPException(status_code=403, detail="Only employees can access this endpoint")
    
    try:
        employee = current_user.employee
        
        # Leave balance calculation
        leave_balance = 12  # Default, should come from leave policy
        try:
            from sqlalchemy import func
            used_leaves = db.query(func.sum(models.LeaveRequest.days_requested)).filter(
                models.LeaveRequest.employee_id == employee.id,
                models.LeaveRequest.status == 'Approved',
                func.extract('year', models.LeaveRequest.start_date) == datetime.now().year
            ).scalar() or 0
            leave_balance = max(0, 24 - used_leaves)  # Assuming 24 days annual leave
        except:
            pass
        
        # Pending tasks (placeholder - should integrate with task management system)
        pending_tasks = 3
        
        # Learning hours (placeholder - should integrate with learning management system)
        learning_hours = 8.5
        
        # Next holiday (placeholder - should integrate with holiday calendar)
        next_holiday = "Christmas (25 Dec)"
        
        return {
            "leave_balance": leave_balance,
            "pending_tasks": pending_tasks,
            "learning_hours": learning_hours,
            "next_holiday": next_holiday,
            "employee_id": employee.id,
            "department": employee.department,
            "position": employee.position
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/team-stats")
def get_team_dashboard_stats(
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Get team-specific dashboard statistics for managers"""
    if current_user.role not in ['manager', 'admin', 'hr', 'super_admin']:
        raise HTTPException(status_code=403, detail="Only managers can access team statistics")
    
    try:
        # For now, return mock data. In production, implement team hierarchy
        team_stats = {
            "team_size": 12,
            "open_positions": 3,
            "interviews_today": 2,
            "team_attendance_rate": 95.5,
            "pending_reviews": 4,
            "team_workload": [
                {"name": "Alice", "load": 95, "status": "Overloaded"},
                {"name": "Bob", "load": 45, "status": "Underutilized"},
                {"name": "Charlie", "load": 75, "status": "Optimal"},
                {"name": "Diana", "load": 88, "status": "High"}
            ]
        }
        
        return team_stats
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/candidate-stats")
def get_candidate_dashboard_stats(
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Get candidate-specific dashboard statistics"""
    if current_user.role != 'candidate':
        raise HTTPException(status_code=403, detail="Only candidates can access this endpoint")
    
    try:
        from sqlalchemy.orm import joinedload
        
        # My applications with job details
        my_applications = db.query(models.Application).options(
            joinedload(models.Application.job)
        ).filter(
            models.Application.candidate_id == current_user.id
        ).all()
        
        application_stats = {
            "total_applications": len(my_applications),
            "pending_applications": len([app for app in my_applications if app.status == 'applied']),
            "interview_scheduled": len([app for app in my_applications if app.status == 'interview']),
            "applications": []
        }
        
        for app in my_applications:
            application_stats["applications"].append({
                "id": app.id,
                "job_title": app.job.title if app.job else "Unknown Position",
                "company": app.job.company if app.job else "Company",
                "status": app.status,
                "applied_date": app.applied_date.isoformat() if app.applied_date else None,
                "location": app.job.location if app.job else None
            })
        
        return application_stats
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Cache management endpoints

@router.post("/cache/clear")
def clear_dashboard_cache(
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Clear dashboard cache for current user"""
    dashboard_service = DashboardService(db)
    dashboard_service.clear_cache(current_user.id)
    return {"message": "Cache cleared successfully"}

@router.get("/cache/stats")
def get_cache_stats(
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Get cache statistics (admin only)"""
    if current_user.role not in ['admin', 'super_admin']:
        raise HTTPException(status_code=403, detail="Only admins can access cache statistics")
    
    dashboard_service = DashboardService(db)
    return dashboard_service.get_cache_stats()

# Health check endpoint
@router.get("/health")
def dashboard_health_check():
    """Dashboard service health check"""
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "service": "dashboard"
    }