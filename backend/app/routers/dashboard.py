from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, and_, or_, desc
from app import database, models
from app.dependencies import get_current_user
from app.role_utils import require_role
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
    """Get comprehensive dashboard statistics with role-based filtering"""
    try:
        # Use single query with aggregations for better performance
        base_query = db.query(
            func.count(models.Employee.id).label('total_employees'),
            func.count(models.User.id).label('total_users')
        ).select_from(models.Employee).outerjoin(models.User)
        
        employee_stats = base_query.first()
        
        # Job metrics - only for roles that can see recruitment
        if current_user.role in ['admin', 'hr', 'manager', 'super_admin']:
            job_stats = db.query(
                func.count(models.Job.id).filter(models.Job.is_active == True).label('open_jobs'),
                func.count(models.Application.id).filter(models.Application.status == 'applied').label('pending_applications'),
                func.count(models.Application.id).label('total_applications')
            ).select_from(models.Job).outerjoin(models.Application).first()
        else:
            job_stats = type('obj', (object,), {'open_jobs': 0, 'pending_applications': 0, 'total_applications': 0})()
        
        # Leave metrics - role-based access
        if current_user.role in ['admin', 'hr', 'manager', 'super_admin']:
            leave_stats = db.query(
                func.count(models.LeaveRequest.id).filter(models.LeaveRequest.status == 'Pending').label('pending_leave_requests')
            ).first()
        elif current_user.role == 'employee':
            # Employees see only their own leave requests
            leave_stats = db.query(
                func.count(models.LeaveRequest.id).filter(
                    and_(
                        models.LeaveRequest.employee_id == current_user.employee.id if current_user.employee else -1,
                        models.LeaveRequest.status == 'Pending'
                    )
                ).label('pending_leave_requests')
            ).first()
        else:
            leave_stats = type('obj', (object,), {'pending_leave_requests': 0})()
        
        # Survey metrics with error handling
        try:
            active_surveys = db.query(models.Survey).filter(models.Survey.status == 'active').count()
        except:
            active_surveys = 0
        
        # Recent hires (last 30 days)
        thirty_days_ago = datetime.utcnow() - timedelta(days=30)
        try:
            recent_hires = db.query(models.Employee).filter(
                models.Employee.created_at >= thirty_days_ago
            ).count()
        except:
            recent_hires = 0
        
        # Calculate application rate
        application_rate = 0
        if hasattr(job_stats, 'open_jobs') and job_stats.open_jobs > 0:
            application_rate = round((job_stats.pending_applications / job_stats.open_jobs) * 100, 1)
        
        return DashboardStats(
            total_employees=employee_stats.total_employees or 0,
            total_users=employee_stats.total_users or 0,
            open_jobs=getattr(job_stats, 'open_jobs', 0),
            pending_applications=getattr(job_stats, 'pending_applications', 0),
            total_applications=getattr(job_stats, 'total_applications', 0),
            pending_leave_requests=getattr(leave_stats, 'pending_leave_requests', 0),
            active_surveys=active_surveys,
            recent_hires=recent_hires,
            application_rate=application_rate,
            timestamp=datetime.utcnow().isoformat()
        )
    except Exception as e:
        # Return minimal stats if there are database issues
        return DashboardStats(
            total_employees=0,
            total_users=0,
            open_jobs=0,
            pending_applications=0,
            total_applications=0,
            pending_leave_requests=0,
            active_surveys=0,
            recent_hires=0,
            application_rate=0,
            timestamp=datetime.utcnow().isoformat()
        )

