"""
Attendance System Extensions
Missing endpoints and functionality for comprehensive attendance management
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, time, date, timedelta
from app import database, models, schemas
from app.dependencies import get_current_user
from app.role_utils import require_roles, has_permission, validate_attendance_access
from app.notification_service import get_notification_service
import csv
import io
import json

router = APIRouter(
    prefix="/attendance",
    tags=["attendance-extensions"]
)

# ============================================
# ATTENDANCE CORRECTIONS & DISPUTES
# ============================================

@router.post("/correction-request", response_model=schemas.AttendanceCorrectionOut)
async def request_attendance_correction(
    data: schemas.AttendanceCorrectionCreate,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Employee requests attendance correction"""
    validate_attendance_access(current_user.role)
    
    employee = db.query(models.Employee).filter(models.Employee.user_id == current_user.id).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee profile not found")
    
    # Check if attendance record exists
    attendance = db.query(models.Attendance).filter(models.Attendance.id == data.attendance_id).first()
    if not attendance or attendance.employee_id != employee.id:
        raise HTTPException(status_code=404, detail="Attendance record not found")
    
    # Check if correction already requested
    existing = db.query(models.AttendanceCorrection).filter(
        models.AttendanceCorrection.attendance_id == data.attendance_id,
        models.AttendanceCorrection.status == "pending"
    ).first()
    
    if existing:
        raise HTTPException(status_code=400, detail="Correction request already pending for this attendance")
    
    correction = models.AttendanceCorrection(
        attendance_id=data.attendance_id,
        employee_id=employee.id,
        requested_check_in=data.requested_check_in,
        requested_check_out=data.requested_check_out,
        reason=data.reason,
        status="pending"
    )
    db.add(correction)
    db.commit()
    db.refresh(correction)
    
    # Notify managers/HR
    notification_service = get_notification_service(db)
    await notification_service.notify_attendance_correction_request(correction.id)
    
    return correction

