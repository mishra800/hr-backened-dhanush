"""
WFH Request Scheduler
Handles automated tasks for WFH requests like reminders and notifications
"""

import asyncio
from datetime import datetime, timedelta, date
from sqlalchemy.orm import Session
from app import database, models
from app.notification_service import get_notification_service
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class WFHScheduler:
    
    def __init__(self):
        self.db = database.SessionLocal()
        self.notification_service = get_notification_service(self.db)
    
    async def send_wfh_reminders(self):
        """Send reminders to employees about approved WFH for tomorrow"""
        
        try:
            tomorrow = date.today() + timedelta(days=1)
            
            # Get approved WFH requests for tomorrow
            wfh_requests = self.db.query(models.WFHRequest).filter(
                models.WFHRequest.request_date == tomorrow,
                models.WFHRequest.status == "approved"
            ).all()
            
            logger.info(f"Found {len(wfh_requests)} approved WFH requests for {tomorrow}")
            
            for wfh_request in wfh_requests:
                try:
                    await self.notification_service.notify_wfh_reminder(wfh_request.id)
                    logger.info(f"Sent WFH reminder to employee {wfh_request.employee_id}")
                except Exception as e:
                    logger.error(f"Failed to send WFH reminder for request {wfh_request.id}: {e}")
            
            return len(wfh_requests)
            
        except Exception as e:
            logger.error(f"Error in send_wfh_reminders: {e}")
            return 0
        finally:
            self.db.close()
    
    async def check_expired_pending_requests(self):
        """Check for WFH requests that are pending for too long and send escalation"""
        
        try:
            # Get requests pending for more than 2 days
            cutoff_date = datetime.utcnow() - timedelta(days=2)
            
            expired_requests = self.db.query(models.WFHRequest).filter(
                models.WFHRequest.status == "pending",
                models.WFHRequest.created_at < cutoff_date
            ).all()
            
            logger.info(f"Found {len(expired_requests)} expired pending WFH requests")
            
            for request in expired_requests:
                try:
                    await self.send_escalation_notification(request.id)
                    logger.info(f"Sent escalation for WFH request {request.id}")
                except Exception as e:
                    logger.error(f"Failed to send escalation for request {request.id}: {e}")
            
            return len(expired_requests)
            
        except Exception as e:
            logger.error(f"Error in check_expired_pending_requests: {e}")
            return 0
        finally:
            self.db.close()
    
    async def send_escalation_notification(self, wfh_request_id: int):
        """Send escalation notification for overdue WFH request"""
        
        wfh_request = self.db.query(models.WFHRequest).filter(
            models.WFHRequest.id == wfh_request_id
        ).first()
        
        if not wfh_request or not wfh_request.employee:
            return
        
        employee = wfh_request.employee
        
        # Get HR and Admin users for escalation
        escalation_users = self.db.query(models.User).filter(
            models.User.role.in_(['hr', 'admin']),
            models.User.is_active == True
        ).all()
        
        for user in escalation_users:
            subject = f"🚨 Overdue WFH Request - {employee.first_name} {employee.last_name}"
            
            message = f"""
URGENT: WFH Request Pending for {(datetime.utcnow() - wfh_request.created_at).days} days

Employee: {employee.first_name} {employee.last_name}
Department: {employee.department or 'N/A'}
WFH Date: {wfh_request.request_date.strftime('%B %d, %Y (%A)')}
Reason: {wfh_request.reason}
Submitted: {wfh_request.created_at.strftime('%B %d, %Y at %I:%M %p')}

This request requires immediate attention as the requested date is approaching.

Please review and approve/reject: https://yourapp.com/dashboard/attendance
            """.strip()
            
            await self.notification_service.send_email(
                to_email=user.email,
                subject=subject,
                body=message
            )
            
            # Create urgent in-app notification
            await self.notification_service.create_in_app_notification(
                user_id=user.id,
                title="🚨 Overdue WFH Request",
                message=f"WFH request from {employee.first_name} {employee.last_name} pending for {(datetime.utcnow() - wfh_request.created_at).days} days",
                type="error",
                action_url="/dashboard/attendance",
                notification_data={
                    "wfh_request_id": wfh_request.id,
                    "employee_name": f"{employee.first_name} {employee.last_name}",
                    "days_pending": (datetime.utcnow() - wfh_request.created_at).days,
                    "request_date": wfh_request.request_date.isoformat()
                }
            )
    
    async def auto_reject_past_requests(self):
        """Auto-reject WFH requests for dates that have already passed"""
        
        try:
            yesterday = date.today() - timedelta(days=1)
            
            # Get pending requests for past dates
            past_requests = self.db.query(models.WFHRequest).filter(
                models.WFHRequest.status == "pending",
                models.WFHRequest.request_date < yesterday
            ).all()
            
            logger.info(f"Found {len(past_requests)} past pending WFH requests to auto-reject")
            
            for request in past_requests:
                try:
                    # Auto-reject the request
                    request.status = "rejected"
                    request.manager_comments = "Auto-rejected: Request date has passed"
                    request.reviewed_at = datetime.utcnow()
                    
                    self.db.commit()
                    
                    # Notify employee
                    await self.notification_service.notify_wfh_request_decision(
                        request.id,
                        "pending",
                        "rejected",
                        None  # System auto-rejection
                    )
                    
                    logger.info(f"Auto-rejected past WFH request {request.id}")
                    
                except Exception as e:
                    logger.error(f"Failed to auto-reject request {request.id}: {e}")
                    self.db.rollback()
            
            return len(past_requests)
            
        except Exception as e:
            logger.error(f"Error in auto_reject_past_requests: {e}")
            return 0
        finally:
            self.db.close()
    
    async def send_weekly_wfh_summary(self):
        """Send weekly summary of WFH requests to HR/Admin"""
        
        try:
            # Get WFH requests from last 7 days
            week_ago = datetime.utcnow() - timedelta(days=7)
            
            recent_requests = self.db.query(models.WFHRequest).filter(
                models.WFHRequest.created_at >= week_ago
            ).all()
            
            if not recent_requests:
                logger.info("No WFH requests in the last week")
                return 0
            
            # Group by status
            approved_count = len([r for r in recent_requests if r.status == "approved"])
            rejected_count = len([r for r in recent_requests if r.status == "rejected"])
            pending_count = len([r for r in recent_requests if r.status == "pending"])
            
            # Get HR and Admin users
            hr_users = self.db.query(models.User).filter(
                models.User.role.in_(['hr', 'admin']),
                models.User.is_active == True
            ).all()
            
            for hr_user in hr_users:
                subject = f"📊 Weekly WFH Summary - {len(recent_requests)} Requests"
                
                html_message = f"""
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0;">
                        <h2 style="margin: 0;">📊 Weekly WFH Summary</h2>
                        <p style="margin: 10px 0 0 0; opacity: 0.9;">{datetime.now().strftime('%B %d, %Y')}</p>
                    </div>
                    
                    <div style="background: #f8f9fa; padding: 20px; border-radius: 0 0 8px 8px;">
                        <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 15px;">
                            <h3 style="color: #333; margin-top: 0;">📈 WFH Statistics (Last 7 Days)</h3>
                            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px; margin: 20px 0;">
                                <div style="text-align: center; padding: 15px; background: #e8f5e8; border-radius: 8px;">
                                    <div style="font-size: 24px; font-weight: bold; color: #28a745;">{approved_count}</div>
                                    <div style="color: #28a745; font-weight: 500;">Approved</div>
                                </div>
                                <div style="text-align: center; padding: 15px; background: #fff3cd; border-radius: 8px;">
                                    <div style="font-size: 24px; font-weight: bold; color: #ffc107;">{pending_count}</div>
                                    <div style="color: #ffc107; font-weight: 500;">Pending</div>
                                </div>
                                <div style="text-align: center; padding: 15px; background: #f8d7da; border-radius: 8px;">
                                    <div style="font-size: 24px; font-weight: bold; color: #dc3545;">{rejected_count}</div>
                                    <div style="color: #dc3545; font-weight: 500;">Rejected</div>
                                </div>
                            </div>
                        </div>
                        
                        <div style="background: white; padding: 20px; border-radius: 8px;">
                            <h3 style="color: #333; margin-top: 0;">📋 Recent Requests</h3>
                """
                
                for request in recent_requests[-10:]:  # Show last 10 requests
                    status_color = "#28a745" if request.status == "approved" else "#ffc107" if request.status == "pending" else "#dc3545"
                    html_message += f"""
                            <div style="border-left: 4px solid {status_color}; padding-left: 15px; margin: 10px 0;">
                                <div style="font-weight: 500;">{request.employee.first_name} {request.employee.last_name}</div>
                                <div style="font-size: 14px; color: #666;">
                                    {request.request_date.strftime('%B %d, %Y')} • {request.status.upper()}
                                </div>
                            </div>
                    """
                
                html_message += f"""
                        </div>
                        
                        <div style="background: white; padding: 20px; border-radius: 8px; margin-top: 15px;">
                            <a href="https://yourapp.com/dashboard/attendance" style="background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">View All WFH Requests</a>
                        </div>
                    </div>
                </div>
                """
                
                plain_message = f"""
Weekly WFH Summary - {datetime.now().strftime('%B %d, %Y')}

WFH Statistics (Last 7 Days):
- Total Requests: {len(recent_requests)}
- Approved: {approved_count}
- Pending: {pending_count}
- Rejected: {rejected_count}

Recent Requests:
"""
                
                for request in recent_requests[-10:]:
                    plain_message += f"• {request.employee.first_name} {request.employee.last_name} - {request.request_date.strftime('%B %d, %Y')} ({request.status.upper()})\n"
                
                plain_message += f"\nView all WFH requests: https://yourapp.com/dashboard/attendance"
                
                await self.notification_service.send_email(
                    to_email=hr_user.email,
                    subject=subject,
                    body=plain_message,
                    html_body=html_message
                )
            
            logger.info(f"Sent weekly WFH summary to {len(hr_users)} HR users")
            return len(hr_users)
            
        except Exception as e:
            logger.error(f"Error in send_weekly_wfh_summary: {e}")
            return 0
        finally:
            self.db.close()

