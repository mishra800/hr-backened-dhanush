"""
Dashboard Service
Centralized service for dashboard data with caching and performance optimization
"""

from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, and_, or_, desc
from . import models
from .notification_service import NotificationService
import json
import logging

logger = logging.getLogger(__name__)

class DashboardService:
    def __init__(self, db: Session):
        self.db = db
        self.notification_service = NotificationService(db)
        self._cache = {}
        self._cache_ttl = 300  # 5 minutes cache TTL
    
    def _get_cache_key(self, key: str, user_id: int) -> str:
        """Generate cache key for user-specific data"""
        return f"dashboard_{key}_{user_id}"
    
    def _is_cache_valid(self, cache_entry: Dict) -> bool:
        """Check if cache entry is still valid"""
        if not cache_entry:
            return False
        
        cache_time = cache_entry.get('timestamp')
        if not cache_time:
            return False
        
        return (datetime.utcnow() - cache_time).total_seconds() < self._cache_ttl
    
    def _set_cache(self, key: str, data: Any) -> None:
        """Set cache entry with timestamp"""
        self._cache[key] = {
            'data': data,
            'timestamp': datetime.utcnow()
        }
    
    def _get_cache(self, key: str) -> Optional[Any]:
        """Get cache entry if valid"""
        cache_entry = self._cache.get(key)
        if self._is_cache_valid(cache_entry):
            return cache_entry['data']
        return None
    
    def get_dashboard_stats(self, current_user: models.User) -> Dict[str, Any]:
        """Get comprehensive dashboard statistics with role-based filtering and caching"""
        cache_key = self._get_cache_key('stats', current_user.id)
        cached_data = self._get_cache(cache_key)
        
        if cached_data:
            return cached_data
        
        try:
            stats = {}
            
            # Base employee and user counts (visible to all roles)
            base_counts = self.db.query(
                func.count(models.Employee.id).label('total_employees'),
                func.count(models.User.id).label('total_users')
            ).select_from(models.Employee).outerjoin(models.User).first()
            
            stats.update({
                'total_employees': base_counts.total_employees or 0,
                'total_users': base_counts.total_users or 0
            })
            
            # Role-based statistics
            if current_user.role in ['admin', 'hr', 'manager', 'super_admin']:
                # Management roles see recruitment and leave data
                recruitment_stats = self._get_recruitment_stats()
                leave_stats = self._get_leave_stats_for_managers()
                stats.update(recruitment_stats)
                stats.update(leave_stats)
                
            elif current_user.role == 'employee':
                # Employees see only their own leave data
                employee_stats = self._get_employee_stats(current_user)
                stats.update(employee_stats)
                
            elif current_user.role == 'candidate':
                # Candidates see their application data
                candidate_stats = self._get_candidate_stats(current_user)
                stats.update(candidate_stats)
                
            elif current_user.role == 'assets_team':
                # Assets team sees asset-related data
                asset_stats = self._get_asset_stats()
                stats.update(asset_stats)
            
            # Common additional metrics
            stats.update({
                'recent_hires': self._get_recent_hires_count(),
                'active_surveys': self._get_active_surveys_count(),
                'timestamp': datetime.utcnow().isoformat()
            })
            
            # Calculate derived metrics
            if 'open_jobs' in stats and 'pending_applications' in stats:
                stats['application_rate'] = round(
                    (stats['pending_applications'] / max(stats['open_jobs'], 1)) * 100, 1
                )
            
            self._set_cache(cache_key, stats)
            return stats
            
        except Exception as e:
            logger.error(f"Error fetching dashboard stats for user {current_user.id}: {e}")
            return self._get_fallback_stats()
    
    def get_recent_activities(self, current_user: models.User, limit: int = 10) -> List[Dict[str, Any]]:
        """Get recent activities with role-based filtering"""
        cache_key = self._get_cache_key(f'activities_{limit}', current_user.id)
        cached_data = self._get_cache(cache_key)
        
        if cached_data:
            return cached_data
        
        try:
            activities = []
            
            if current_user.role in ['admin', 'hr', 'manager', 'super_admin']:
                activities = self._get_management_activities(limit)
            elif current_user.role == 'employee':
                activities = self._get_employee_activities(current_user, limit)
            elif current_user.role == 'candidate':
                activities = self._get_candidate_activities(current_user, limit)
            elif current_user.role == 'assets_team':
                activities = self._get_assets_team_activities(limit)
            
            self._set_cache(cache_key, activities)
            return activities
            
        except Exception as e:
            logger.error(f"Error fetching activities for user {current_user.id}: {e}")
            return []
    
    def get_dashboard_notifications(self, current_user: models.User) -> List[Dict[str, Any]]:
        """Get role-based dashboard notifications"""
        cache_key = self._get_cache_key('notifications', current_user.id)
        cached_data = self._get_cache(cache_key)
        
        if cached_data:
            return cached_data
        
        try:
            notifications = []
            
            if current_user.role in ['admin', 'hr', 'manager', 'super_admin']:
                notifications = self._get_management_notifications()
            elif current_user.role == 'employee':
                notifications = self._get_employee_notifications(current_user)
            elif current_user.role == 'candidate':
                notifications = self._get_candidate_notifications(current_user)
            elif current_user.role == 'assets_team':
                notifications = self._get_assets_team_notifications()
            
            # Sort by priority
            priority_order = {"high": 1, "medium": 2, "low": 3}
            notifications.sort(key=lambda x: priority_order.get(x.get("priority", "low"), 3))
            
            self._set_cache(cache_key, notifications)
            return notifications
            
        except Exception as e:
            logger.error(f"Error fetching notifications for user {current_user.id}: {e}")
            return []
    
    def get_calendar_events(self, current_user: models.User, days_ahead: int = 7) -> List[Dict[str, Any]]:
        """Get upcoming calendar events with role-based filtering"""
        cache_key = self._get_cache_key(f'calendar_{days_ahead}', current_user.id)
        cached_data = self._get_cache(cache_key)
        
        if cached_data:
            return cached_data
        
        try:
            today = datetime.now().date()
            end_date = today + timedelta(days=days_ahead)
            events = []
            
            if current_user.role in ['admin', 'hr', 'manager', 'super_admin']:
                events = self._get_management_calendar_events(today, end_date)
            elif current_user.role == 'employee':
                events = self._get_employee_calendar_events(current_user, today, end_date)
            elif current_user.role == 'candidate':
                events = self._get_candidate_calendar_events(current_user, today, end_date)
            
            # Sort by date
            events.sort(key=lambda x: x.get('date', ''))
            
            self._set_cache(cache_key, events)
            return events
            
        except Exception as e:
            logger.error(f"Error fetching calendar events for user {current_user.id}: {e}")
            return []
    
    # Private helper methods
    
    def _get_recruitment_stats(self) -> Dict[str, int]:
        """Get recruitment-related statistics"""
        try:
            recruitment_data = self.db.query(
                func.count(models.Job.id).filter(models.Job.is_active == True).label('open_jobs'),
                func.count(models.Application.id).filter(models.Application.status == 'applied').label('pending_applications'),
                func.count(models.Application.id).label('total_applications')
            ).select_from(models.Job).outerjoin(models.Application).first()
            
            return {
                'open_jobs': recruitment_data.open_jobs or 0,
                'pending_applications': recruitment_data.pending_applications or 0,
                'total_applications': recruitment_data.total_applications or 0
            }
        except Exception as e:
            logger.error(f"Error fetching recruitment stats: {e}")
            return {'open_jobs': 0, 'pending_applications': 0, 'total_applications': 0}
    
    def _get_leave_stats_for_managers(self) -> Dict[str, int]:
        """Get leave statistics for management roles"""
        try:
            pending_leaves = self.db.query(models.LeaveRequest).filter(
                models.LeaveRequest.status == 'Pending'
            ).count()
            
            return {'pending_leave_requests': pending_leaves}
        except Exception as e:
            logger.error(f"Error fetching leave stats: {e}")
            return {'pending_leave_requests': 0}
    
    def _get_employee_stats(self, current_user: models.User) -> Dict[str, int]:
        """Get statistics for employee role"""
        try:
            if not current_user.employee:
                return {'pending_leave_requests': 0}
            
            my_pending_leaves = self.db.query(models.LeaveRequest).filter(
                models.LeaveRequest.employee_id == current_user.employee.id,
                models.LeaveRequest.status == 'Pending'
            ).count()
            
            return {'pending_leave_requests': my_pending_leaves}
        except Exception as e:
            logger.error(f"Error fetching employee stats: {e}")
            return {'pending_leave_requests': 0}
    
    def _get_candidate_stats(self, current_user: models.User) -> Dict[str, int]:
        """Get statistics for candidate role"""
        try:
            my_applications = self.db.query(models.Application).filter(
                models.Application.candidate_id == current_user.id
            ).count()
            
            pending_applications = self.db.query(models.Application).filter(
                models.Application.candidate_id == current_user.id,
                models.Application.status.in_(['applied', 'screening'])
            ).count()
            
            return {
                'my_applications': my_applications,
                'pending_applications': pending_applications
            }
        except Exception as e:
            logger.error(f"Error fetching candidate stats: {e}")
            return {'my_applications': 0, 'pending_applications': 0}
    
    def _get_asset_stats(self) -> Dict[str, int]:
        """Get asset-related statistics"""
        try:
            pending_requests = self.db.query(models.AssetRequest).filter(
                models.AssetRequest.status.in_(['hr_approved', 'assigned_to_assets'])
            ).count()
            
            pending_complaints = self.db.query(models.AssetComplaint).filter(
                models.AssetComplaint.status.in_(['open', 'in_progress'])
            ).count()
            
            return {
                'pending_asset_requests': pending_requests,
                'pending_asset_complaints': pending_complaints
            }
        except Exception as e:
            logger.error(f"Error fetching asset stats: {e}")
            return {'pending_asset_requests': 0, 'pending_asset_complaints': 0}
    
    def _get_recent_hires_count(self) -> int:
        """Get count of recent hires (last 30 days)"""
        try:
            thirty_days_ago = datetime.utcnow() - timedelta(days=30)
            return self.db.query(models.Employee).filter(
                models.Employee.created_at >= thirty_days_ago
            ).count()
        except Exception as e:
            logger.error(f"Error fetching recent hires: {e}")
            return 0
    
    def _get_active_surveys_count(self) -> int:
        """Get count of active surveys"""
        try:
            return self.db.query(models.Survey).filter(
                models.Survey.status == 'active'
            ).count()
        except Exception as e:
            return 0
    
    def _get_management_activities(self, limit: int) -> List[Dict[str, Any]]:
        """Get activities for management roles"""
        activities = []
        
        try:
            # Recent applications with eager loading
            recent_apps = self.db.query(models.Application).options(
                joinedload(models.Application.job)
            ).order_by(desc(models.Application.applied_date)).limit(3).all()
            
            for app in recent_apps:
                activities.append({
                    "type": "application",
                    "message": f"New application received for {app.job.title if app.job else 'Unknown Position'}",
                    "timestamp": app.applied_date.isoformat() if app.applied_date else None,
                    "icon": "📝",
                    "user_id": app.candidate_id,
                    "related_id": app.id
                })
            
            # Recent leave requests
            recent_leaves = self.db.query(models.LeaveRequest).options(
                joinedload(models.LeaveRequest.employee)
            ).order_by(desc(models.LeaveRequest.created_at)).limit(3).all()
            
            for leave in recent_leaves:
                activities.append({
                    "type": "leave",
                    "message": f"Leave request from {leave.employee.first_name if leave.employee else 'Employee'} - {leave.status}",
                    "timestamp": leave.created_at.isoformat() if leave.created_at else None,
                    "icon": "🏖️",
                    "user_id": leave.employee_id,
                    "related_id": leave.id
                })
            
            # Recent hires
            recent_employees = self.db.query(models.Employee).order_by(
                desc(models.Employee.id)
            ).limit(2).all()
            
            for emp in recent_employees:
                activities.append({
                    "type": "hire",
                    "message": f"{emp.first_name} {emp.last_name} joined as {emp.position or 'Employee'}",
                    "timestamp": emp.created_at.isoformat() if emp.created_at else None,
                    "icon": "👋",
                    "user_id": emp.user_id,
                    "related_id": emp.id
                })
            
        except Exception as e:
            logger.error(f"Error fetching management activities: {e}")
        
        # Sort by timestamp and limit
        activities.sort(key=lambda x: x.get('timestamp') or '', reverse=True)
        return activities[:limit]
    
    def _get_employee_activities(self, current_user: models.User, limit: int) -> List[Dict[str, Any]]:
        """Get activities for employee role"""
        activities = []
        
        try:
            if not current_user.employee:
                return activities
            
            # My leave requests
            my_leaves = self.db.query(models.LeaveRequest).filter(
                models.LeaveRequest.employee_id == current_user.employee.id
            ).order_by(desc(models.LeaveRequest.created_at)).limit(3).all()
            
            for leave in my_leaves:
                activities.append({
                    "type": "leave",
                    "message": f"Your leave request - {leave.status}",
                    "timestamp": leave.created_at.isoformat() if leave.created_at else None,
                    "icon": "🏖️",
                    "user_id": current_user.id,
                    "related_id": leave.id
                })
            
            # My asset requests
            try:
                my_assets = self.db.query(models.AssetRequest).filter(
                    models.AssetRequest.employee_id == current_user.employee.id
                ).order_by(desc(models.AssetRequest.created_at)).limit(2).all()
                
                for asset in my_assets:
                    activities.append({
                        "type": "asset",
                        "message": f"Asset request - {asset.status}",
                        "timestamp": asset.created_at.isoformat() if asset.created_at else None,
                        "icon": "💻",
                        "user_id": current_user.id,
                        "related_id": asset.id
                    })
            except Exception:
                pass  # Asset requests might not exist
            
        except Exception as e:
            logger.error(f"Error fetching employee activities: {e}")
        
        activities.sort(key=lambda x: x.get('timestamp') or '', reverse=True)
        return activities[:limit]
    
    def _get_candidate_activities(self, current_user: models.User, limit: int) -> List[Dict[str, Any]]:
        """Get activities for candidate role"""
        activities = []
        
        try:
            my_applications = self.db.query(models.Application).options(
                joinedload(models.Application.job)
            ).filter(
                models.Application.candidate_id == current_user.id
            ).order_by(desc(models.Application.applied_date)).limit(limit).all()
            
            for app in my_applications:
                activities.append({
                    "type": "application",
                    "message": f"Your application for {app.job.title if app.job else 'Position'} - {app.status}",
                    "timestamp": app.applied_date.isoformat() if app.applied_date else None,
                    "icon": "📝",
                    "user_id": current_user.id,
                    "related_id": app.id
                })
            
        except Exception as e:
            logger.error(f"Error fetching candidate activities: {e}")
        
        return activities
    
    def _get_assets_team_activities(self, limit: int) -> List[Dict[str, Any]]:
        """Get activities for assets team role"""
        activities = []
        
        try:
            # Recent asset requests
            recent_requests = self.db.query(models.AssetRequest).options(
                joinedload(models.AssetRequest.employee)
            ).order_by(desc(models.AssetRequest.created_at)).limit(3).all()
            
            for req in recent_requests:
                activities.append({
                    "type": "asset_request",
                    "message": f"Asset request from {req.employee.first_name if req.employee else 'Employee'} - {req.status}",
                    "timestamp": req.created_at.isoformat() if req.created_at else None,
                    "icon": "💻",
                    "user_id": req.employee_id,
                    "related_id": req.id
                })
            
            # Recent complaints
            recent_complaints = self.db.query(models.AssetComplaint).options(
                joinedload(models.AssetComplaint.employee)
            ).order_by(desc(models.AssetComplaint.created_at)).limit(3).all()
            
            for complaint in recent_complaints:
                activities.append({
                    "type": "complaint",
                    "message": f"IT issue from {complaint.employee.first_name if complaint.employee else 'Employee'} - {complaint.status}",
                    "timestamp": complaint.created_at.isoformat() if complaint.created_at else None,
                    "icon": "🔧",
                    "user_id": complaint.employee_id,
                    "related_id": complaint.id
                })
            
        except Exception as e:
            logger.error(f"Error fetching assets team activities: {e}")
        
        activities.sort(key=lambda x: x.get('timestamp') or '', reverse=True)
        return activities[:limit]
    
    def _get_management_notifications(self) -> List[Dict[str, Any]]:
        """Get notifications for management roles"""
        notifications = []
        
        try:
            # Pending leave approvals
            pending_leaves = self.db.query(models.LeaveRequest).filter(
                models.LeaveRequest.status == 'Pending'
            ).count()
            
            if pending_leaves > 0:
                notifications.append({
                    "type": "warning",
                    "title": "Pending Leave Approvals",
                    "message": f"{pending_leaves} leave request(s) awaiting approval",
                    "count": pending_leaves,
                    "action_url": "/leave",
                    "priority": "high"
                })
            
            # New applications in last 24 hours
            yesterday = datetime.utcnow() - timedelta(days=1)
            new_applications = self.db.query(models.Application).filter(
                models.Application.applied_date >= yesterday
            ).count()
            
            if new_applications > 0:
                notifications.append({
                    "type": "success",
                    "title": "New Applications Today",
                    "message": f"{new_applications} new application(s) received in the last 24 hours",
                    "count": new_applications,
                    "action_url": "/recruitment",
                    "priority": "medium"
                })
            
            # Pending applications
            pending_applications = self.db.query(models.Application).filter(
                models.Application.status == 'applied'
            ).count()
            
            if pending_applications > 0:
                notifications.append({
                    "type": "warning",
                    "title": "Applications Awaiting Review",
                    "message": f"{pending_applications} application(s) need to be reviewed",
                    "count": pending_applications,
                    "action_url": "/recruitment",
                    "priority": "high"
                })
            
        except Exception as e:
            logger.error(f"Error fetching management notifications: {e}")
        
        return notifications
    
    def _get_employee_notifications(self, current_user: models.User) -> List[Dict[str, Any]]:
        """Get notifications for employee role"""
        notifications = []
        
        try:
            if not current_user.employee:
                return notifications
            
            # My pending leave requests
            my_pending_leaves = self.db.query(models.LeaveRequest).filter(
                models.LeaveRequest.employee_id == current_user.employee.id,
                models.LeaveRequest.status == 'Pending'
            ).count()
            
            if my_pending_leaves > 0:
                notifications.append({
                    "type": "info",
                    "title": "Your Leave Requests",
                    "message": f"{my_pending_leaves} leave request(s) pending approval",
                    "count": my_pending_leaves,
                    "action_url": "/leave",
                    "priority": "medium"
                })
            
        except Exception as e:
            logger.error(f"Error fetching employee notifications: {e}")
        
        return notifications
    
    def _get_candidate_notifications(self, current_user: models.User) -> List[Dict[str, Any]]:
        """Get notifications for candidate role"""
        notifications = []
        
        try:
            my_applications = self.db.query(models.Application).filter(
                models.Application.candidate_id == current_user.id,
                models.Application.status.in_(['applied', 'screening', 'interview'])
            ).count()
            
            if my_applications > 0:
                notifications.append({
                    "type": "info",
                    "title": "Your Applications",
                    "message": f"{my_applications} application(s) in progress",
                    "count": my_applications,
                    "action_url": "/career",
                    "priority": "medium"
                })
            
        except Exception as e:
            logger.error(f"Error fetching candidate notifications: {e}")
        
        return notifications
    
    def _get_assets_team_notifications(self) -> List[Dict[str, Any]]:
        """Get notifications for assets team role"""
        notifications = []
        
        try:
            pending_requests = self.db.query(models.AssetRequest).filter(
                models.AssetRequest.status.in_(['hr_approved', 'assigned_to_assets'])
            ).count()
            
            if pending_requests > 0:
                notifications.append({
                    "type": "warning",
                    "title": "Asset Requests to Fulfill",
                    "message": f"{pending_requests} asset request(s) need fulfillment",
                    "count": pending_requests,
                    "action_url": "/assets",
                    "priority": "high"
                })
            
            pending_complaints = self.db.query(models.AssetComplaint).filter(
                models.AssetComplaint.status.in_(['open', 'in_progress'])
            ).count()
            
            if pending_complaints > 0:
                notifications.append({
                    "type": "warning",
                    "title": "IT Issues to Resolve",
                    "message": f"{pending_complaints} IT complaint(s) need attention",
                    "count": pending_complaints,
                    "action_url": "/assets",
                    "priority": "high"
                })
            
        except Exception as e:
            logger.error(f"Error fetching assets team notifications: {e}")
        
        return notifications
    
    def _get_management_calendar_events(self, today, end_date) -> List[Dict[str, Any]]:
        """Get calendar events for management roles"""
        events = []
        
        try:
            # Upcoming approved leaves
            upcoming_leaves = self.db.query(models.LeaveRequest).options(
                joinedload(models.LeaveRequest.employee)
            ).filter(
                models.LeaveRequest.start_date >= today,
                models.LeaveRequest.start_date <= end_date,
                models.LeaveRequest.status == 'Approved'
            ).all()
            
            for leave in upcoming_leaves:
                events.append({
                    "id": f"leave_{leave.id}",
                    "title": f"{leave.employee.first_name if leave.employee else 'Employee'} - Leave",
                    "date": leave.start_date.isoformat(),
                    "type": "leave",
                    "icon": "🏖️",
                    "description": f"{leave.reason} ({leave.leave_type})"
                })
            
        except Exception as e:
            logger.error(f"Error fetching management calendar events: {e}")
        
        return events
    
    def _get_employee_calendar_events(self, current_user: models.User, today, end_date) -> List[Dict[str, Any]]:
        """Get calendar events for employee role"""
        events = []
        
        try:
            if not current_user.employee:
                return events
            
            # My approved leaves
            my_leaves = self.db.query(models.LeaveRequest).filter(
                models.LeaveRequest.employee_id == current_user.employee.id,
                models.LeaveRequest.start_date >= today,
                models.LeaveRequest.start_date <= end_date,
                models.LeaveRequest.status == 'Approved'
            ).all()
            
            for leave in my_leaves:
                events.append({
                    "id": f"my_leave_{leave.id}",
                    "title": f"My Leave - {leave.reason}",
                    "date": leave.start_date.isoformat(),
                    "type": "leave",
                    "icon": "🏖️",
                    "description": f"Type: {leave.leave_type}, Duration: {leave.days_requested} days"
                })
            
        except Exception as e:
            logger.error(f"Error fetching employee calendar events: {e}")
        
        return events
    
    def _get_candidate_calendar_events(self, current_user: models.User, today, end_date) -> List[Dict[str, Any]]:
        """Get calendar events for candidate role"""
        events = []
        
        try:
            # Candidate interviews (if interview table exists)
            # This would need to be implemented based on your interview model
            pass
            
        except Exception as e:
            logger.error(f"Error fetching candidate calendar events: {e}")
        
        return events
    
    def _get_fallback_stats(self) -> Dict[str, Any]:
        """Return fallback statistics when database queries fail"""
        return {
            'total_employees': 0,
            'total_users': 0,
            'open_jobs': 0,
            'pending_applications': 0,
            'total_applications': 0,
            'pending_leave_requests': 0,
            'active_surveys': 0,
            'recent_hires': 0,
            'application_rate': 0,
            'timestamp': datetime.utcnow().isoformat()
        }
    
    def clear_cache(self, user_id: Optional[int] = None) -> None:
        """Clear cache for specific user or all users"""
        if user_id:
            # Clear cache for specific user
            keys_to_remove = [key for key in self._cache.keys() if f"_{user_id}" in key]
            for key in keys_to_remove:
                del self._cache[key]
        else:
            # Clear all cache
            self._cache.clear()
    
    def get_cache_stats(self) -> Dict[str, Any]:
        """Get cache statistics for monitoring"""
        valid_entries = sum(1 for entry in self._cache.values() if self._is_cache_valid(entry))
        
        return {
            'total_entries': len(self._cache),
            'valid_entries': valid_entries,
            'invalid_entries': len(self._cache) - valid_entries,
            'cache_ttl_seconds': self._cache_ttl
        }