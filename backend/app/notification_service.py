"""
Multi-Channel Notification Service
Supports: Email, SMS, WhatsApp
"""
import os
from typing import Optional, List
from datetime import datetime
from sqlalchemy.orm import Session
from app import models
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

# ============================================
# CONFIGURATION
# ============================================

# Email Configuration (from existing email_service.py)
SMTP_SERVER = os.getenv("SMTP_SERVER", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USERNAME = os.getenv("SMTP_USERNAME", "")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
FROM_EMAIL = os.getenv("FROM_EMAIL", "noreply@company.com")

# Twilio Configuration (for SMS)
TWILIO_ACCOUNT_SID = os.getenv("TWILIO_ACCOUNT_SID", "")
TWILIO_AUTH_TOKEN = os.getenv("TWILIO_AUTH_TOKEN", "")
TWILIO_PHONE_NUMBER = os.getenv("TWILIO_PHONE_NUMBER", "")

# WhatsApp Configuration (Twilio WhatsApp or WhatsApp Business API)
WHATSAPP_API_KEY = os.getenv("WHATSAPP_API_KEY", "")
WHATSAPP_PHONE_NUMBER = os.getenv("WHATSAPP_PHONE_NUMBER", "")

# ============================================
# NOTIFICATION SERVICE CLASS
# ============================================

class NotificationService:
    
    def __init__(self, db: Session):
        self.db = db
    
    # ========================================
    # EMAIL NOTIFICATIONS
    # ========================================
    
    async def send_email(
        self,
        to_email: str,
        subject: str,
        body: str,
        html_body: Optional[str] = None
    ) -> bool:
        """Send email notification"""
        
        try:
            msg = MIMEMultipart('alternative')
            msg['From'] = FROM_EMAIL
            msg['To'] = to_email
            msg['Subject'] = subject
            
            # Add plain text
            msg.attach(MIMEText(body, 'plain'))
            
            # Add HTML if provided
            if html_body:
                msg.attach(MIMEText(html_body, 'html'))
            
            # Send email
            with smtplib.SMTP(SMTP_SERVER, SMTP_PORT) as server:
                server.starttls()
                if SMTP_USERNAME and SMTP_PASSWORD:
                    server.login(SMTP_USERNAME, SMTP_PASSWORD)
                server.send_message(msg)
            
            # Log notification
            self._log_notification(
                user_email=to_email,
                type="email",
                subject=subject,
                message=body,
                status="sent"
            )
            
            return True
            
        except Exception as e:
            # Log failed notification
            self._log_notification(
                user_email=to_email,
                type="email",
                subject=subject,
                message=body,
                status="failed",
                error_message=str(e)
            )
            return False
    
    # ========================================
    # SMS NOTIFICATIONS (Twilio)
    # ========================================
    
    async def send_sms(
        self,
        to_phone: str,
        message: str
    ) -> bool:
        """Send SMS notification via Twilio"""
        
        if not TWILIO_ACCOUNT_SID or not TWILIO_AUTH_TOKEN:
            print("Twilio credentials not configured")
            return False
        
        try:
            # Import Twilio client (install: pip install twilio)
            from twilio.rest import Client
            
            client = Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
            
            message_obj = client.messages.create(
                body=message,
                from_=TWILIO_PHONE_NUMBER,
                to=to_phone
            )
            
            # Log notification
            self._log_notification(
                user_phone=to_phone,
                type="sms",
                subject="SMS Notification",
                message=message,
                status="sent"
            )
            
            return True
            
        except Exception as e:
            # Log failed notification
            self._log_notification(
                user_phone=to_phone,
                type="sms",
                subject="SMS Notification",
                message=message,
                status="failed",
                error_message=str(e)
            )
            return False
    
    # ========================================
    # WHATSAPP NOTIFICATIONS
    # ========================================
    
    async def send_whatsapp(
        self,
        to_whatsapp: str,
        message: str
    ) -> bool:
        """Send WhatsApp notification via Twilio WhatsApp API"""
        
        if not TWILIO_ACCOUNT_SID or not TWILIO_AUTH_TOKEN:
            print("Twilio credentials not configured")
            return False
        
        try:
            # Import Twilio client
            from twilio.rest import Client
            
            client = Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
            
            # WhatsApp numbers must be in format: whatsapp:+1234567890
            if not to_whatsapp.startswith("whatsapp:"):
                to_whatsapp = f"whatsapp:{to_whatsapp}"
            
            from_whatsapp = f"whatsapp:{WHATSAPP_PHONE_NUMBER}"
            
            message_obj = client.messages.create(
                body=message,
                from_=from_whatsapp,
                to=to_whatsapp
            )
            
            # Log notification
            self._log_notification(
                user_phone=to_whatsapp,
                type="whatsapp",
                subject="WhatsApp Notification",
                message=message,
                status="sent"
            )
            
            return True
            
        except Exception as e:
            # Log failed notification
            self._log_notification(
                user_phone=to_whatsapp,
                type="whatsapp",
                subject="WhatsApp Notification",
                message=message,
                status="failed",
                error_message=str(e)
            )
            return False
    
    # ========================================
    # SMART NOTIFICATION (Multi-Channel)
    # ========================================
    
    async def send_notification(
        self,
        user_id: int,
        subject: str,
        message: str,
        channels: List[str] = ["email"]  # email, sms, whatsapp
    ) -> dict:
        """Send notification via multiple channels based on user preferences"""
        
        # Get user preferences
        user = self.db.query(models.User).filter(models.User.id == user_id).first()
        if not user:
            return {"success": False, "error": "User not found"}
        
        prefs = self.db.query(models.NotificationPreference).filter(
            models.NotificationPreference.user_id == user_id
        ).first()
        
        results = {}
        
        # Email
        if "email" in channels and (not prefs or prefs.email_enabled):
            results["email"] = await self.send_email(
                to_email=user.email,
                subject=subject,
                body=message
            )
        
        # SMS
        if "sms" in channels and prefs and prefs.sms_enabled and prefs.phone_number:
            results["sms"] = await self.send_sms(
                to_phone=prefs.phone_number,
                message=f"{subject}\n\n{message}"
            )
        
        # WhatsApp
        if "whatsapp" in channels and prefs and prefs.whatsapp_enabled and prefs.whatsapp_number:
            results["whatsapp"] = await self.send_whatsapp(
                to_whatsapp=prefs.whatsapp_number,
                message=f"*{subject}*\n\n{message}"
            )
        
        return {
            "success": any(results.values()),
            "channels": results
        }
    
    # ========================================
    # RECRUITMENT-SPECIFIC NOTIFICATIONS
    # ========================================
    
    async def notify_application_received(
        self,
        application_id: int
    ):
        """Notify candidate that application was received"""
        
        app = self.db.query(models.Application).filter(
            models.Application.id == application_id
        ).first()
        
        if not app:
            return
        
        subject = f"Application Received - {app.job.title}"
        message = f"""
Dear {app.candidate_name},

Thank you for applying for the position of {app.job.title} at our company.

We have received your application and our recruitment team will review it shortly.

You will be notified about the next steps within 3-5 business days.

Application ID: {app.id}

Best regards,
Recruitment Team
        """.strip()
        
        # Send email
        await self.send_email(
            to_email=app.candidate_email,
            subject=subject,
            body=message
        )
        
        # Send WhatsApp if phone available
        if app.phone:
            whatsapp_msg = f"Hi {app.candidate_name}, your application for {app.job.title} has been received. Application ID: {app.id}"
            await self.send_whatsapp(to_whatsapp=app.phone, message=whatsapp_msg)
    
    async def notify_hr_new_application(
        self,
        application_id: int
    ):
        """Notify HR/Admin about new job application with detailed information"""
        
        app = self.db.query(models.Application).filter(
            models.Application.id == application_id
        ).first()
        
        if not app:
            return
        
        # Get all HR and Admin users
        hr_users = self.db.query(models.User).filter(
            models.User.role.in_(['hr', 'admin']),
            models.User.is_active == True
        ).all()
        
        for hr_user in hr_users:
            subject = f"🔔 New Application Alert - {app.job.title}"
            
            # Create detailed HTML email
            html_message = f"""
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0;">
                    <h2 style="margin: 0;">🎯 New Job Application Received</h2>
                </div>
                
                <div style="background: #f8f9fa; padding: 20px; border-radius: 0 0 8px 8px;">
                    <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 15px;">
                        <h3 style="color: #333; margin-top: 0;">📋 Application Details</h3>
                        <table style="width: 100%; border-collapse: collapse;">
                            <tr><td style="padding: 8px 0; font-weight: bold;">Position:</td><td>{app.job.title}</td></tr>
                            <tr><td style="padding: 8px 0; font-weight: bold;">Candidate:</td><td>{app.candidate_name}</td></tr>
                            <tr><td style="padding: 8px 0; font-weight: bold;">Email:</td><td>{app.candidate_email}</td></tr>
                            <tr><td style="padding: 8px 0; font-weight: bold;">Phone:</td><td>{app.phone or 'Not provided'}</td></tr>
                            <tr><td style="padding: 8px 0; font-weight: bold;">Source:</td><td>{app.source or 'Direct'}</td></tr>
                            <tr><td style="padding: 8px 0; font-weight: bold;">Applied:</td><td>{app.applied_date.strftime('%B %d, %Y at %I:%M %p')}</td></tr>
                            <tr><td style="padding: 8px 0; font-weight: bold;">AI Fit Score:</td><td>{app.ai_fit_score or 'N/A'}%</td></tr>
                        </table>
                    </div>
                    
                    <div style="background: white; padding: 20px; border-radius: 8px;">
                        <h3 style="color: #333; margin-top: 0;">🚀 Quick Actions</h3>
                        <p>Review this application in your recruitment dashboard:</p>
                        <a href="https://yourapp.com/recruitment" style="background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block; margin-right: 10px;">View Application</a>
                        <a href="https://yourapp.com/recruitment/applications/{app.id}" style="background: #28a745; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">Review Details</a>
                    </div>
                </div>
            </div>
            """
            
            plain_message = f"""
New job application received:

Position: {app.job.title}
Candidate: {app.candidate_name}
Email: {app.candidate_email}
Phone: {app.phone or 'Not provided'}
Source: {app.source or 'Direct'}
Applied: {app.applied_date.strftime('%B %d, %Y at %I:%M %p')}
AI Fit Score: {app.ai_fit_score or 'N/A'}%

Review the application in the recruitment dashboard:
https://yourapp.com/recruitment
            """.strip()
            
            # Send email notification
            await self.send_email(
                to_email=hr_user.email,
                subject=subject,
                body=plain_message,
                html_body=html_message
            )
            
            # Create in-app notification
            await self.create_in_app_notification(
                user_id=hr_user.id,
                title="New Application Received",
                message=f"New application for {app.job.title} from {app.candidate_name}",
                type="application",
                action_url=f"/recruitment/applications/{app.id}",
                notification_data={
                    "application_id": app.id,
                    "job_id": app.job_id,
                    "candidate_name": app.candidate_name,
                    "job_title": app.job.title
                }
            )
    
    async def create_in_app_notification(
        self,
        user_id: int,
        title: str,
        message: str,
        type: str = "info",
        action_url: str = None,
        notification_data: dict = None
    ):
        """Create in-app notification for real-time updates"""
        
        notification = models.InAppNotification(
            user_id=user_id,
            title=title,
            message=message,
            type=type,
            action_url=action_url,
            notification_data=notification_data,
            is_read=False
        )
        
        self.db.add(notification)
        self.db.commit()
        self.db.refresh(notification)
        
        # Here you would typically emit a WebSocket event for real-time updates
        # await self.emit_real_time_notification(user_id, notification)
        
        return notification
    
    async def notify_application_status_change(
        self,
        application_id: int,
        old_status: str,
        new_status: str,
        changed_by_user_id: int = None
    ):
        """Enhanced notification for application status changes"""
        
        app = self.db.query(models.Application).filter(
            models.Application.id == application_id
        ).first()
        
        if not app:
            return
        
        # Notify candidate
        await self.notify_status_change(application_id, new_status)
        
        # Notify HR/Admin about status change
        hr_users = self.db.query(models.User).filter(
            models.User.role.in_(['hr', 'admin']),
            models.User.is_active == True
        ).all()
        
        changed_by = None
        if changed_by_user_id:
            changed_by = self.db.query(models.User).filter(models.User.id == changed_by_user_id).first()
        
        for hr_user in hr_users:
            if hr_user.id == changed_by_user_id:  # Don't notify the person who made the change
                continue
                
            await self.create_in_app_notification(
                user_id=hr_user.id,
                title="Application Status Updated",
                message=f"{app.candidate_name}'s application for {app.job.title} moved from {old_status} to {new_status}",
                type="status_change",
                action_url=f"/recruitment/applications/{app.id}",
                notification_data={
                    "application_id": app.id,
                    "old_status": old_status,
                    "new_status": new_status,
                    "changed_by": changed_by.full_name if changed_by else "System"
                }
            )
    
    async def send_bulk_application_alerts(self):
        """Send daily/weekly summary of applications to HR"""
        
        from datetime import datetime, timedelta
        
        # Get applications from last 24 hours
        yesterday = datetime.utcnow() - timedelta(days=1)
        recent_applications = self.db.query(models.Application).filter(
            models.Application.applied_date >= yesterday
        ).all()
        
        if not recent_applications:
            return
        
        # Get HR users
        hr_users = self.db.query(models.User).filter(
            models.User.role.in_(['hr', 'admin']),
            models.User.is_active == True
        ).all()
        
        # Group applications by job
        job_applications = {}
        for app in recent_applications:
            job_title = app.job.title if app.job else "Unknown Position"
            if job_title not in job_applications:
                job_applications[job_title] = []
            job_applications[job_title].append(app)
        
        for hr_user in hr_users:
            subject = f"📊 Daily Application Summary - {len(recent_applications)} New Applications"
            
            html_message = f"""
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background: linear-gradient(135deg, #28a745 0%, #20c997 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0;">
                    <h2 style="margin: 0;">📊 Daily Application Summary</h2>
                    <p style="margin: 10px 0 0 0; opacity: 0.9;">{datetime.now().strftime('%B %d, %Y')}</p>
                </div>
                
                <div style="background: #f8f9fa; padding: 20px; border-radius: 0 0 8px 8px;">
                    <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 15px;">
                        <h3 style="color: #333; margin-top: 0;">🎯 {len(recent_applications)} New Applications Received</h3>
            """
            
            for job_title, apps in job_applications.items():
                html_message += f"""
                        <div style="border-left: 4px solid #007bff; padding-left: 15px; margin: 15px 0;">
                            <h4 style="color: #007bff; margin: 0 0 10px 0;">{job_title} ({len(apps)} applications)</h4>
                """
                
                for app in apps:
                    html_message += f"""
                            <div style="background: #f8f9fa; padding: 10px; margin: 5px 0; border-radius: 4px;">
                                <strong>{app.candidate_name}</strong> - {app.candidate_email}<br>
                                <small>Applied: {app.applied_date.strftime('%I:%M %p')} | Score: {app.ai_fit_score or 'N/A'}%</small>
                            </div>
                    """
                
                html_message += "</div>"
            
            html_message += f"""
                    </div>
                    
                    <div style="background: white; padding: 20px; border-radius: 8px;">
                        <a href="https://yourapp.com/recruitment" style="background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">Review All Applications</a>
                    </div>
                </div>
            </div>
            """
            
            plain_message = f"""
Daily Application Summary - {datetime.now().strftime('%B %d, %Y')}

{len(recent_applications)} new applications received in the last 24 hours:

"""
            
            for job_title, apps in job_applications.items():
                plain_message += f"\n{job_title} ({len(apps)} applications):\n"
                for app in apps:
                    plain_message += f"  • {app.candidate_name} ({app.candidate_email}) - Score: {app.ai_fit_score or 'N/A'}%\n"
            
            plain_message += f"\nReview all applications: https://yourapp.com/recruitment"
            
            await self.send_email(
                to_email=hr_user.email,
                subject=subject,
                body=plain_message,
                html_body=html_message
            )
    
    async def notify_interview_scheduled(
        self,
        interview_id: int
    ):
        """Notify candidate about scheduled interview"""
        
        interview = self.db.query(models.Interview).filter(
            models.Interview.id == interview_id
        ).first()
        
        if not interview:
            return
        
        app = interview.application
        
        subject = f"Interview Scheduled - {app.job.title}"
        message = f"""
Dear {app.candidate_name},

Your interview for the position of {app.job.title} has been scheduled.

Date & Time: {interview.scheduled_time.strftime("%B %d, %Y at %I:%M %p")}
Meeting Link: {interview.meeting_link or "Will be shared shortly"}

Please join the meeting 5 minutes early.

Best regards,
Recruitment Team
        """.strip()
        
        # Send email
        await self.send_email(
            to_email=app.candidate_email,
            subject=subject,
            body=message
        )
        
        # Send WhatsApp reminder
        if app.phone:
            whatsapp_msg = f"Hi {app.candidate_name}, your interview for {app.job.title} is scheduled on {interview.scheduled_time.strftime('%b %d at %I:%M %p')}. Meeting link: {interview.meeting_link}"
            await self.send_whatsapp(to_whatsapp=app.phone, message=whatsapp_msg)
    
    async def notify_status_change(
        self,
        application_id: int,
        new_status: str
    ):
        """Notify candidate about application status change"""
        
        app = self.db.query(models.Application).filter(
            models.Application.id == application_id
        ).first()
        
        if not app:
            return
        
        status_messages = {
            "screening": "Your application is under review by our recruitment team.",
            "assessment": "You have been shortlisted for the assessment round.",
            "interview": "Congratulations! You have been shortlisted for the interview.",
            "offer": "Great news! We would like to extend an offer to you.",
            "hired": "Welcome aboard! Your onboarding process will begin soon.",
            "rejected": "Thank you for your interest. Unfortunately, we are moving forward with other candidates."
        }
        
        subject = f"Application Update - {app.job.title}"
        message = f"""
Dear {app.candidate_name},

{status_messages.get(new_status, "Your application status has been updated.")}

Current Status: {new_status.upper()}

Application ID: {app.id}

Best regards,
Recruitment Team
        """.strip()
        
        # Send email
        await self.send_email(
            to_email=app.candidate_email,
            subject=subject,
            body=message
        )
    
    async def notify_document_upload_required(
        self,
        application_id: int,
        documents: List[str]
    ):
        """Notify candidate to upload required documents"""
        
        app = self.db.query(models.Application).filter(
            models.Application.id == application_id
        ).first()
        
        if not app:
            return
        
        doc_list = "\n".join([f"- {doc}" for doc in documents])
        
        subject = "Document Upload Required"
        message = f"""
Dear {app.candidate_name},

Please upload the following documents to proceed with your application:

{doc_list}

Upload Link: https://yourapp.com/candidate/upload/{app.id}

Best regards,
Recruitment Team
        """.strip()
        
        # Send email
        await self.send_email(
            to_email=app.candidate_email,
            subject=subject,
            body=message
        )
        
        # Send WhatsApp reminder
        if app.phone:
            whatsapp_msg = f"Hi {app.candidate_name}, please upload required documents for your application. Link: https://yourapp.com/candidate/upload/{app.id}"
            await self.send_whatsapp(to_whatsapp=app.phone, message=whatsapp_msg)
    
    # ========================================
    # WFH REQUEST NOTIFICATIONS
    # ========================================
    
    async def notify_wfh_request_submitted(self, wfh_request_id: int):
        """Notify employee that WFH request was submitted successfully"""
        
        wfh_request = self.db.query(models.WFHRequest).filter(
            models.WFHRequest.id == wfh_request_id
        ).first()
        
        if not wfh_request or not wfh_request.employee:
            return
        
        employee = wfh_request.employee
        user = employee.user
        
        subject = "WFH Request Submitted Successfully"
        message = f"""
Dear {employee.first_name} {employee.last_name},

Your Work From Home request has been submitted successfully and is pending approval.

Request Details:
- Date: {wfh_request.request_date.strftime('%B %d, %Y (%A)')}
- Reason: {wfh_request.reason}
- Status: PENDING APPROVAL
- Submitted: {wfh_request.created_at.strftime('%B %d, %Y at %I:%M %p')}

You will receive a notification once your manager reviews the request.

Best regards,
HR Team
        """.strip()
        
        # Send email notification
        await self.send_email(
            to_email=user.email,
            subject=subject,
            body=message
        )
        
        # Create in-app notification
        await self.create_in_app_notification(
            user_id=user.id,
            title="WFH Request Submitted",
            message=f"Your WFH request for {wfh_request.request_date.strftime('%B %d, %Y')} is pending approval",
            type="info",
            action_url="/dashboard/wfh-request",
            notification_data={
                "wfh_request_id": wfh_request.id,
                "request_date": wfh_request.request_date.isoformat(),
                "status": "pending"
            }
        )
    
    async def notify_wfh_request_pending_approval(self, wfh_request_id: int):
        """Notify managers/HR about pending WFH request"""
        
        wfh_request = self.db.query(models.WFHRequest).filter(
            models.WFHRequest.id == wfh_request_id
        ).first()
        
        if not wfh_request or not wfh_request.employee:
            return
        
        employee = wfh_request.employee
        
        # Get all managers, HR, and admin users
        approvers = self.db.query(models.User).filter(
            models.User.role.in_(['manager', 'hr', 'admin']),
            models.User.is_active == True
        ).all()
        
        for approver in approvers:
            subject = f"🏠 WFH Request Pending Approval - {employee.first_name} {employee.last_name}"
            
            html_message = f"""
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0;">
                    <h2 style="margin: 0;">🏠 WFH Request Pending Approval</h2>
                </div>
                
                <div style="background: #f8f9fa; padding: 20px; border-radius: 0 0 8px 8px;">
                    <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 15px;">
                        <h3 style="color: #333; margin-top: 0;">📋 Request Details</h3>
                        <table style="width: 100%; border-collapse: collapse;">
                            <tr><td style="padding: 8px 0; font-weight: bold;">Employee:</td><td>{employee.first_name} {employee.last_name}</td></tr>
                            <tr><td style="padding: 8px 0; font-weight: bold;">Department:</td><td>{employee.department or 'N/A'}</td></tr>
                            <tr><td style="padding: 8px 0; font-weight: bold;">Position:</td><td>{employee.position or 'N/A'}</td></tr>
                            <tr><td style="padding: 8px 0; font-weight: bold;">WFH Date:</td><td>{wfh_request.request_date.strftime('%B %d, %Y (%A)')}</td></tr>
                            <tr><td style="padding: 8px 0; font-weight: bold;">Reason:</td><td>{wfh_request.reason}</td></tr>
                            <tr><td style="padding: 8px 0; font-weight: bold;">Submitted:</td><td>{wfh_request.created_at.strftime('%B %d, %Y at %I:%M %p')}</td></tr>
                        </table>
                    </div>
                    
                    <div style="background: white; padding: 20px; border-radius: 8px;">
                        <h3 style="color: #333; margin-top: 0;">🚀 Quick Actions</h3>
                        <p>Review and approve/reject this WFH request:</p>
                        <a href="https://yourapp.com/dashboard/attendance" style="background: #28a745; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block; margin-right: 10px;">✅ Approve</a>
                        <a href="https://yourapp.com/dashboard/attendance" style="background: #dc3545; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">❌ Reject</a>
                    </div>
                </div>
            </div>
            """
            
            plain_message = f"""
WFH Request Pending Approval

Employee: {employee.first_name} {employee.last_name}
Department: {employee.department or 'N/A'}
Position: {employee.position or 'N/A'}
WFH Date: {wfh_request.request_date.strftime('%B %d, %Y (%A)')}
Reason: {wfh_request.reason}
Submitted: {wfh_request.created_at.strftime('%B %d, %Y at %I:%M %p')}

Please review and approve/reject this request in the attendance dashboard:
https://yourapp.com/dashboard/attendance
            """.strip()
            
            # Send email notification
            await self.send_email(
                to_email=approver.email,
                subject=subject,
                body=plain_message,
                html_body=html_message
            )
            
            # Create in-app notification
            await self.create_in_app_notification(
                user_id=approver.id,
                title="WFH Request Pending",
                message=f"{employee.first_name} {employee.last_name} requested WFH for {wfh_request.request_date.strftime('%B %d, %Y')}",
                type="warning",
                action_url="/dashboard/attendance",
                notification_data={
                    "wfh_request_id": wfh_request.id,
                    "employee_name": f"{employee.first_name} {employee.last_name}",
                    "request_date": wfh_request.request_date.isoformat(),
                    "reason": wfh_request.reason
                }
            )
    
    async def notify_wfh_request_decision(
        self, 
        wfh_request_id: int, 
        old_status: str, 
        new_status: str, 
        approved_by_user_id: int
    ):
        """Notify employee about WFH request approval/rejection"""
        
        wfh_request = self.db.query(models.WFHRequest).filter(
            models.WFHRequest.id == wfh_request_id
        ).first()
        
        if not wfh_request or not wfh_request.employee:
            return
        
        employee = wfh_request.employee
        user = employee.user
        
        # Get approver details
        approver = self.db.query(models.User).filter(
            models.User.id == approved_by_user_id
        ).first()
        
        approver_name = "Manager"
        if approver:
            # Try to get approver's employee profile for full name
            approver_employee = self.db.query(models.Employee).filter(
                models.Employee.user_id == approver.id
            ).first()
            if approver_employee:
                approver_name = f"{approver_employee.first_name} {approver_employee.last_name}"
            else:
                approver_name = approver.email.split('@')[0].title()
        
        is_approved = new_status == "approved"
        status_emoji = "✅" if is_approved else "❌"
        status_text = "APPROVED" if is_approved else "REJECTED"
        
        subject = f"{status_emoji} WFH Request {status_text} - {wfh_request.request_date.strftime('%B %d, %Y')}"
        
        # Create detailed message
        message = f"""
Dear {employee.first_name} {employee.last_name},

Your Work From Home request has been {status_text.lower()}.

Request Details:
- Date: {wfh_request.request_date.strftime('%B %d, %Y (%A)')}
- Reason: {wfh_request.reason}
- Status: {status_text}
- Reviewed by: {approver_name}
- Reviewed on: {wfh_request.reviewed_at.strftime('%B %d, %Y at %I:%M %p')}
"""
        
        if wfh_request.manager_comments:
            message += f"- Manager Comments: {wfh_request.manager_comments}\n"
        
        if is_approved:
            message += f"""
🎉 Great news! You can work from home on {wfh_request.request_date.strftime('%B %d, %Y')}.

Important reminders:
- Mark your attendance as usual on the WFH date
- Ensure you're available during working hours
- Maintain productivity and communication with your team

"""
        else:
            message += f"""
We understand this may be disappointing. Please reach out to your manager if you have any questions about this decision.

You can submit a new WFH request for a different date if needed.

"""
        
        message += """Best regards,
HR Team"""
        
        # Send email notification
        await self.send_email(
            to_email=user.email,
            subject=subject,
            body=message
        )
        
        # Send SMS/WhatsApp for urgent notifications
        notification_prefs = self.db.query(models.NotificationPreference).filter(
            models.NotificationPreference.user_id == user.id
        ).first()
        
        if notification_prefs:
            quick_message = f"WFH request for {wfh_request.request_date.strftime('%b %d')} has been {status_text.lower()} by {approver_name}"
            
            if notification_prefs.sms_enabled and notification_prefs.phone_number:
                await self.send_sms(
                    to_phone=notification_prefs.phone_number,
                    message=quick_message
                )
            
            if notification_prefs.whatsapp_enabled and notification_prefs.whatsapp_number:
                await self.send_whatsapp(
                    to_whatsapp=notification_prefs.whatsapp_number,
                    message=f"*WFH Update*\n\n{quick_message}"
                )
        
        # Create in-app notification
        notification_type = "success" if is_approved else "error"
        await self.create_in_app_notification(
            user_id=user.id,
            title=f"WFH Request {status_text.title()}",
            message=f"Your WFH request for {wfh_request.request_date.strftime('%B %d, %Y')} has been {status_text.lower()}",
            type=notification_type,
            action_url="/dashboard/wfh-request",
            notification_data={
                "wfh_request_id": wfh_request.id,
                "request_date": wfh_request.request_date.isoformat(),
                "status": new_status,
                "approved_by": approver_name,
                "manager_comments": wfh_request.manager_comments
            }
        )
    
    async def notify_wfh_reminder(self, wfh_request_id: int):
        """Send reminder to employee about approved WFH the day before"""
        
        wfh_request = self.db.query(models.WFHRequest).filter(
            models.WFHRequest.id == wfh_request_id,
            models.WFHRequest.status == "approved"
        ).first()
        
        if not wfh_request or not wfh_request.employee:
            return
        
        employee = wfh_request.employee
        user = employee.user
        
        subject = f"🏠 WFH Reminder - Tomorrow ({wfh_request.request_date.strftime('%B %d, %Y')})"
        message = f"""
Dear {employee.first_name} {employee.last_name},

This is a friendly reminder that you have approved Work From Home tomorrow.

WFH Date: {wfh_request.request_date.strftime('%B %d, %Y (%A)')}

Important reminders:
✅ Mark your attendance as usual (WFH mode will be automatically detected)
✅ Ensure stable internet connection for video calls
✅ Be available during regular working hours
✅ Keep your team informed about your availability

Have a productive day working from home!

Best regards,
HR Team
        """.strip()
        
        # Send email
        await self.send_email(
            to_email=user.email,
            subject=subject,
            body=message
        )
        
        # Send WhatsApp reminder if enabled
        notification_prefs = self.db.query(models.NotificationPreference).filter(
            models.NotificationPreference.user_id == user.id
        ).first()
        
        if notification_prefs and notification_prefs.whatsapp_enabled and notification_prefs.whatsapp_number:
            whatsapp_msg = f"🏠 *WFH Reminder*\n\nYou have approved WFH tomorrow ({wfh_request.request_date.strftime('%b %d, %Y')}). Don't forget to mark attendance!"
            await self.send_whatsapp(
                to_whatsapp=notification_prefs.whatsapp_number,
                message=whatsapp_msg
            )
    
    # ========================================
    # ATTENDANCE NOTIFICATIONS
    # ========================================
    
    async def notify_late_attendance_flagged(self, attendance_id: int):
        """Notify managers about late attendance that needs approval"""
        
        attendance = self.db.query(models.Attendance).filter(
            models.Attendance.id == attendance_id
        ).first()
        
        if not attendance or not attendance.employee:
            return
        
        employee = attendance.employee
        
        # Get managers/HR/admin
        approvers = self.db.query(models.User).filter(
            models.User.role.in_(['manager', 'hr', 'admin']),
            models.User.is_active == True
        ).all()
        
        for approver in approvers:
            subject = f"⏰ Late Attendance Alert - {employee.first_name} {employee.last_name}"
            
            message = f"""
Late attendance requires your approval:

Employee: {employee.first_name} {employee.last_name}
Department: {employee.department or 'N/A'}
Date: {attendance.date.strftime('%B %d, %Y')}
Check-in Time: {attendance.check_in.strftime('%I:%M %p')}
Work Mode: {attendance.work_mode.upper()}
Location: {attendance.location_address or 'N/A'}

Please review and approve/reject this attendance record.

Review Link: https://yourapp.com/dashboard/attendance
            """.strip()
            
            await self.send_email(
                to_email=approver.email,
                subject=subject,
                body=message
            )
            
            # Create in-app notification
            await self.create_in_app_notification(
                user_id=approver.id,
                title="Late Attendance Alert",
                message=f"{employee.first_name} {employee.last_name} checked in late at {attendance.check_in.strftime('%I:%M %p')}",
                type="warning",
                action_url="/dashboard/attendance",
                notification_data={
                    "attendance_id": attendance.id,
                    "employee_name": f"{employee.first_name} {employee.last_name}",
                    "check_in_time": attendance.check_in.isoformat(),
                    "work_mode": attendance.work_mode
                }
            )
    
    async def notify_attendance_approved_rejected(
        self, 
        attendance_id: int, 
        approved: bool, 
        approved_by_user_id: int,
        comments: str = None
    ):
        """Notify employee about attendance approval/rejection"""
        
        attendance = self.db.query(models.Attendance).filter(
            models.Attendance.id == attendance_id
        ).first()
        
        if not attendance or not attendance.employee:
            return
        
        employee = attendance.employee
        user = employee.user
        
        # Get approver details
        approver = self.db.query(models.User).filter(
            models.User.id == approved_by_user_id
        ).first()
        
        approver_name = "Manager"
        if approver:
            approver_employee = self.db.query(models.Employee).filter(
                models.Employee.user_id == approver.id
            ).first()
            if approver_employee:
                approver_name = f"{approver_employee.first_name} {approver_employee.last_name}"
        
        status_emoji = "✅" if approved else "❌"
        status_text = "APPROVED" if approved else "REJECTED"
        
        subject = f"{status_emoji} Attendance {status_text} - {attendance.date.strftime('%B %d, %Y')}"
        
        message = f"""
Dear {employee.first_name} {employee.last_name},

Your late attendance has been {status_text.lower()}.

Attendance Details:
- Date: {attendance.date.strftime('%B %d, %Y')}
- Check-in Time: {attendance.check_in.strftime('%I:%M %p')}
- Status: {status_text}
- Reviewed by: {approver_name}
"""
        
        if comments:
            message += f"- Manager Comments: {comments}\n"
        
        if not approved:
            message += f"\nThis attendance record has been marked as absent. Please contact your manager for further clarification.\n"
        
        message += "\nBest regards,\nHR Team"
        
        # Send email
        await self.send_email(
            to_email=user.email,
            subject=subject,
            body=message
        )
        
        # Create in-app notification
        notification_type = "success" if approved else "error"
        await self.create_in_app_notification(
            user_id=user.id,
            title=f"Attendance {status_text.title()}",
            message=f"Your attendance for {attendance.date.strftime('%B %d, %Y')} has been {status_text.lower()}",
            type=notification_type,
            action_url="/dashboard/attendance",
            notification_data={
                "attendance_id": attendance.id,
                "date": attendance.date.isoformat(),
                "status": status_text.lower(),
                "approved_by": approver_name,
                "comments": comments
            }
        )
    
    async def notify_missing_checkout_reported(self, attendance_id: int):
        """Notify managers about reported missing checkout"""
        
        attendance = self.db.query(models.Attendance).filter(
            models.Attendance.id == attendance_id
        ).first()
        
        if not attendance or not attendance.employee:
            return
        
        employee = attendance.employee
        
        # Get managers/HR/admin
        managers = self.db.query(models.User).filter(
            models.User.role.in_(['manager', 'hr', 'admin']),
            models.User.is_active == True
        ).all()
        
        for manager in managers:
            subject = f"📤 Missing Checkout Reported - {employee.first_name} {employee.last_name}"
            
            message = f"""
Missing checkout has been reported:

Employee: {employee.first_name} {employee.last_name}
Department: {employee.department or 'N/A'}
Date: {attendance.date.strftime('%B %d, %Y')}
Check-in Time: {attendance.check_in.strftime('%I:%M %p')}
Reason: {attendance.flagged_reason or 'No reason provided'}

Please review and approve/reject this attendance record.

Review Link: https://yourapp.com/dashboard/attendance
            """.strip()
            
            await self.send_email(
                to_email=manager.email,
                subject=subject,
                body=message
            )
            
            # Create in-app notification
            await self.create_in_app_notification(
                user_id=manager.id,
                title="Missing Checkout Reported",
                message=f"{employee.first_name} {employee.last_name} reported missing checkout for {attendance.date.strftime('%B %d, %Y')}",
                type="warning",
                action_url="/dashboard/attendance",
                notification_data={
                    "attendance_id": attendance.id,
                    "employee_name": f"{employee.first_name} {employee.last_name}",
                    "date": attendance.date.isoformat(),
                    "reason": attendance.flagged_reason
                }
            )

    # ========================================
    # HELPER METHODS
    # ========================================
    
    def _log_notification(
        self,
        user_email: Optional[str] = None,
        user_phone: Optional[str] = None,
        type: str = "email",
        subject: str = "",
        message: str = "",
        status: str = "sent",
        error_message: Optional[str] = None
    ):
        """Log notification to database"""
        
        # Find user by email or phone
        user_id = None
        if user_email:
            user = self.db.query(models.User).filter(models.User.email == user_email).first()
            if user:
                user_id = user.id
        
        log = models.NotificationLog(
            user_id=user_id,
            type=type,
            subject=subject,
            message=message,
            status=status,
            error_message=error_message
        )
        
        self.db.add(log)
        self.db.commit()

# ============================================
# SINGLETON INSTANCE
# ============================================

def get_notification_service(db: Session) -> NotificationService:
    """Get notification service instance"""
    return NotificationService(db)
