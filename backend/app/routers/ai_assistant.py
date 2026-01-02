from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_
from ..database import get_db
from ..models import *
from ..dependencies import get_current_user
from pydantic import BaseModel
from typing import List, Optional
import json
from datetime import datetime, timedelta
import re

router = APIRouter(prefix="/ai-assistant", tags=["AI Assistant"])

class ChatMessage(BaseModel):
    message: str

class ChatResponse(BaseModel):
    response: str
    data: Optional[dict] = None

class AIAssistantService:
    def __init__(self, db: Session, current_user: User):
        self.db = db
        self.current_user = current_user
        
    def get_employee_data(self):
        """Get current user's employee data"""
        return self.db.query(Employee).filter(Employee.user_id == self.current_user.id).first()
    
    def analyze_message(self, message: str) -> ChatResponse:
        """Analyze user message and provide contextual response"""
        message_lower = message.lower()
        
        # Leave related queries
        if any(word in message_lower for word in ['leave', 'vacation', 'holiday', 'time off', 'pto']):
            return self.handle_leave_queries(message_lower)
        
        # Payroll related queries
        elif any(word in message_lower for word in ['salary', 'payroll', 'pay', 'pf', 'provident fund', 'tax', 'ctc']):
            return self.handle_payroll_queries(message_lower)
        
        # Attendance related queries
        elif any(word in message_lower for word in ['attendance', 'check in', 'check out', 'wfh', 'work from home']):
            return self.handle_attendance_queries(message_lower)
        
        # Job/Recruitment related queries
        elif any(word in message_lower for word in ['job', 'position', 'hiring', 'recruitment', 'opening', 'vacancy']):
            return self.handle_job_queries(message_lower)
        
        # Employee related queries
        elif any(word in message_lower for word in ['employee', 'colleague', 'team', 'department']):
            return self.handle_employee_queries(message_lower)
        
        # Performance related queries
        elif any(word in message_lower for word in ['performance', 'review', 'rating', 'feedback', 'goal']):
            return self.handle_performance_queries(message_lower)
        
        # Learning related queries
        elif any(word in message_lower for word in ['course', 'training', 'learning', 'skill', 'certification']):
            return self.handle_learning_queries(message_lower)
        
        # Asset related queries
        elif any(word in message_lower for word in ['laptop', 'asset', 'equipment', 'device', 'monitor']):
            return self.handle_asset_queries(message_lower)
        
        # Announcement related queries
        elif any(word in message_lower for word in ['announcement', 'news', 'update', 'notice']):
            return self.handle_announcement_queries(message_lower)
        
        # General help
        else:
            return self.handle_general_queries(message_lower)
    
    def handle_leave_queries(self, message: str) -> ChatResponse:
        employee = self.get_employee_data()
        if not employee:
            return ChatResponse(response="I couldn't find your employee profile. Please contact HR.")
        
        # Get leave balance
        leave_balances = self.db.query(LeaveBalance).filter(LeaveBalance.employee_id == employee.id).all()
        
        # Get recent leave requests
        recent_leaves = self.db.query(LeaveRequest).filter(
            LeaveRequest.employee_id == employee.id
        ).order_by(LeaveRequest.created_at.desc()).limit(5).all()
        
        if 'balance' in message or 'remaining' in message:
            if leave_balances:
                balance_text = "Your current leave balances:\n"
                for balance in leave_balances:
                    balance_text += f"• {balance.leave_type}: {balance.balance} days\n"
                return ChatResponse(
                    response=balance_text,
                    data={"leave_balances": [{"type": lb.leave_type, "balance": lb.balance} for lb in leave_balances]}
                )
            else:
                return ChatResponse(response="No leave balance information found. Please contact HR.")
        
        elif 'status' in message or 'request' in message:
            if recent_leaves:
                status_text = "Your recent leave requests:\n"
                for leave in recent_leaves[:3]:
                    status_text += f"• {leave.start_date.strftime('%Y-%m-%d')} to {leave.end_date.strftime('%Y-%m-%d')}: {leave.status.title()}\n"
                return ChatResponse(
                    response=status_text,
                    data={"recent_leaves": [{"start_date": str(l.start_date), "end_date": str(l.end_date), "status": l.status} for l in recent_leaves[:3]]}
                )
            else:
                return ChatResponse(response="No recent leave requests found.")
        
        else:
            # General leave info
            total_balance = sum(lb.balance for lb in leave_balances) if leave_balances else 0
            return ChatResponse(
                response=f"You have {total_balance} total leave days remaining. You can apply for leave through the Leave section in your dashboard.",
                data={"total_balance": total_balance}
            )
    
    def handle_payroll_queries(self, message: str) -> ChatResponse:
        employee = self.get_employee_data()
        if not employee:
            return ChatResponse(response="I couldn't find your employee profile. Please contact HR.")
        
        # Get latest payroll
        latest_payroll = self.db.query(Payroll).filter(
            Payroll.employee_id == employee.id
        ).order_by(Payroll.payment_date.desc()).first()
        
        # Get salary structure
        salary_structure = self.db.query(SalaryStructure).filter(
            SalaryStructure.employee_id == employee.id
        ).order_by(SalaryStructure.effective_date.desc()).first()
        
        if 'pf' in message or 'provident fund' in message:
            if latest_payroll:
                return ChatResponse(
                    response=f"Your PF contribution for {latest_payroll.month} was ₹{latest_payroll.pf:,.2f}. The company contributes 12% of your basic salary to PF.",
                    data={"pf_amount": latest_payroll.pf, "month": latest_payroll.month}
                )
            else:
                return ChatResponse(response="No payroll information found. Please contact HR.")
        
        elif 'tax' in message:
            if latest_payroll:
                return ChatResponse(
                    response=f"Your tax deduction for {latest_payroll.month} was ₹{latest_payroll.tax:,.2f}.",
                    data={"tax_amount": latest_payroll.tax, "month": latest_payroll.month}
                )
            else:
                return ChatResponse(response="No tax information found. Please contact HR.")
        
        elif 'salary' in message or 'pay' in message:
            if latest_payroll:
                return ChatResponse(
                    response=f"Your net salary for {latest_payroll.month} was ₹{latest_payroll.net_salary:,.2f}. Basic: ₹{latest_payroll.basic_salary:,.2f}, Allowances: ₹{latest_payroll.allowances:,.2f}, Deductions: ₹{latest_payroll.deductions:,.2f}",
                    data={
                        "net_salary": latest_payroll.net_salary,
                        "basic_salary": latest_payroll.basic_salary,
                        "allowances": latest_payroll.allowances,
                        "deductions": latest_payroll.deductions,
                        "month": latest_payroll.month
                    }
                )
            else:
                return ChatResponse(response="No salary information found. Please contact HR.")
        
        else:
            if salary_structure:
                total_ctc = salary_structure.basic_salary + salary_structure.hra + salary_structure.other_allowances
                return ChatResponse(
                    response=f"Your current CTC is ₹{total_ctc:,.2f} annually. Basic: ₹{salary_structure.basic_salary:,.2f}, HRA: ₹{salary_structure.hra:,.2f}, Other Allowances: ₹{salary_structure.other_allowances:,.2f}",
                    data={
                        "total_ctc": total_ctc,
                        "basic_salary": salary_structure.basic_salary,
                        "hra": salary_structure.hra,
                        "other_allowances": salary_structure.other_allowances
                    }
                )
            else:
                return ChatResponse(response="No salary structure information found. Please contact HR.")
    
    def handle_attendance_queries(self, message: str) -> ChatResponse:
        employee = self.get_employee_data()
        if not employee:
            return ChatResponse(response="I couldn't find your employee profile. Please contact HR.")
        
        # Get recent attendance
        recent_attendance = self.db.query(Attendance).filter(
            Attendance.employee_id == employee.id
        ).order_by(Attendance.date.desc()).limit(10).all()
        
        if 'today' in message:
            today_attendance = self.db.query(Attendance).filter(
                and_(
                    Attendance.employee_id == employee.id,
                    func.date(Attendance.date) == datetime.now().date()
                )
            ).first()
            
            if today_attendance:
                check_in_time = today_attendance.check_in.strftime('%H:%M') if today_attendance.check_in else "Not checked in"
                check_out_time = today_attendance.check_out.strftime('%H:%M') if today_attendance.check_out else "Not checked out"
                return ChatResponse(
                    response=f"Today's attendance: Check-in: {check_in_time}, Check-out: {check_out_time}, Status: {today_attendance.status.title()}",
                    data={
                        "check_in": check_in_time,
                        "check_out": check_out_time,
                        "status": today_attendance.status,
                        "work_mode": today_attendance.work_mode
                    }
                )
            else:
                return ChatResponse(response="No attendance record found for today.")
        
        elif 'wfh' in message or 'work from home' in message:
            wfh_requests = self.db.query(WFHRequest).filter(
                WFHRequest.employee_id == employee.id
            ).order_by(WFHRequest.created_at.desc()).limit(5).all()
            
            if wfh_requests:
                wfh_text = "Your recent WFH requests:\n"
                for wfh in wfh_requests[:3]:
                    wfh_text += f"• {wfh.request_date.strftime('%Y-%m-%d')}: {wfh.status.title()}\n"
                return ChatResponse(
                    response=wfh_text,
                    data={"wfh_requests": [{"date": str(w.request_date), "status": w.status} for w in wfh_requests[:3]]}
                )
            else:
                return ChatResponse(response="No WFH requests found.")
        
        else:
            # General attendance summary
            if recent_attendance:
                present_days = len([a for a in recent_attendance if a.status == 'present'])
                return ChatResponse(
                    response=f"In the last {len(recent_attendance)} days, you were present for {present_days} days. Your current WFH status: {employee.wfh_status.title()}",
                    data={
                        "total_days": len(recent_attendance),
                        "present_days": present_days,
                        "wfh_status": employee.wfh_status
                    }
                )
            else:
                return ChatResponse(response="No attendance records found.")
    
    def handle_job_queries(self, message: str) -> ChatResponse:
        # Get active jobs
        active_jobs = self.db.query(Job).filter(Job.is_active == True).all()
        
        if 'python' in message or 'developer' in message:
            python_jobs = [job for job in active_jobs if 'python' in job.title.lower() or 'developer' in job.title.lower()]
            if python_jobs:
                job_text = f"Found {len(python_jobs)} Python/Developer positions:\n"
                for job in python_jobs[:3]:
                    job_text += f"• {job.title} - {job.department} ({job.location})\n"
                return ChatResponse(
                    response=job_text,
                    data={"jobs": [{"id": j.id, "title": j.title, "department": j.department, "location": j.location} for j in python_jobs[:3]]}
                )
            else:
                return ChatResponse(response="No Python/Developer positions currently available.")
        
        elif 'open' in message or 'available' in message:
            if active_jobs:
                return ChatResponse(
                    response=f"We have {len(active_jobs)} open positions across various departments. Check the Recruitment section for details.",
                    data={"total_jobs": len(active_jobs)}
                )
            else:
                return ChatResponse(response="No open positions currently available.")
        
        else:
            # Get recent applications if user has access
            if self.current_user.role in ['admin', 'hr', 'manager']:
                recent_applications = self.db.query(Application).order_by(Application.applied_date.desc()).limit(5).all()
                return ChatResponse(
                    response=f"Recent activity: {len(recent_applications)} new applications received. {len(active_jobs)} positions are currently open.",
                    data={
                        "recent_applications": len(recent_applications),
                        "open_positions": len(active_jobs)
                    }
                )
            else:
                return ChatResponse(response=f"There are {len(active_jobs)} open positions available. Visit the careers page to apply.")
    
    def handle_employee_queries(self, message: str) -> ChatResponse:
        if self.current_user.role not in ['admin', 'hr', 'manager']:
            return ChatResponse(response="You don't have permission to access employee information.")
        
        # Get employee count by department
        employee_stats = self.db.query(
            Employee.department, 
            func.count(Employee.id).label('count')
        ).group_by(Employee.department).all()
        
        if 'count' in message or 'total' in message:
            total_employees = sum(stat.count for stat in employee_stats)
            dept_text = f"Total employees: {total_employees}\nBy department:\n"
            for stat in employee_stats:
                dept_text += f"• {stat.department}: {stat.count}\n"
            return ChatResponse(
                response=dept_text,
                data={
                    "total_employees": total_employees,
                    "by_department": [{"department": s.department, "count": s.count} for s in employee_stats]
                }
            )
        
        else:
            total_employees = sum(stat.count for stat in employee_stats)
            return ChatResponse(
                response=f"We have {total_employees} employees across {len(employee_stats)} departments.",
                data={"total_employees": total_employees, "departments": len(employee_stats)}
            )
    
    def handle_performance_queries(self, message: str) -> ChatResponse:
        employee = self.get_employee_data()
        if not employee:
            return ChatResponse(response="I couldn't find your employee profile. Please contact HR.")
        
        # Get recent performance reviews
        reviews = self.db.query(PerformanceReview).filter(
            PerformanceReview.employee_id == employee.id
        ).order_by(PerformanceReview.review_date.desc()).limit(3).all()
        
        # Get goals
        goals = self.db.query(Goal).filter(Goal.employee_id == employee.id).all()
        
        if 'review' in message or 'rating' in message:
            if reviews:
                latest_review = reviews[0]
                return ChatResponse(
                    response=f"Your latest performance review: {latest_review.rating}/5.0 on {latest_review.review_date.strftime('%Y-%m-%d')}. {len(reviews)} total reviews on record.",
                    data={
                        "latest_rating": latest_review.rating,
                        "review_date": str(latest_review.review_date),
                        "total_reviews": len(reviews)
                    }
                )
            else:
                return ChatResponse(response="No performance reviews found.")
        
        elif 'goal' in message:
            if goals:
                completed_goals = len([g for g in goals if g.status == 'completed'])
                return ChatResponse(
                    response=f"You have {len(goals)} goals. {completed_goals} completed, {len(goals) - completed_goals} in progress.",
                    data={
                        "total_goals": len(goals),
                        "completed_goals": completed_goals,
                        "pending_goals": len(goals) - completed_goals
                    }
                )
            else:
                return ChatResponse(response="No goals found. Set some goals in the Performance section.")
        
        else:
            avg_rating = sum(r.rating for r in reviews) / len(reviews) if reviews else 0
            return ChatResponse(
                response=f"Performance summary: Average rating {avg_rating:.1f}/5.0 from {len(reviews)} reviews. {len(goals)} goals tracked.",
                data={
                    "average_rating": round(avg_rating, 1),
                    "total_reviews": len(reviews),
                    "total_goals": len(goals)
                }
            )
    
    def handle_learning_queries(self, message: str) -> ChatResponse:
        employee = self.get_employee_data()
        if not employee:
            return ChatResponse(response="I couldn't find your employee profile. Please contact HR.")
        
        # Get enrollments
        enrollments = self.db.query(Enrollment).filter(Enrollment.employee_id == employee.id).all()
        
        # Get available courses
        available_courses = self.db.query(Course).all()
        
        if 'progress' in message or 'enrolled' in message:
            if enrollments:
                progress_text = "Your course progress:\n"
                for enrollment in enrollments[:5]:
                    progress_text += f"• {enrollment.course.title}: {enrollment.progress}% complete\n"
                return ChatResponse(
                    response=progress_text,
                    data={"enrollments": [{"course": e.course.title, "progress": e.progress} for e in enrollments[:5]]}
                )
            else:
                return ChatResponse(response="You're not enrolled in any courses yet.")
        
        elif 'available' in message or 'course' in message:
            return ChatResponse(
                response=f"{len(available_courses)} courses available. You're enrolled in {len(enrollments)}. Check the Learning section to explore more.",
                data={
                    "available_courses": len(available_courses),
                    "enrolled_courses": len(enrollments)
                }
            )
        
        else:
            avg_progress = sum(e.progress for e in enrollments) / len(enrollments) if enrollments else 0
            return ChatResponse(
                response=f"Learning summary: {len(enrollments)} courses enrolled, {avg_progress:.1f}% average progress. {len(available_courses)} total courses available.",
                data={
                    "enrolled_courses": len(enrollments),
                    "average_progress": round(avg_progress, 1),
                    "available_courses": len(available_courses)
                }
            )
    
    def handle_asset_queries(self, message: str) -> ChatResponse:
        employee = self.get_employee_data()
        if not employee:
            return ChatResponse(response="I couldn't find your employee profile. Please contact HR.")
        
        # Get assigned assets
        assigned_assets = self.db.query(Asset).filter(Asset.assigned_to == employee.id).all()
        
        if assigned_assets:
            asset_text = "Your assigned assets:\n"
            for asset in assigned_assets:
                asset_text += f"• {asset.name} ({asset.type}) - {asset.serial_number}\n"
            return ChatResponse(
                response=asset_text,
                data={"assets": [{"name": a.name, "type": a.type, "serial_number": a.serial_number} for a in assigned_assets]}
            )
        else:
            return ChatResponse(response="No assets currently assigned to you.")
    
    def handle_announcement_queries(self, message: str) -> ChatResponse:
        # Get recent announcements
        recent_announcements = self.db.query(Announcement).order_by(Announcement.created_at.desc()).limit(5).all()
        
        if recent_announcements:
            announcement_text = "Recent announcements:\n"
            for announcement in recent_announcements[:3]:
                announcement_text += f"• {announcement.title} ({announcement.created_at.strftime('%Y-%m-%d')})\n"
            return ChatResponse(
                response=announcement_text,
                data={"announcements": [{"title": a.title, "date": str(a.created_at)} for a in recent_announcements[:3]]}
            )
        else:
            return ChatResponse(response="No recent announcements.")
    
    def handle_general_queries(self, message: str) -> ChatResponse:
        # Provide general help based on user role
        if self.current_user.role == 'admin':
            return ChatResponse(
                response="I can help you with employee management, recruitment, payroll, performance reviews, and system administration. What would you like to know?",
                data={"user_role": "admin"}
            )
        elif self.current_user.role == 'hr':
            return ChatResponse(
                response="I can assist with recruitment, employee onboarding, leave management, performance reviews, and HR analytics. How can I help?",
                data={"user_role": "hr"}
            )
        elif self.current_user.role == 'manager':
            return ChatResponse(
                response="I can help with team management, performance reviews, leave approvals, and employee development. What do you need?",
                data={"user_role": "manager"}
            )
        else:
            return ChatResponse(
                response="I can help you with leave requests, attendance, payroll information, performance goals, learning courses, and company announcements. What would you like to know?",
                data={"user_role": "employee"}
            )

@router.post("/chat", response_model=ChatResponse)
async def chat_with_assistant(
    message: ChatMessage,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Chat with AI Assistant"""
    try:
        assistant = AIAssistantService(db, current_user)
        response = assistant.analyze_message(message.message)
        return response
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing request: {str(e)}")

@router.get("/suggestions")
async def get_suggestions(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get contextual suggestions based on user role and recent activity"""
    try:
        suggestions = []
        
        if current_user.role == 'employee':
            suggestions = [
                "What's my leave balance?",
                "Show my attendance for today",
                "What's my latest salary slip?",
                "Any new announcements?",
                "What courses can I take?"
            ]
        elif current_user.role == 'manager':
            suggestions = [
                "How many team members do I have?",
                "Show pending leave requests",
                "Team performance summary",
                "Recent job applications",
                "Upcoming interviews"
            ]
        elif current_user.role in ['hr', 'admin']:
            suggestions = [
                "How many employees do we have?",
                "Show recent applications",
                "Open job positions",
                "Pending onboarding tasks",
                "Employee engagement metrics"
            ]
        
        return {"suggestions": suggestions}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting suggestions: {str(e)}")