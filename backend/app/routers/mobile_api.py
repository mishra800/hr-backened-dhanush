"""
Mobile-Optimized Attendance API
Lightweight endpoints designed for mobile applications
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, date, time
from app import database, models, schemas
from app.dependencies import get_current_user
from app.attendance_service import get_attendance_service
from app.security_service import get_security_service
from app.role_utils import validate_attendance_access, has_permission
import base64

router = APIRouter(
    prefix="/mobile/attendance",
    tags=["mobile-attendance"]
)

# ============================================
# MOBILE ATTENDANCE ENDPOINTS
# ============================================

@router.get("/status")
async def get_attendance_status(
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Get current attendance status - optimized for mobile"""
    validate_attendance_access(current_user.role)
    
    employee = db.query(models.Employee).filter(models.Employee.user_id == current_user.id).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee profile not found")
    
    # Check today's attendance
    today = date.today()
    today_attendance = db.query(models.Attendance).filter(
        models.Attendance.employee_id == employee.id,
        models.Attendance.date >= datetime.combine(today, time.min),
        models.Attendance.date < datetime.combine(today, time.max)
    ).first()
    
    # Check WFH status
    wfh_request = db.query(models.WFHRequest).filter(
        models.WFHRequest.employee_id == employee.id,
        models.WFHRequest.request_date == today,
        models.WFHRequest.status == "approved"
    ).first()
    
    # Check profile image
    security_service = get_security_service(db)
    has_biometric = employee.profile_image_url is not None
    
    # Current time validation
    current_time = datetime.now().time()
    within_window = time(8, 0) <= current_time <= time(11, 0)
    
    return {
        "employee": {
            "id": employee.id,
            "name": f"{employee.first_name} {employee.last_name}",
            "department": employee.department
        },
        "attendance_today": {
            "marked": today_attendance is not None,
            "check_in": today_attendance.check_in.isoformat() if today_attendance and today_attendance.check_in else None,
            "check_out": today_attendance.check_out.isoformat() if today_attendance and today_attendance.check_out else None,
            "status": today_attendance.status if today_attendance else None,
            "work_mode": today_attendance.work_mode if today_attendance else None
        },
        "wfh_status": {
            "approved": wfh_request is not None,
            "request_id": wfh_request.id if wfh_request else None
        },
        "security": {
            "has_biometric": has_biometric,
            "face_recognition_enabled": True
        },
        "time_validation": {
            "current_time": current_time.strftime("%H:%M"),
            "within_window": within_window,
            "window_start": "08:00",
            "window_end": "11:00"
        }
    }

