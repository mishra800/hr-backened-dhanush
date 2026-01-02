"""
Background Tasks for Notifications and Periodic Jobs
"""
import asyncio
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.notification_service import get_notification_service
from app import models
import logging

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class BackgroundTaskManager:
    def __init__(self):
        self.running = False
    
    async def start_periodic_tasks(self):
        """Start all periodic background tasks"""
        self.running = True
        
        # Start different periodic tasks
        tasks = [
            self.daily_application_summary(),
            self.weekly_recruitment_report(),
            self.cleanup_old_notifications(),
            self.check_stale_applications()
        ]
        
        await asyncio.gather(*tasks)
    
    async def stop_periodic_tasks(self):
        """Stop all periodic tasks"""
        self.running = False
    
    async def daily_application_summary(self):
        """Send daily application summary to HR at 9 AM"""
        while self.running:
            try:
                now = datetime.now()
                # Check if it's 9 AM
                if now.hour == 9 and now.minute == 0:
                    db = SessionLocal()
                    try:
                        notification_service = get_notification_service(db)
                        await notification_service.send_bulk_application_alerts()
                        logger.info("Daily application summary sent")
                    finally:
                        db.close()
                
                # Wait 1 minute before checking again
                await asyncio.sleep(60)
                
            except Exception as e:
                logger.error(f"Error in daily application summary: {e}")
                await asyncio.sleep(300)  # Wait 5 minutes on error
    
    async def weekly_recruitment_report(self):
        """Send weekly recruitment metrics every Monday at 10 AM"""
        while self.running:
            try:
                now = datetime.now()
                # Check if it's Monday 10 AM
                if now.weekday() == 0 and now.hour == 10 and now.minute == 0:
                    await self.send_weekly_report()
                    logger.info("Weekly recruitment report sent")
                
                # Wait 1 hour before checking again
                await asyncio.sleep(3600)
                
            except Exception as e:
                logger.error(f"Error in weekly recruitment report: {e}")
                await asyncio.sleep(3600)
    
    async def send_weekly_report(self):
        """Generate and send weekly recruitment report"""
        db = SessionLocal()
        try:
            # Get metrics for the past week
            week_ago = datetime.utcnow() - timedelta(days=7)
            
            # Applications this week
            weekly_applications = db.query(models.Application).filter(
                models.Application.applied_date >= week_ago
            ).all()
            
            # Group by job
            job_stats = {}
            for app in weekly_applications:
                job_title = app.job.title if app.job else "Unknown"
                if job_title not in job_stats:
                    job_stats[job_title] = {
                        "applications": 0,
                        "avg_score": 0,
                        "scores": []
                    }
                job_stats[job_title]["applications"] += 1
                if app.ai_fit_score:
                    job_stats[job_title]["scores"].append(app.ai_fit_score)
            
            # Calculate averages
            for job_title in job_stats:
                scores = job_stats[job_title]["scores"]
                if scores:
                    job_stats[job_title]["avg_score"] = round(sum(scores) / len(scores), 1)
            
            # Get HR users
            hr_users = db.query(models.User).filter(
                models.User.role.in_(['hr', 'admin']),
                models.User.is_active == True
            ).all()
            
            notification_service = get_notification_service(db)
            
            for hr_user in hr_users:
                subject = f"📊 Weekly Recruitment Report - {len(weekly_applications)} Applications"
                
                html_message = f"""
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <div style="background: linear-gradient(135deg, #6f42c1 0%, #e83e8c 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0;">
                        <h2 style="margin: 0;">📊 Weekly Recruitment Report</h2>
                        <p style="margin: 10px 0 0 0; opacity: 0.9;">Week of {week_ago.strftime('%B %d')} - {datetime.now().strftime('%B %d, %Y')}</p>
                    </div>
                    
                    <div style="background: #f8f9fa; padding: 20px; border-radius: 0 0 8px 8px;">
                        <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 15px;">
                            <h3 style="color: #333; margin-top: 0;">📈 Weekly Summary</h3>
                            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px;">
                                <div style="text-align: center; padding: 15px; background: #e3f2fd; border-radius: 8px;">
                                    <div style="font-size: 24px; font-weight: bold; color: #1976d2;">{len(weekly_applications)}</div>
                                    <div style="color: #666;">Total Applications</div>
                                </div>
                                <div style="text-align: center; padding: 15px; background: #e8f5e8; border-radius: 8px;">
                                    <div style="font-size: 24px; font-weight: bold; color: #388e3c;">{len(job_stats)}</div>
                                    <div style="color: #666;">Active Positions</div>
                                </div>
                            </div>
                        </div>
                        
                        <div style="background: white; padding: 20px; border-radius: 8px;">
                            <h3 style="color: #333; margin-top: 0;">🎯 Applications by Position</h3>
                """
                
                for job_title, stats in job_stats.items():
                    html_message += f"""
                            <div style="border-left: 4px solid #007bff; padding-left: 15px; margin: 15px 0;">
                                <h4 style="color: #007bff; margin: 0 0 5px 0;">{job_title}</h4>
                                <p style="margin: 0; color: #666;">{stats['applications']} applications • Avg Score: {stats['avg_score']}%</p>
                            </div>
                    """
                
                html_message += f"""
                        </div>
                    </div>
                </div>
                """
                
                plain_message = f"""
Weekly Recruitment Report
Week of {week_ago.strftime('%B %d')} - {datetime.now().strftime('%B %d, %Y')}

Summary:
- Total Applications: {len(weekly_applications)}
- Active Positions: {len(job_stats)}

Applications by Position:
"""
                
                for job_title, stats in job_stats.items():
                    plain_message += f"• {job_title}: {stats['applications']} applications (Avg Score: {stats['avg_score']}%)\n"
                
                plain_message += f"\nView detailed analytics: https://yourapp.com/analysis-enhanced"
                
                await notification_service.send_email(
                    to_email=hr_user.email,
                    subject=subject,
                    body=plain_message,
                    html_body=html_message
                )
                
        finally:
            db.close()
    
    async def cleanup_old_notifications(self):
        """Clean up old notifications (older than 30 days)"""
        while self.running:
            try:
                db = SessionLocal()
                try:
                    # Delete notifications older than 30 days
                    thirty_days_ago = datetime.utcnow() - timedelta(days=30)
                    
                    deleted_count = db.query(models.InAppNotification).filter(
                        models.InAppNotification.created_at < thirty_days_ago
                    ).delete()
                    
                    # Delete old notification logs (older than 90 days)
                    ninety_days_ago = datetime.utcnow() - timedelta(days=90)
                    
                    deleted_logs = db.query(models.NotificationLog).filter(
                        models.NotificationLog.sent_at < ninety_days_ago
                    ).delete()
                    
                    db.commit()
                    
                    if deleted_count > 0 or deleted_logs > 0:
                        logger.info(f"Cleaned up {deleted_count} old notifications and {deleted_logs} old logs")
                        
                finally:
                    db.close()
                
                # Run cleanup once per day
                await asyncio.sleep(86400)  # 24 hours
                
            except Exception as e:
                logger.error(f"Error in notification cleanup: {e}")
                await asyncio.sleep(3600)  # Wait 1 hour on error
    
    async def check_stale_applications(self):
        """Check for applications that haven't been updated in a while"""
        while self.running:
            try:
                db = SessionLocal()
                try:
                    # Check for applications in 'applied' status for more than 3 days
                    three_days_ago = datetime.utcnow() - timedelta(days=3)
                    
                    stale_applications = db.query(models.Application).filter(
                        models.Application.status == 'applied',
                        models.Application.applied_date <= three_days_ago
                    ).all()
                    
                    if stale_applications:
                        # Notify HR about stale applications
                        hr_users = db.query(models.User).filter(
                            models.User.role.in_(['hr', 'admin']),
                            models.User.is_active == True
                        ).all()
                        
                        notification_service = get_notification_service(db)
                        
                        for hr_user in hr_users:
                            # Create in-app notification
                            await notification_service.create_in_app_notification(
                                user_id=hr_user.id,
                                title="Stale Applications Alert",
                                message=f"{len(stale_applications)} applications have been pending review for 3+ days",
                                type="warning",
                                action_url="/recruitment",
                                notification_data={
                                    "stale_count": len(stale_applications),
                                    "applications": [app.id for app in stale_applications[:5]]  # First 5 IDs
                                }
                            )
                        
                        logger.info(f"Notified HR about {len(stale_applications)} stale applications")
                        
                finally:
                    db.close()
                
                # Check every 6 hours
                await asyncio.sleep(21600)
                
            except Exception as e:
                logger.error(f"Error checking stale applications: {e}")
                await asyncio.sleep(3600)

# Global instance
background_task_manager = BackgroundTaskManager()

# Function to start background tasks (call this from main.py)
async def start_background_tasks():
    """Start all background tasks"""
    await background_task_manager.start_periodic_tasks()

async def stop_background_tasks():
    """Stop all background tasks"""
    await background_task_manager.stop_periodic_tasks()