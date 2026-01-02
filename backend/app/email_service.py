"""
Email Service for Recruitment System
Handles all email notifications and templates
"""
from typing import Dict, List, Optional
from datetime import datetime
import re

class EmailService:
    """
    Email service for sending recruitment-related emails
    In production, integrate with SendGrid, AWS SES, or similar
    """
    
    def __init__(self):
        self.from_email = "noreply@company.com"
        self.from_name = "Company Recruitment Team"
        self.company_name = "Your Company"
    
    def render_template(self, template: str, variables: Dict[str, str]) -> str:
        """Replace template variables with actual values"""
        rendered = template
        for key, value in variables.items():
            placeholder = f"{{{{{key}}}}}"
            rendered = rendered.replace(placeholder, str(value))
        return rendered
    
    async def send_application_received(
        self,
        candidate_email: str,
        candidate_name: str,
        job_title: str,
        application_id: int
    ) -> bool:
        """Send confirmation email when application is received"""
        
        variables = {
            "candidate_name": candidate_name,
            "job_title": job_title,
            "company_name": self.company_name,
            "tracking_url": f"https://yourcompany.com/track/{application_id}"
        }
        
        subject = f"Application Received - {job_title}"
        body = f"""
Dear {candidate_name},

Thank you for applying for the {job_title} position at {self.company_name}.

We have received your application and our team will review it shortly. 
You can track your application status at: {variables['tracking_url']}

We appreciate your interest in joining our team!

Best regards,
{self.company_name} Recruitment Team
        """
        
        return await self._send_email(candidate_email, subject, body)
    
    async def send_interview_scheduled(
        self,
        candidate_email: str,
        candidate_name: str,
        job_title: str,
        interview_date: str,
        interview_time: str,
        meeting_link: str,
        interviewers: List[str],
        duration: int = 60
    ) -> bool:
        """Send interview invitation email"""
        
        interviewers_str = ", ".join(interviewers)
        
        subject = f"Interview Scheduled - {job_title}"
        body = f"""
Dear {candidate_name},

Great news! We would like to invite you for an interview for the {job_title} position.

Interview Details:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📅 Date: {interview_date}
🕐 Time: {interview_time}
⏱️  Duration: {duration} minutes
👥 Interviewers: {interviewers_str}
🔗 Meeting Link: {meeting_link}

Please join the meeting at the scheduled time. We recommend joining 5 minutes early to test your audio and video.

Tips for the interview:
• Test your internet connection beforehand
• Find a quiet, well-lit space
• Have a copy of your resume handy
• Prepare questions about the role

If you need to reschedule, please let us know at least 24 hours in advance.

We look forward to speaking with you!

Best regards,
{self.company_name} Recruitment Team
        """
        
        return await self._send_email(candidate_email, subject, body)
    
    async def send_offer_letter(
        self,
        candidate_email: str,
        candidate_name: str,
        job_title: str,
        salary: str,
        start_date: str,
        offer_link: str,
        offer_expiry_date: str
    ) -> bool:
        """Send job offer email"""
        
        subject = f"🎉 Job Offer - {job_title}"
        body = f"""
Dear {candidate_name},

Congratulations! 🎊

We are thrilled to extend an offer for the {job_title} position at {self.company_name}.

Offer Highlights:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💰 Base Salary: {salary}
📅 Start Date: {start_date}
📍 Location: Remote/Hybrid

Please review the complete offer letter and sign it by {offer_expiry_date}.

👉 View and Sign Your Offer: {offer_link}

What's Next?
1. Review the offer letter carefully
2. Sign electronically through the link above
3. Our team will reach out regarding next steps

We are excited about the possibility of you joining our team!

If you have any questions, please don't hesitate to reach out.

Best regards,
{self.company_name} Recruitment Team
        """
        
        return await self._send_email(candidate_email, subject, body)
    
    async def send_rejection(
        self,
        candidate_email: str,
        candidate_name: str,
        job_title: str,
        feedback: Optional[str] = None
    ) -> bool:
        """Send rejection email"""
        
        subject = f"Application Status Update - {job_title}"
        
        feedback_section = ""
        if feedback:
            feedback_section = f"\n\nFeedback:\n{feedback}\n"
        
        body = f"""
Dear {candidate_name},

Thank you for your interest in the {job_title} position at {self.company_name} and for taking the time to go through our interview process.

After careful consideration, we have decided to move forward with other candidates whose qualifications more closely match our current needs.
{feedback_section}
We were impressed by your background and encourage you to apply for future opportunities that match your skills and experience.

You can view other open positions at: https://yourcompany.com/careers

We wish you the best in your job search and future endeavors.

Best regards,
{self.company_name} Recruitment Team
        """
        
        return await self._send_email(candidate_email, subject, body)
    
    async def send_stage_update(
        self,
        candidate_email: str,
        candidate_name: str,
        job_title: str,
        new_stage: str,
        message: Optional[str] = None
    ) -> bool:
        """Send application stage update email"""
        
        stage_messages = {
            "screening": "Your application is currently being reviewed by our team.",
            "assessment": "You've been selected for the technical assessment phase.",
            "interview": "You've been shortlisted for interviews!",
            "offer": "We're preparing an offer for you!",
            "hired": "Welcome to the team!"
        }
        
        default_message = stage_messages.get(new_stage, "Your application status has been updated.")
        final_message = message or default_message
        
        subject = f"Application Update - {job_title}"
        body = f"""
Dear {candidate_name},

We wanted to update you on your application for the {job_title} position.

Status: {new_stage.upper()}

{final_message}

You can track your application progress at: https://yourcompany.com/track

Thank you for your patience and interest in {self.company_name}.

Best regards,
{self.company_name} Recruitment Team
        """
        
        return await self._send_email(candidate_email, subject, body)
    
    async def send_reminder(
        self,
        candidate_email: str,
        candidate_name: str,
        reminder_type: str,
        details: Dict[str, str]
    ) -> bool:
        """Send reminder emails (interview, assessment, document upload, etc.)"""
        
        if reminder_type == "interview":
            subject = f"⏰ Interview Reminder - Tomorrow at {details.get('time')}"
            body = f"""
Dear {candidate_name},

This is a friendly reminder about your interview tomorrow!

Interview Details:
📅 Date: {details.get('date')}
🕐 Time: {details.get('time')}
🔗 Link: {details.get('link')}

See you tomorrow!

Best regards,
{self.company_name} Recruitment Team
            """
        elif reminder_type == "assessment":
            subject = "⏰ Assessment Pending"
            body = f"""
Dear {candidate_name},

You have a pending technical assessment that needs to be completed.

Assessment Link: {details.get('link')}
Deadline: {details.get('deadline')}

Please complete it at your earliest convenience.

Best regards,
{self.company_name} Recruitment Team
            """
        else:
            subject = "Reminder"
            body = f"Dear {candidate_name},\n\n{details.get('message', 'You have a pending action.')}"
        
        return await self._send_email(candidate_email, subject, body)
    
    async def send_bulk_update(
        self,
        recipients: List[Dict[str, str]],
        subject: str,
        body_template: str
    ) -> Dict[str, int]:
        """Send bulk emails to multiple candidates"""
        
        results = {"sent": 0, "failed": 0}
        
        for recipient in recipients:
            body = self.render_template(body_template, recipient)
            success = await self._send_email(
                recipient.get("email"),
                subject,
                body
            )
            if success:
                results["sent"] += 1
            else:
                results["failed"] += 1
        
        return results
    
    async def _send_email(
        self,
        to_email: str,
        subject: str,
        body: str,
        attachments: Optional[List[str]] = None
    ) -> bool:
        """
        Internal method to send email
        In production, integrate with actual email service
        """
        
        # TODO: Integrate with SendGrid, AWS SES, or similar
        # For now, just log the email
        
        print("=" * 60)
        print("📧 EMAIL SENT")
        print("=" * 60)
        print(f"To: {to_email}")
        print(f"From: {self.from_name} <{self.from_email}>")
        print(f"Subject: {subject}")
        print("-" * 60)
        print(body)
        print("=" * 60)
        
        # In production:
        # try:
        #     response = sendgrid_client.send(message)
        #     return response.status_code == 202
        # except Exception as e:
        #     print(f"Email send failed: {e}")
        #     return False
        
        return True
    
    def validate_email(self, email: str) -> bool:
        """Validate email format"""
        pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        return re.match(pattern, email) is not None


    async def send_candidate_credentials(
        self,
        candidate_email: str,
        candidate_name: str,
        job_title: str,
        login_email: str,
        temporary_password: str,
        login_url: str
    ) -> bool:
        """Send login credentials to candidate"""
        
        subject = f"Your Login Credentials - {job_title} Assessment"
        body = f"""
Dear {candidate_name},

Congratulations! You have been shortlisted for the {job_title} position.

To proceed with the next steps, please use the following credentials to log in:

Login URL: {login_url}
Email: {login_email}
Temporary Password: {temporary_password}

IMPORTANT: Please change your password after first login.

Next Steps:
1. Log in using the credentials above
2. Complete the online assessment/exam
3. Complete the AI video interview
4. Wait for further instructions

If you have any questions, please contact our recruitment team.

Best regards,
{self.company_name} Recruitment Team
        """
        
        print(f"[EMAIL] Sending credentials to {candidate_email}")
        print(f"Subject: {subject}")
        print(f"Body:\n{body}")
        
        # In production, use actual email service
        # Example: SendGrid, AWS SES, etc.
        return True
    
    async def send_ai_interview_invitation(
        self,
        candidate_email: str,
        candidate_name: str,
        job_title: str,
        interview_link: str
    ) -> bool:
        """Send AI interview invitation"""
        
        subject = f"AI Interview Ready - {job_title}"
        body = f"""
Dear {candidate_name},

Great job completing the assessment!

Your AI video interview is now ready. Please complete it at your earliest convenience.

Interview Link: {interview_link}

Instructions:
1. Ensure you have a working webcam and microphone
2. Find a quiet place with good lighting
3. The interview will take approximately 20-30 minutes
4. Answer each question thoughtfully
5. You can take a moment to think before answering

Tips:
- Speak clearly and maintain eye contact with the camera
- Be yourself and answer honestly
- Take your time - there's no rush

Best regards,
{self.company_name} Recruitment Team
        """
        
        print(f"[EMAIL] Sending AI interview invitation to {candidate_email}")
        print(f"Subject: {subject}")
        print(f"Body:\n{body}")
        
        return True
    
    async def send_interview_scheduled(
        self,
        candidate_email: str,
        candidate_name: str,
        job_title: str,
        interview_date: str,
        interview_time: str,
        meeting_link: str,
        interviewer_name: str
    ) -> bool:
        """Send face-to-face interview schedule"""
        
        subject = f"Interview Scheduled - {job_title}"
        body = f"""
Dear {candidate_name},

Congratulations! Based on your excellent performance, we would like to invite you for a face-to-face interview.

Interview Details:
Position: {job_title}
Date: {interview_date}
Time: {interview_time}
Interviewer: {interviewer_name}
Meeting Link: {meeting_link}

Please join the meeting 5 minutes early.

What to Prepare:
- Review the job description
- Prepare questions about the role and company
- Have your resume handy
- Test your internet connection and camera

We look forward to speaking with you!

Best regards,
{self.company_name} Recruitment Team
        """
        
        print(f"[EMAIL] Sending interview schedule to {candidate_email}")
        print(f"Subject: {subject}")
        print(f"Body:\n{body}")
        
        return True


# Global email service instance
email_service = EmailService()