@router.post("/quick-checkin")
async def quick_checkin(
    data: dict,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Quick check-in optimized for mobile with minimal data"""
    validate_attendance_access(current_user.role)
    
    employee = db.query(models.Employee).filter(models.Employee.user_id == current_user.id).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee profile not found")
    
    # Use attendance service for comprehensive validation
    attendance_service = get_attendance_service(db)
    
    result = await attendance_service.mark_attendance_comprehensive(
        employee_id=employee.id,
        photo_base64=data.get("photo"),
        latitude=data.get("latitude"),
        longitude=data.get("longitude"),
        use_face_recognition=True
    )
    
    # Return mobile-optimized response
    if result["success"]:
        return {
            "success": True,
            "message": "Check-in successful",
            "attendance": {
                "id": result["attendance"]["id"],
                "time": result["attendance"]["check_in"],
                "status": result["attendance"]["status"],
                "requires_approval": result["attendance"]["requires_approval"]
            },
            "security": {
                "face_confidence": result["verification_data"]["face_match_confidence"],
                "fraud_score": len(result["verification_data"]["fraud_indicators"])
            }
        }
    else:
        return {
            "success": False,
            "error": result["error"],
            "message": result["message"]
        }

@router.post("/checkout")
async def mobile_checkout(
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Mobile checkout endpoint"""
    validate_attendance_access(current_user.role)
    
    employee = db.query(models.Employee).filter(models.Employee.user_id == current_user.id).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee profile not found")
    
    # Find today's attendance without checkout
    attendance = db.query(models.Attendance).filter(
        models.Attendance.employee_id == employee.id,
        models.Attendance.check_out.is_(None)
    ).order_by(models.Attendance.check_in.desc()).first()
    
    if not attendance:
        raise HTTPException(status_code=400, detail="No active check-in found")
    
    # Update checkout time
    attendance.check_out = datetime.utcnow()
    db.commit()
    
    # Calculate working hours
    working_hours = (attendance.check_out - attendance.check_in).total_seconds() / 3600
    
    return {
        "success": True,
        "message": "Check-out successful",
        "checkout_time": attendance.check_out.isoformat(),
        "working_hours": round(working_hours, 2)
    }

@router.get("/history")
async def get_mobile_history(
    limit: int = 10,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Get attendance history optimized for mobile"""
    validate_attendance_access(current_user.role)
    
    employee = db.query(models.Employee).filter(models.Employee.user_id == current_user.id).first()
    if not employee:
        return []
    
    records = db.query(models.Attendance).filter(
        models.Attendance.employee_id == employee.id
    ).order_by(models.Attendance.date.desc()).limit(limit).all()
    
    # Mobile-optimized response
    history = []
    for record in records:
        working_hours = None
        if record.check_in and record.check_out:
            hours = (record.check_out - record.check_in).total_seconds() / 3600
            working_hours = f"{int(hours)}h {int((hours % 1) * 60)}m"
        
        history.append({
            "date": record.date.strftime("%Y-%m-%d"),
            "day": record.date.strftime("%A"),
            "check_in": record.check_in.strftime("%H:%M") if record.check_in else None,
            "check_out": record.check_out.strftime("%H:%M") if record.check_out else None,
            "working_hours": working_hours,
            "status": record.status,
            "work_mode": record.work_mode,
            "requires_approval": record.requires_approval
        })
    
    return history

@router.get("/summary")
async def get_mobile_summary(
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Get attendance summary for mobile dashboard"""
    validate_attendance_access(current_user.role)
    
    employee = db.query(models.Employee).filter(models.Employee.user_id == current_user.id).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee profile not found")
    
    # This month's data
    from datetime import timedelta
    month_start = datetime.now().replace(day=1)
    
    records = db.query(models.Attendance).filter(
        models.Attendance.employee_id == employee.id,
        models.Attendance.date >= month_start
    ).all()
    
    # Calculate metrics
    total_days = len(records)
    present_days = len([r for r in records if r.status in ['present', 'late']])
    late_days = len([r for r in records if r.status == 'late'])
    wfh_days = len([r for r in records if r.work_mode == 'wfh'])
    
    # Working hours
    total_hours = 0
    for record in records:
        if record.check_in and record.check_out:
            hours = (record.check_out - record.check_in).total_seconds() / 3600
            total_hours += hours
    
    avg_hours = total_hours / total_days if total_days > 0 else 0
    attendance_rate = (present_days / total_days * 100) if total_days > 0 else 0
    
    return {
        "this_month": {
            "total_days": total_days,
            "present_days": present_days,
            "late_days": late_days,
            "wfh_days": wfh_days,
            "attendance_rate": round(attendance_rate, 1),
            "avg_working_hours": round(avg_hours, 1),
            "total_working_hours": round(total_hours, 1)
        },
        "streaks": {
            "current_streak": 5,  # Calculate actual streak
            "best_streak": 15     # Calculate best streak
        }
    }

# ============================================
# MOBILE WFH ENDPOINTS
# ============================================

@router.post("/wfh-request")
async def mobile_wfh_request(
    data: dict,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Submit WFH request from mobile"""
    validate_attendance_access(current_user.role)
    
    employee = db.query(models.Employee).filter(models.Employee.user_id == current_user.id).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee profile not found")
    
    # Check for existing request
    request_date = datetime.strptime(data["date"], "%Y-%m-%d").date()
    existing = db.query(models.WFHRequest).filter(
        models.WFHRequest.employee_id == employee.id,
        models.WFHRequest.request_date == request_date
    ).first()
    
    if existing:
        raise HTTPException(status_code=400, detail="WFH request already exists for this date")
    
    # Create request
    wfh_request = models.WFHRequest(
        employee_id=employee.id,
        request_date=request_date,
        reason=data["reason"],
        status="pending"
    )
    
    db.add(wfh_request)
    db.commit()
    
    return {
        "success": True,
        "message": "WFH request submitted successfully",
        "request_id": wfh_request.id
    }

@router.get("/wfh-requests")
async def get_mobile_wfh_requests(
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Get WFH requests for mobile"""
    validate_attendance_access(current_user.role)
    
    employee = db.query(models.Employee).filter(models.Employee.user_id == current_user.id).first()
    if not employee:
        return []
    
    requests = db.query(models.WFHRequest).filter(
        models.WFHRequest.employee_id == employee.id
    ).order_by(models.WFHRequest.created_at.desc()).limit(10).all()
    
    mobile_requests = []
    for req in requests:
        mobile_requests.append({
            "id": req.id,
            "date": req.request_date.strftime("%Y-%m-%d"),
            "day": req.request_date.strftime("%A"),
            "reason": req.reason,
            "status": req.status,
            "submitted": req.created_at.strftime("%Y-%m-%d"),
            "manager_comments": req.manager_comments
        })
    
    return mobile_requests

# ============================================
# MOBILE CONFIGURATION
# ============================================

@router.get("/config")
async def get_mobile_config(
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Get mobile app configuration"""
    validate_attendance_access(current_user.role)
    
    return {
        "app_version": "1.0.0",
        "features": {
            "face_recognition": True,
            "gps_validation": True,
            "wfh_requests": True,
            "offline_mode": False
        },
        "settings": {
            "check_in_window": {
                "start": "08:00",
                "end": "11:00"
            },
            "gps_accuracy_threshold": 50,
            "face_confidence_threshold": 70,
            "auto_checkout_time": "18:00"
        },
        "office_location": {
            "name": "Dhanush Healthcare Pvt. Ltd.",
            "address": "Hyderabad, Telangana",
            "latitude": 17.4065,
            "longitude": 78.4772,
            "radius": 100
        }
    }

@router.get("/health")
async def mobile_health_check():
    """Health check endpoint for mobile apps"""
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "version": "1.0.0"
    }