# ============================================
# SCHEDULER FUNCTIONS
# ============================================

async def run_daily_wfh_tasks():
    """Run daily WFH-related tasks"""
    
    scheduler = WFHScheduler()
    
    logger.info("Starting daily WFH tasks...")
    
    # Send WFH reminders for tomorrow
    reminders_sent = await scheduler.send_wfh_reminders()
    logger.info(f"Sent {reminders_sent} WFH reminders")
    
    # Check for expired pending requests
    escalations_sent = await scheduler.check_expired_pending_requests()
    logger.info(f"Sent {escalations_sent} escalation notifications")
    
    # Auto-reject past requests
    auto_rejected = await scheduler.auto_reject_past_requests()
    logger.info(f"Auto-rejected {auto_rejected} past WFH requests")
    
    logger.info("Daily WFH tasks completed")

async def run_weekly_wfh_tasks():
    """Run weekly WFH-related tasks"""
    
    scheduler = WFHScheduler()
    
    logger.info("Starting weekly WFH tasks...")
    
    # Send weekly summary
    summaries_sent = await scheduler.send_weekly_wfh_summary()
    logger.info(f"Sent weekly WFH summary to {summaries_sent} users")
    
    logger.info("Weekly WFH tasks completed")

# ============================================
# MANUAL EXECUTION (for testing)
# ============================================

if __name__ == "__main__":
    import asyncio
    
    async def test_scheduler():
        print("Testing WFH Scheduler...")
        
        # Test daily tasks
        await run_daily_wfh_tasks()
        
        # Test weekly tasks
        await run_weekly_wfh_tasks()
        
        print("WFH Scheduler test completed")
    
    asyncio.run(test_scheduler())