@router.get("/correction-requests", response_model=List[schemas.AttendanceCorrectionOut])
def get_correction_requests(
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Get employee's correction requests or pending requests for managers"""
    validate_attendance_access(current_user.role)
    
    if current_user.role in ['manager', 'hr', 'admin']:
        # Managers see all pending requests
        return db.query(models.AttendanceCorrection).filter(
            models.AttendanceCorrection.status == "pending"
        ).order_by(models.AttendanceCorrection.created_at.desc()).all()
    else:
        # Employees see their own requests
        employee = db.query(models.Employee).filter(models.Employee.user_id == current_user.id).first()
        if not employee:
            return []
        
        return db.query(models.AttendanceCorrection).filter(
            models.AttendanceCorrection.employee_id == employee.id
        ).order_by(models.AttendanceCorrection.created_at.desc()).all()

@router.put("/correction-requests/{correction_id}/approve")
async def approve_correction_request(
    correction_id: int,
    data: schemas.AttendanceCorrectionApproval,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Manager/HR approves or rejects correction request"""
    require_roles(['manager', 'hr', 'admin'])(current_user)
    
    correction = db.query(models.AttendanceCorrection).filter(
        models.AttendanceCorrection.id == correction_id
    ).first()
    
    if not correction:
        raise HTTPException(status_code=404, detail="Correction request not found")
    
    if correction.status != "pending":
        raise HTTPException(status_code=400, detail="Correction request already processed")
    
    correction.status = data.status
    correction.manager_comments = data.comments
    correction.reviewed_by = current_user.id
    correction.reviewed_at = datetime.utcnow()
    
    # If approved, update the attendance record
    if data.status == "approved":
        attendance = correction.attendance
        if correction.requested_check_in:
            attendance.check_in = correction.requested_check_in
        if correction.requested_check_out:
            attendance.check_out = correction.requested_check_out
        
        # Recalculate working hours
        if attendance.check_in and attendance.check_out:
            duration = attendance.check_out - attendance.check_in
            attendance.working_hours = duration.total_seconds() / 3600
    
    db.commit()
    
    # Notify employee
    notification_service = get_notification_service(db)
    await notification_service.notify_attendance_correction_decision(correction.id)
    
    return {"message": f"Correction request {data.status} successfully"}

# ============================================
# LEAVE INTEGRATION
# ============================================

@router.get("/leave-calendar")
def get_leave_calendar(
    month: Optional[int] = None,
    year: Optional[int] = None,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Get leave calendar for attendance planning"""
    validate_attendance_access(current_user.role)
    
    if not month:
        month = datetime.now().month
    if not year:
        year = datetime.now().year
    
    employee = db.query(models.Employee).filter(models.Employee.user_id == current_user.id).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee profile not found")
    
    # Get approved leaves for the month
    start_date = date(year, month, 1)
    if month == 12:
        end_date = date(year + 1, 1, 1)
    else:
        end_date = date(year, month + 1, 1)
    
    leaves = db.query(models.LeaveRequest).filter(
        models.LeaveRequest.employee_id == employee.id,
        models.LeaveRequest.status == "approved",
        models.LeaveRequest.start_date < end_date,
        models.LeaveRequest.end_date >= start_date
    ).all()
    
    # Get holidays
    holidays = db.query(models.Holiday).filter(
        models.Holiday.date >= start_date,
        models.Holiday.date < end_date
    ).all()
    
    return {
        "month": month,
        "year": year,
        "leaves": leaves,
        "holidays": holidays,
        "working_days": 22  # Calculate based on holidays and weekends
    }

@router.post("/mark-leave-attendance")
async def mark_leave_attendance(
    data: schemas.LeaveAttendanceCreate,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Automatically mark attendance for approved leave days"""
    require_roles(['hr', 'admin'])(current_user)
    
    leave_request = db.query(models.LeaveRequest).filter(
        models.LeaveRequest.id == data.leave_request_id,
        models.LeaveRequest.status == "approved"
    ).first()
    
    if not leave_request:
        raise HTTPException(status_code=404, detail="Approved leave request not found")
    
    # Mark attendance for each leave day
    current_date = leave_request.start_date
    marked_days = []
    
    while current_date <= leave_request.end_date:
        # Check if attendance already exists
        existing = db.query(models.Attendance).filter(
            models.Attendance.employee_id == leave_request.employee_id,
            models.Attendance.date >= datetime.combine(current_date, time.min),
            models.Attendance.date < datetime.combine(current_date, time.max)
        ).first()
        
        if not existing:
            attendance = models.Attendance(
                employee_id=leave_request.employee_id,
                date=datetime.combine(current_date, time(9, 0)),
                status="leave",
                work_mode="leave",
                verification_method="leave_request",
                approval_status="auto_approved",
                leave_request_id=leave_request.id
            )
            db.add(attendance)
            marked_days.append(current_date)
        
        current_date += timedelta(days=1)
    
    db.commit()
    
    return {
        "message": f"Attendance marked for {len(marked_days)} leave days",
        "marked_days": marked_days
    }

# ============================================
# HOLIDAY MANAGEMENT
# ============================================

@router.get("/holidays")
def get_holidays(
    year: Optional[int] = None,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Get company holidays"""
    validate_attendance_access(current_user.role)
    
    if not year:
        year = datetime.now().year
    
    holidays = db.query(models.Holiday).filter(
        models.Holiday.date >= date(year, 1, 1),
        models.Holiday.date <= date(year, 12, 31)
    ).order_by(models.Holiday.date).all()
    
    return holidays

@router.post("/holidays", response_model=schemas.HolidayOut)
def create_holiday(
    data: schemas.HolidayCreate,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Create company holiday (HR/Admin only)"""
    require_roles(['hr', 'admin'])(current_user)
    
    # Check if holiday already exists
    existing = db.query(models.Holiday).filter(models.Holiday.date == data.date).first()
    if existing:
        raise HTTPException(status_code=400, detail="Holiday already exists for this date")
    
    holiday = models.Holiday(
        name=data.name,
        date=data.date,
        description=data.description,
        is_optional=data.is_optional
    )
    db.add(holiday)
    db.commit()
    db.refresh(holiday)
    
    return holiday

# ============================================
# OVERTIME TRACKING
# ============================================

@router.get("/overtime-summary")
def get_overtime_summary(
    month: Optional[int] = None,
    year: Optional[int] = None,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Get overtime summary for employee"""
    validate_attendance_access(current_user.role)
    
    if not month:
        month = datetime.now().month
    if not year:
        year = datetime.now().year
    
    employee = db.query(models.Employee).filter(models.Employee.user_id == current_user.id).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee profile not found")
    
    # Get attendance records for the month
    start_date = date(year, month, 1)
    if month == 12:
        end_date = date(year + 1, 1, 1)
    else:
        end_date = date(year, month + 1, 1)
    
    attendance_records = db.query(models.Attendance).filter(
        models.Attendance.employee_id == employee.id,
        models.Attendance.date >= datetime.combine(start_date, time.min),
        models.Attendance.date < datetime.combine(end_date, time.min),
        models.Attendance.working_hours.isnot(None)
    ).all()
    
    # Calculate overtime (assuming 8 hours standard)
    total_hours = sum(record.working_hours for record in attendance_records)
    working_days = len(attendance_records)
    standard_hours = working_days * 8
    overtime_hours = max(0, total_hours - standard_hours)
    
    return {
        "month": month,
        "year": year,
        "total_hours": round(total_hours, 2),
        "standard_hours": standard_hours,
        "overtime_hours": round(overtime_hours, 2),
        "working_days": working_days,
        "average_daily_hours": round(total_hours / working_days, 2) if working_days > 0 else 0
    }

# ============================================
# BULK OPERATIONS
# ============================================

@router.post("/bulk-mark-attendance")
async def bulk_mark_attendance(
    data: schemas.BulkAttendanceCreate,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Bulk mark attendance for multiple employees (HR/Admin only)"""
    require_roles(['hr', 'admin'])(current_user)
    
    results = []
    
    for attendance_data in data.attendance_records:
        try:
            # Check if attendance already exists
            existing = db.query(models.Attendance).filter(
                models.Attendance.employee_id == attendance_data.employee_id,
                models.Attendance.date >= datetime.combine(attendance_data.date, time.min),
                models.Attendance.date < datetime.combine(attendance_data.date, time.max)
            ).first()
            
            if existing:
                results.append({
                    "employee_id": attendance_data.employee_id,
                    "date": attendance_data.date,
                    "status": "skipped",
                    "message": "Attendance already exists"
                })
                continue
            
            attendance = models.Attendance(
                employee_id=attendance_data.employee_id,
                date=datetime.combine(attendance_data.date, time(9, 0)),
                status=attendance_data.status,
                work_mode=attendance_data.work_mode or "office",
                verification_method="manual",
                approval_status="auto_approved",
                approved_by=current_user.id
            )
            db.add(attendance)
            
            results.append({
                "employee_id": attendance_data.employee_id,
                "date": attendance_data.date,
                "status": "success",
                "message": "Attendance marked successfully"
            })
            
        except Exception as e:
            results.append({
                "employee_id": attendance_data.employee_id,
                "date": attendance_data.date,
                "status": "error",
                "message": str(e)
            })
    
    db.commit()
    
    return {
        "message": f"Processed {len(data.attendance_records)} records",
        "results": results
    }

# ============================================
# EXPORT FUNCTIONALITY
# ============================================

@router.get("/export/csv")
def export_attendance_csv(
    start_date: date,
    end_date: date,
    employee_ids: Optional[str] = None,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Export attendance data as CSV"""
    validate_attendance_access(current_user.role)
    
    # Build query
    query = db.query(models.Attendance).filter(
        models.Attendance.date >= datetime.combine(start_date, time.min),
        models.Attendance.date <= datetime.combine(end_date, time.max)
    )
    
    # Filter by employee IDs if provided
    if employee_ids:
        emp_ids = [int(id.strip()) for id in employee_ids.split(',')]
        query = query.filter(models.Attendance.employee_id.in_(emp_ids))
    
    # If not admin/hr, filter to own records
    if current_user.role not in ['admin', 'hr']:
        employee = db.query(models.Employee).filter(models.Employee.user_id == current_user.id).first()
        if employee:
            query = query.filter(models.Attendance.employee_id == employee.id)
    
    attendance_records = query.order_by(models.Attendance.date.desc()).all()
    
    # Generate CSV content
    output = io.StringIO()
    writer = csv.writer(output)
    
    # Write header
    writer.writerow([
        'Employee ID', 'Employee Name', 'Date', 'Check In', 'Check Out',
        'Status', 'Work Mode', 'Working Hours', 'Location', 'Verification Method'
    ])
    
    # Write data
    for record in attendance_records:
        writer.writerow([
            record.employee_id,
            f"{record.employee.first_name} {record.employee.last_name}",
            record.date.strftime('%Y-%m-%d'),
            record.check_in.strftime('%H:%M:%S') if record.check_in else '',
            record.check_out.strftime('%H:%M:%S') if record.check_out else '',
            record.status,
            record.work_mode,
            record.working_hours or 0,
            record.location_address or '',
            record.verification_method
        ])
    
    csv_content = output.getvalue()
    output.close()
    
    from fastapi.responses import Response
    
    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=attendance_{start_date}_{end_date}.csv"}
    )

# ============================================
# SHIFT MANAGEMENT
# ============================================

@router.get("/shifts", response_model=List[schemas.ShiftOut])
def get_shifts(
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Get all available shifts"""
    validate_attendance_access(current_user.role)
    
    return db.query(models.Shift).all()

@router.post("/assign-shift")
def assign_employee_shift(
    data: schemas.ShiftAssignmentCreate,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Assign shift to employee (Manager/HR/Admin only)"""
    require_roles(['manager', 'hr', 'admin'])(current_user)
    
    employee = db.query(models.Employee).filter(models.Employee.id == data.employee_id).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    shift = db.query(models.Shift).filter(models.Shift.id == data.shift_id).first()
    if not shift:
        raise HTTPException(status_code=404, detail="Shift not found")
    
    employee.shift_id = data.shift_id
    db.commit()
    
    return {"message": f"Shift '{shift.name}' assigned to {employee.first_name} {employee.last_name}"}

# ============================================
# COMPLIANCE REPORTING
# ============================================

@router.get("/compliance-report")
def get_compliance_report(
    start_date: date,
    end_date: date,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Generate compliance report for regulatory requirements (HR/Admin only)"""
    require_roles(['hr', 'admin'])(current_user)
    
    # Get all employees
    employees = db.query(models.Employee).filter(models.Employee.is_active == True).all()
    
    compliance_data = []
    
    for employee in employees:
        # Get attendance records for the period
        attendance_records = db.query(models.Attendance).filter(
            models.Attendance.employee_id == employee.id,
            models.Attendance.date >= datetime.combine(start_date, time.min),
            models.Attendance.date <= datetime.combine(end_date, time.max)
        ).all()
        
        total_days = (end_date - start_date).days + 1
        present_days = len([r for r in attendance_records if r.status in ['present', 'late']])
        leave_days = len([r for r in attendance_records if r.status == 'leave'])
        absent_days = total_days - present_days - leave_days
        
        # Calculate total working hours
        total_hours = sum(r.working_hours or 0 for r in attendance_records)
        
        compliance_data.append({
            "employee_id": employee.id,
            "employee_name": f"{employee.first_name} {employee.last_name}",
            "department": employee.department,
            "total_days": total_days,
            "present_days": present_days,
            "leave_days": leave_days,
            "absent_days": absent_days,
            "attendance_rate": round((present_days / total_days) * 100, 2),
            "total_working_hours": round(total_hours, 2),
            "average_daily_hours": round(total_hours / present_days, 2) if present_days > 0 else 0
        })
    
    return {
        "period": f"{start_date} to {end_date}",
        "total_employees": len(employees),
        "compliance_data": compliance_data,
        "generated_at": datetime.utcnow().isoformat(),
        "generated_by": current_user.username
    }

# ============================================
# REAL-TIME DASHBOARD ENDPOINTS
# ============================================

@router.get("/real-time-status")
def get_real_time_attendance_status(
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Get real-time attendance status for dashboard"""
    validate_attendance_access(current_user.role)
    
    if not has_permission(current_user.role, "can_view_team_attendance"):
        raise HTTPException(status_code=403, detail="Not authorized to view real-time status")
    
    today = date.today()
    
    # Get today's attendance
    today_attendance = db.query(models.Attendance).filter(
        models.Attendance.date >= datetime.combine(today, time.min),
        models.Attendance.date < datetime.combine(today, time.max)
    ).all()
    
    # Get all active employees
    total_employees = db.query(models.Employee).filter(models.Employee.is_active == True).count()
    
    # Calculate metrics
    present_count = len([a for a in today_attendance if a.status in ['present', 'late']])
    late_count = len([a for a in today_attendance if a.status == 'late'])
    wfh_count = len([a for a in today_attendance if a.work_mode == 'wfh'])
    absent_count = total_employees - present_count
    
    # Get recent check-ins (last 10)
    recent_checkins = db.query(models.Attendance).filter(
        models.Attendance.date >= datetime.combine(today, time.min),
        models.Attendance.check_in.isnot(None)
    ).order_by(models.Attendance.check_in.desc()).limit(10).all()
    
    recent_checkins_data = []
    for checkin in recent_checkins:
        recent_checkins_data.append({
            "employee_name": f"{checkin.employee.first_name} {checkin.employee.last_name}",
            "check_in_time": checkin.check_in.strftime("%H:%M"),
            "status": checkin.status,
            "work_mode": checkin.work_mode
        })
    
    return {
        "summary": {
            "total_employees": total_employees,
            "present_count": present_count,
            "late_count": late_count,
            "wfh_count": wfh_count,
            "absent_count": absent_count,
            "attendance_rate": round((present_count / total_employees) * 100, 1) if total_employees > 0 else 0
        },
        "recent_checkins": recent_checkins_data,
        "last_updated": datetime.utcnow().isoformat()
    }

# ============================================
# ATTENDANCE PATTERNS & ANALYTICS
# ============================================

@router.get("/patterns/employee/{employee_id}")
def get_employee_attendance_patterns(
    employee_id: int,
    days: int = 30,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Get attendance patterns for specific employee"""
    validate_attendance_access(current_user.role)
    
    # Check if user can view this employee's data
    if current_user.role not in ['admin', 'hr', 'manager']:
        employee = db.query(models.Employee).filter(models.Employee.user_id == current_user.id).first()
        if not employee or employee.id != employee_id:
            raise HTTPException(status_code=403, detail="Not authorized to view this employee's patterns")
    
    # Get attendance records for the last N days
    start_date = datetime.now() - timedelta(days=days)
    
    attendance_records = db.query(models.Attendance).filter(
        models.Attendance.employee_id == employee_id,
        models.Attendance.date >= start_date
    ).order_by(models.Attendance.date.desc()).all()
    
    # Analyze patterns
    patterns = {
        "average_check_in_time": None,
        "most_common_late_day": None,
        "wfh_frequency": 0,
        "attendance_consistency": 0,
        "weekly_pattern": {}
    }
    
    if attendance_records:
        # Calculate average check-in time
        check_in_times = [r.check_in for r in attendance_records if r.check_in]
        if check_in_times:
            avg_seconds = sum(t.hour * 3600 + t.minute * 60 + t.second for t in check_in_times) / len(check_in_times)
            avg_hour = int(avg_seconds // 3600)
            avg_minute = int((avg_seconds % 3600) // 60)
            patterns["average_check_in_time"] = f"{avg_hour:02d}:{avg_minute:02d}"
        
        # WFH frequency
        wfh_count = len([r for r in attendance_records if r.work_mode == 'wfh'])
        patterns["wfh_frequency"] = round((wfh_count / len(attendance_records)) * 100, 1)
        
        # Attendance consistency (percentage of days present)
        present_count = len([r for r in attendance_records if r.status in ['present', 'late']])
        patterns["attendance_consistency"] = round((present_count / len(attendance_records)) * 100, 1)
        
        # Weekly pattern analysis
        weekday_stats = {}
        for record in attendance_records:
            weekday = record.date.strftime("%A")
            if weekday not in weekday_stats:
                weekday_stats[weekday] = {"total": 0, "late": 0}
            weekday_stats[weekday]["total"] += 1
            if record.status == "late":
                weekday_stats[weekday]["late"] += 1
        
        for day, stats in weekday_stats.items():
            late_percentage = (stats["late"] / stats["total"]) * 100 if stats["total"] > 0 else 0
            patterns["weekly_pattern"][day] = {
                "total_days": stats["total"],
                "late_percentage": round(late_percentage, 1)
            }
        
        # Find most common late day
        if weekday_stats:
            most_late_day = max(weekday_stats.items(), key=lambda x: x[1]["late"])
            if most_late_day[1]["late"] > 0:
                patterns["most_common_late_day"] = most_late_day[0]
    
    return {
        "employee_id": employee_id,
        "analysis_period_days": days,
        "total_records": len(attendance_records),
        "patterns": patterns
    }