@router.get("/activities", response_model=List[ActivityItem])
def get_recent_activities(
    limit: int = Query(10, ge=1, le=50),
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Get recent activities for dashboard feed with role-based filtering and pagination"""
    activities = []
    
    try:
        # Role-based activity filtering
        if current_user.role in ['admin', 'hr', 'manager', 'super_admin']:
            # Managers and above see all activities
            
            # Recent applications with eager loading
            recent_apps = db.query(models.Application).options(
                joinedload(models.Application.job)
            ).order_by(desc(models.Application.applied_date)).limit(5).all()
            
            for app in recent_apps:
                activities.append(ActivityItem(
                    type="application",
                    message=f"New application received for {app.job.title if app.job else 'Unknown Position'}",
                    timestamp=app.applied_date,
                    icon="📝",
                    user_id=app.candidate_id,
                    related_id=app.id
                ))
            
            # Recent leave requests with eager loading
            recent_leaves = db.query(models.LeaveRequest).options(
                joinedload(models.LeaveRequest.employee)
            ).order_by(desc(models.LeaveRequest.created_at)).limit(3).all()
            
            for leave in recent_leaves:
                activities.append(ActivityItem(
                    type="leave",
                    message=f"Leave request from {leave.employee.first_name if leave.employee else 'Employee'} - {leave.status}",
                    timestamp=leave.created_at,
                    icon="🏖️",
                    user_id=leave.employee_id,
                    related_id=leave.id
                ))
            
            # Recent hires
            recent_employees = db.query(models.Employee).order_by(desc(models.Employee.id)).limit(3).all()
            for emp in recent_employees:
                activities.append(ActivityItem(
                    type="hire",
                    message=f"{emp.first_name} {emp.last_name} joined as {emp.position or 'Employee'}",
                    timestamp=emp.created_at,
                    icon="👋",
                    user_id=emp.user_id,
                    related_id=emp.id
                ))
        
        elif current_user.role == 'employee':
            # Employees see only their own activities
            if current_user.employee:
                # My leave requests
                my_leaves = db.query(models.LeaveRequest).filter(
                    models.LeaveRequest.employee_id == current_user.employee.id
                ).order_by(desc(models.LeaveRequest.created_at)).limit(3).all()
                
                for leave in my_leaves:
                    activities.append(ActivityItem(
                        type="leave",
                        message=f"Your leave request - {leave.status}",
                        timestamp=leave.created_at,
                        icon="🏖️",
                        user_id=current_user.id,
                        related_id=leave.id
                    ))
                
                # My asset requests
                try:
                    my_assets = db.query(models.AssetRequest).filter(
                        models.AssetRequest.employee_id == current_user.employee.id
                    ).order_by(desc(models.AssetRequest.created_at)).limit(2).all()
                    
                    for asset in my_assets:
                        activities.append(ActivityItem(
                            type="asset",
                            message=f"Asset request - {asset.status}",
                            timestamp=asset.created_at,
                            icon="💻",
                            user_id=current_user.id,
                            related_id=asset.id
                        ))
                except:
                    pass  # Asset requests might not exist
        
        elif current_user.role == 'candidate':
            # Candidates see their application activities
            my_applications = db.query(models.Application).options(
                joinedload(models.Application.job)
            ).filter(
                models.Application.candidate_id == current_user.id
            ).order_by(desc(models.Application.applied_date)).limit(5).all()
            
            for app in my_applications:
                activities.append(ActivityItem(
                    type="application",
                    message=f"Your application for {app.job.title if app.job else 'Position'} - {app.status}",
                    timestamp=app.applied_date,
                    icon="📝",
                    user_id=current_user.id,
                    related_id=app.id
                ))
        
        # Sort by timestamp and limit
        activities.sort(key=lambda x: x.timestamp or datetime.min, reverse=True)
        return activities[:limit]
        
    except Exception as e:
        return [ActivityItem(
            type="error",
            message=f"Error loading activities: {str(e)}",
            timestamp=datetime.utcnow(),
            icon="⚠️"
        )]

@router.get("/notifications", response_model=List[NotificationItem])
def get_dashboard_notifications(
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Get dashboard notifications with role-based filtering and enhanced alerts"""
    notifications = []
    
    try:
        # Role-based notification filtering
        if current_user.role in ['admin', 'hr', 'manager', 'super_admin']:
            # Management notifications
            
            # Pending leave approvals
            pending_leaves = db.query(models.LeaveRequest).filter(
                models.LeaveRequest.status == 'Pending'
            ).count()
            
            if pending_leaves > 0:
                notifications.append(NotificationItem(
                    type="warning",
                    title="Pending Leave Approvals",
                    message=f"{pending_leaves} leave request(s) awaiting approval",
                    count=pending_leaves,
                    action_url="/leave",
                    priority="high"
                ))
            
            # New applications in last 24 hours
            yesterday = datetime.utcnow() - timedelta(days=1)
            new_applications = db.query(models.Application).filter(
                models.Application.applied_date >= yesterday
            ).count()
            
            if new_applications > 0:
                notifications.append(NotificationItem(
                    type="success",
                    title="New Applications Today",
                    message=f"{new_applications} new application(s) received in the last 24 hours",
                    count=new_applications,
                    action_url="/recruitment",
                    priority="medium"
                ))
            
            # Pending applications (not yet reviewed)
            pending_applications = db.query(models.Application).filter(
                models.Application.status == 'applied'
            ).count()
            
            if pending_applications > 0:
                notifications.append(NotificationItem(
                    type="warning",
                    title="Applications Awaiting Review",
                    message=f"{pending_applications} application(s) need to be reviewed",
                    count=pending_applications,
                    action_url="/recruitment",
                    priority="high"
                ))
            
            # High-scoring applications that need attention
            try:
                high_score_apps = db.query(models.Application).filter(
                    models.Application.ai_fit_score >= 85,
                    models.Application.status == 'applied'
                ).count()
                
                if high_score_apps > 0:
                    notifications.append(NotificationItem(
                        type="info",
                        title="High-Score Applications",
                        message=f"{high_score_apps} application(s) with 85%+ fit score need review",
                        count=high_score_apps,
                        action_url="/recruitment",
                        priority="high"
                    ))
            except:
                pass  # AI fit score might not exist
            
            # Applications stuck in screening for too long
            week_ago = datetime.utcnow() - timedelta(days=7)
            stale_applications = db.query(models.Application).filter(
                models.Application.status == 'screening',
                models.Application.applied_date <= week_ago
            ).count()
            
            if stale_applications > 0:
                notifications.append(NotificationItem(
                    type="warning",
                    title="Stale Applications",
                    message=f"{stale_applications} application(s) in screening for over a week",
                    count=stale_applications,
                    action_url="/recruitment",
                    priority="medium"
                ))
            
            # Asset-related notifications for admin/hr
            try:
                pending_asset_requests = db.query(models.AssetRequest).filter(
                    models.AssetRequest.status.in_(['pending', 'manager_approved'])
                ).count()
                
                if pending_asset_requests > 0:
                    notifications.append(NotificationItem(
                        type="info",
                        title="Pending Asset Requests",
                        message=f"{pending_asset_requests} asset request(s) need approval",
                        count=pending_asset_requests,
                        action_url="/assets",
                        priority="medium"
                    ))
            except:
                pass  # Asset requests might not exist
        
        elif current_user.role == 'employee':
            # Employee-specific notifications
            if current_user.employee:
                # My pending leave requests
                my_pending_leaves = db.query(models.LeaveRequest).filter(
                    models.LeaveRequest.employee_id == current_user.employee.id,
                    models.LeaveRequest.status == 'Pending'
                ).count()
                
                if my_pending_leaves > 0:
                    notifications.append(NotificationItem(
                        type="info",
                        title="Your Leave Requests",
                        message=f"{my_pending_leaves} leave request(s) pending approval",
                        count=my_pending_leaves,
                        action_url="/leave",
                        priority="medium"
                    ))
                
                # My asset requests
                try:
                    my_asset_requests = db.query(models.AssetRequest).filter(
                        models.AssetRequest.employee_id == current_user.employee.id,
                        models.AssetRequest.status.in_(['pending', 'manager_approved', 'hr_approved'])
                    ).count()
                    
                    if my_asset_requests > 0:
                        notifications.append(NotificationItem(
                            type="info",
                            title="Your Asset Requests",
                            message=f"{my_asset_requests} asset request(s) in progress",
                            count=my_asset_requests,
                            action_url="/assets",
                            priority="low"
                        ))
                except:
                    pass
        
        elif current_user.role == 'candidate':
            # Candidate notifications
            my_applications = db.query(models.Application).filter(
                models.Application.candidate_id == current_user.id,
                models.Application.status.in_(['applied', 'screening', 'interview'])
            ).count()
            
            if my_applications > 0:
                notifications.append(NotificationItem(
                    type="info",
                    title="Your Applications",
                    message=f"{my_applications} application(s) in progress",
                    count=my_applications,
                    action_url="/career",
                    priority="medium"
                ))
        
        elif current_user.role == 'assets_team':
            # Assets team notifications
            try:
                pending_asset_fulfillment = db.query(models.AssetRequest).filter(
                    models.AssetRequest.status.in_(['hr_approved', 'assigned_to_assets'])
                ).count()
                
                if pending_asset_fulfillment > 0:
                    notifications.append(NotificationItem(
                        type="warning",
                        title="Asset Requests to Fulfill",
                        message=f"{pending_asset_fulfillment} asset request(s) need fulfillment",
                        count=pending_asset_fulfillment,
                        action_url="/assets",
                        priority="high"
                    ))
                
                pending_complaints = db.query(models.AssetComplaint).filter(
                    models.AssetComplaint.status.in_(['open', 'in_progress'])
                ).count()
                
                if pending_complaints > 0:
                    notifications.append(NotificationItem(
                        type="warning",
                        title="IT Issues to Resolve",
                        message=f"{pending_complaints} IT complaint(s) need attention",
                        count=pending_complaints,
                        action_url="/assets",
                        priority="high"
                    ))
            except:
                pass
        
        # Sort by priority
        priority_order = {"high": 1, "medium": 2, "low": 3}
        notifications.sort(key=lambda x: priority_order.get(x.priority, 3))
        
        return notifications
        
    except Exception as e:
        return [NotificationItem(
            type="error",
            title="System Error",
            message=f"Error loading notifications: {str(e)}",
            priority="high"
        )]


@router.get("/calendar", response_model=List[CalendarEvent])
def get_calendar_events(
    days_ahead: int = Query(7, ge=1, le=30),
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Get upcoming calendar events for dashboard with role-based filtering"""
    events = []
    today = datetime.now().date()
    end_date = today + timedelta(days=days_ahead)
    
    try:
        # Role-based event filtering
        if current_user.role in ['admin', 'hr', 'manager', 'super_admin']:
            # Management sees all events
            
            # Upcoming approved leaves
            upcoming_leaves = db.query(models.LeaveRequest).options(
                joinedload(models.LeaveRequest.employee)
            ).filter(
                models.LeaveRequest.start_date >= today,
                models.LeaveRequest.start_date <= end_date,
                models.LeaveRequest.status == 'Approved'
            ).all()
            
            for leave in upcoming_leaves:
                events.append(CalendarEvent(
                    id=f"leave_{leave.id}",
                    title=f"{leave.employee.first_name if leave.employee else 'Employee'} - Leave",
                    date=leave.start_date.isoformat(),
                    type="leave",
                    icon="🏖️",
                    description=f"{leave.reason} ({leave.leave_type})"
                ))
            
            # Upcoming interviews (if interview table exists)
            try:
                upcoming_interviews = db.query(models.Interview).options(
                    joinedload(models.Interview.application),
                    joinedload(models.Interview.application.job)
                ).filter(
                    models.Interview.scheduled_date >= today,
                    models.Interview.scheduled_date <= end_date,
                    models.Interview.status.in_(['scheduled', 'confirmed'])
                ).all()
                
                for interview in upcoming_interviews:
                    events.append(CalendarEvent(
                        id=f"interview_{interview.id}",
                        title=f"Interview - {interview.application.job.title if interview.application and interview.application.job else 'Position'}",
                        date=interview.scheduled_date.isoformat(),
                        type="interview",
                        icon="🤝",
                        description=f"Candidate: {interview.application.candidate.first_name if interview.application and interview.application.candidate else 'Unknown'}"
                    ))
            except:
                pass  # Interview table might not exist
            
            # Upcoming onboarding sessions
            try:
                upcoming_onboarding = db.query(models.Employee).filter(
                    models.Employee.start_date >= today,
                    models.Employee.start_date <= end_date
                ).all()
                
                for emp in upcoming_onboarding:
                    events.append(CalendarEvent(
                        id=f"onboarding_{emp.id}",
                        title=f"New Hire Orientation - {emp.first_name} {emp.last_name}",
                        date=emp.start_date.isoformat() if emp.start_date else today.isoformat(),
                        type="onboarding",
                        icon="🚀",
                        description=f"Department: {emp.department}, Position: {emp.position}"
                    ))
            except:
                pass
        
        elif current_user.role == 'employee':
            # Employees see their own events
            if current_user.employee:
                # My approved leaves
                my_leaves = db.query(models.LeaveRequest).filter(
                    models.LeaveRequest.employee_id == current_user.employee.id,
                    models.LeaveRequest.start_date >= today,
                    models.LeaveRequest.start_date <= end_date,
                    models.LeaveRequest.status == 'Approved'
                ).all()
                
                for leave in my_leaves:
                    events.append(CalendarEvent(
                        id=f"my_leave_{leave.id}",
                        title=f"My Leave - {leave.reason}",
                        date=leave.start_date.isoformat(),
                        type="leave",
                        icon="🏖️",
                        description=f"Type: {leave.leave_type}, Duration: {leave.days_requested} days"
                    ))
        
        elif current_user.role == 'candidate':
            # Candidates see their interviews
            try:
                my_interviews = db.query(models.Interview).options(
                    joinedload(models.Interview.application),
                    joinedload(models.Interview.application.job)
                ).filter(
                    models.Interview.application.has(candidate_id=current_user.id),
                    models.Interview.scheduled_date >= today,
                    models.Interview.scheduled_date <= end_date,
                    models.Interview.status.in_(['scheduled', 'confirmed'])
                ).all()
                
                for interview in my_interviews:
                    events.append(CalendarEvent(
                        id=f"my_interview_{interview.id}",
                        title=f"My Interview - {interview.application.job.title if interview.application and interview.application.job else 'Position'}",
                        date=interview.scheduled_date.isoformat(),
                        type="interview",
                        icon="🤝",
                        description=f"Type: {interview.interview_type}, Location: {interview.location or 'TBD'}"
                    ))
            except:
                pass
        
        # Add some default events if no specific events found
        if not events:
            # Add company-wide events (holidays, etc.)
            events = [
                CalendarEvent(
                    id="company_meeting",
                    title="All Hands Meeting",
                    date=(today + timedelta(days=3)).isoformat(),
                    type="meeting",
                    icon="👥",
                    description="Monthly company-wide meeting"
                ),
                CalendarEvent(
                    id="team_lunch",
                    title="Team Lunch",
                    date=(today + timedelta(days=5)).isoformat(),
                    type="social",
                    icon="🍽️",
                    description="Team building lunch"
                )
            ]
        
        # Sort by date
        events.sort(key=lambda x: x.date)
        return events
        
    except Exception as e:
        return [CalendarEvent(
            id="error",
            title="Error Loading Events",
            date=today.isoformat(),
            type="error",
            icon="⚠️",
            description=str(e)
        )]


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
        
        # Leave balance
        leave_balance = 12  # Default, should come from leave policy
        try:
            used_leaves = db.query(func.sum(models.LeaveRequest.days_requested)).filter(
                models.LeaveRequest.employee_id == employee.id,
                models.LeaveRequest.status == 'Approved',
                func.extract('year', models.LeaveRequest.start_date) == datetime.now().year
            ).scalar() or 0
            leave_balance = max(0, 24 - used_leaves)  # Assuming 24 days annual leave
        except:
            pass
        
        # Pending tasks (placeholder)
        pending_tasks = 3
        
        # Learning hours (placeholder)
        learning_hours = 8.5
        
        # Next holiday
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
        # My applications
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