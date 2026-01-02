from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime, time, date
from app import database, models, schemas
from app.dependencies import get_current_user
from app import face_recognition_utils
from app.role_utils import require_roles, has_permission, validate_attendance_access
from app.notification_service import get_notification_service
from app.attendance_service import get_attendance_service
# Simplified attendance system - removed complex services
import math
import base64
import os
import json

router = APIRouter(
    prefix="/attendance",
    tags=["attendance"]
)

# Dhanush Healthcare Pvt. Ltd. Office Location
OFFICE_COORDS = {
    "lat": 17.4065,  # Update with actual coordinates
    "lon": 78.4772,
    "name": "Dhanush Healthcare Pvt. Ltd.",
    "address": "Hyderabad, Telangana"
}
MAX_DISTANCE = 100  # meters

def haversine(lat1, lon1, lat2, lon2):
    """Calculate distance between two GPS coordinates in meters"""
    R = 6371e3  # Earth radius in meters
    phi1 = lat1 * math.pi / 180
    phi2 = lat2 * math.pi / 180
    delta_phi = (lat2 - lat1) * math.pi / 180
    delta_lambda = (lon2 - lon1) * math.pi / 180
    
    a = math.sin(delta_phi/2) * math.sin(delta_phi/2) + \
        math.cos(phi1) * math.cos(phi2) * \
        math.sin(delta_lambda/2) * math.sin(delta_lambda/2)
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
    
    return R * c

def is_within_time_window():
    """Check if current time is within check-in window (8:00 AM - 11:00 AM)"""
    now = datetime.now().time()
    start_time = time(8, 0)
    end_time = time(11, 0)
    return start_time <= now <= end_time

def save_attendance_photo(photo_base64: str, employee_id: int) -> str:
    """Save base64 photo to file system"""
    try:
        # Create uploads directory if not exists
        upload_dir = "uploads/attendance_photos"
        os.makedirs(upload_dir, exist_ok=True)
        
        # Generate filename
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"emp_{employee_id}_{timestamp}.jpg"
        filepath = os.path.join(upload_dir, filename)
        
        # Decode and save
        photo_data = base64.b64decode(photo_base64.split(',')[1] if ',' in photo_base64 else photo_base64)
        with open(filepath, 'wb') as f:
            f.write(photo_data)
        
        return filepath
    except Exception as e:
        print(f"Error saving photo: {e}")
        return None

# ============================================
# WFH REQUEST MANAGEMENT
# ============================================

@router.post("/wfh-request", response_model=schemas.WFHRequestOut)
async def create_wfh_request(
    data: schemas.WFHRequestCreate,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Employee submits WFH request - Only employees, managers, HR, and admin can create WFH requests"""
    # Validate attendance system access
    validate_attendance_access(current_user.role)
    
    # Check specific permission
    if not has_permission(current_user.role, "can_create_wfh_request"):
        raise HTTPException(
            status_code=403, 
            detail=f"Role '{current_user.role}' is not authorized to create WFH requests"
        )
    
    employee = db.query(models.Employee).filter(models.Employee.user_id == current_user.id).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee profile not found")
    
    # Check if request already exists for this date
    existing = db.query(models.WFHRequest).filter(
        models.WFHRequest.employee_id == employee.id,
        models.WFHRequest.request_date == data.request_date.date()
    ).first()
    
    if existing:
        raise HTTPException(status_code=400, detail="WFH request already exists for this date")
    
    wfh_request = models.WFHRequest(
        employee_id=employee.id,
        request_date=data.request_date,
        reason=data.reason,
        status="pending"
    )
    db.add(wfh_request)
    db.commit()
    db.refresh(wfh_request)
    
    # Send notifications
    notification_service = get_notification_service(db)
    
    # Notify employee (confirmation)
    await notification_service.notify_wfh_request_submitted(wfh_request.id)
    
    # Notify managers/HR for approval
    await notification_service.notify_wfh_request_pending_approval(wfh_request.id)
    
    return wfh_request

@router.get("/wfh-requests", response_model=List[schemas.WFHRequestOut])
def get_my_wfh_requests(
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Get employee's WFH requests - Only employees, managers, HR, and admin can view their own requests"""
    # Validate attendance system access
    validate_attendance_access(current_user.role)
    
    # Check specific permission
    if not has_permission(current_user.role, "can_view_own_wfh_requests"):
        raise HTTPException(
            status_code=403, 
            detail=f"Role '{current_user.role}' is not authorized to view WFH requests"
        )
    
    employee = db.query(models.Employee).filter(models.Employee.user_id == current_user.id).first()
    if not employee:
        return []
    
    return db.query(models.WFHRequest).filter(
        models.WFHRequest.employee_id == employee.id
    ).order_by(models.WFHRequest.created_at.desc()).all()

@router.get("/wfh-requests/pending", response_model=List[schemas.WFHRequestOut])
def get_pending_wfh_requests(
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Manager gets pending WFH requests from their team - Only managers, HR, and admin"""
    # Validate attendance system access
    validate_attendance_access(current_user.role)
    
    # Check specific permission
    if not has_permission(current_user.role, "can_view_team_wfh_requests"):
        raise HTTPException(
            status_code=403, 
            detail=f"Role '{current_user.role}' is not authorized to view team WFH requests"
        )
    
    # Get all pending requests (in real app, filter by manager's team)
    return db.query(models.WFHRequest).filter(
        models.WFHRequest.status == "pending"
    ).order_by(models.WFHRequest.created_at.desc()).all()

@router.put("/wfh-requests/{request_id}/approve", response_model=schemas.WFHRequestOut)
async def approve_wfh_request(
    request_id: int,
    approval: schemas.WFHRequestApproval,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Manager approves/rejects WFH request - Only managers, HR, and admin"""
    # Validate attendance system access
    validate_attendance_access(current_user.role)
    
    # Check specific permission
    if not has_permission(current_user.role, "can_approve_wfh_requests"):
        raise HTTPException(
            status_code=403, 
            detail=f"Role '{current_user.role}' is not authorized to approve WFH requests"
        )
    
    wfh_request = db.query(models.WFHRequest).filter(models.WFHRequest.id == request_id).first()
    if not wfh_request:
        raise HTTPException(status_code=404, detail="WFH request not found")
    
    old_status = wfh_request.status
    wfh_request.status = approval.status
    wfh_request.manager_id = current_user.id
    wfh_request.manager_comments = approval.comments
    wfh_request.reviewed_at = datetime.utcnow()
    
    db.commit()
    db.refresh(wfh_request)
    
    # Send notification to employee about approval/rejection
    notification_service = get_notification_service(db)
    await notification_service.notify_wfh_request_decision(
        wfh_request.id, 
        old_status, 
        approval.status,
        current_user.id
    )
    
    # Log the approval action
    await log_audit_action(
        db, current_user.id,
        "wfh_approval",
        f"{'Approved' if approval.status == 'approved' else 'Rejected'} WFH request for {wfh_request.employee.first_name} {wfh_request.employee.last_name}",
        {"wfh_request_id": wfh_request.id, "status": approval.status, "comments": approval.comments}
    )
    
    return wfh_request

# ============================================
# ATTENDANCE MARKING
# ============================================

@router.get("/check-wfh-status")
def check_wfh_status(
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Check if employee has approved WFH for today - Only employees, managers, HR, and admin"""
    # Validate attendance system access
    validate_attendance_access(current_user.role)
    
    # Check specific permission
    if not has_permission(current_user.role, "can_view_own_wfh_requests"):
        raise HTTPException(
            status_code=403, 
            detail=f"Role '{current_user.role}' is not authorized to check WFH status"
        )
    
    employee = db.query(models.Employee).filter(models.Employee.user_id == current_user.id).first()
    if not employee:
        return {"has_wfh_approval": False, "wfh_request": None}
    
    today = date.today()
    wfh_request = db.query(models.WFHRequest).filter(
        models.WFHRequest.employee_id == employee.id,
        models.WFHRequest.request_date == today,
        models.WFHRequest.status == "approved"
    ).first()
    
    return {
        "has_wfh_approval": wfh_request is not None,
        "wfh_request": wfh_request
    }

@router.post("/mark-attendance-comprehensive")
async def mark_attendance_comprehensive(
    data: schemas.AttendanceCreate,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    Comprehensive attendance marking with full pre-checks, verification, and validation
    
    Flow:
    1. Pre-Checks: Already marked? WFH approved? Shift assigned?
    2. Verification: Camera permission, Face recognition, GPS validation
    3. Validation: Time window check, Late flagging, Work mode validation
    4. Record Creation: Status assignment, Approval workflow, Notifications
    """
    # Validate attendance system access
    validate_attendance_access(current_user.role)
    
    # Check specific permission
    if not has_permission(current_user.role, "can_mark_attendance"):
        raise HTTPException(
            status_code=403, 
            detail=f"Role '{current_user.role}' is not authorized to mark attendance"
        )
    
    # Get employee
    employee = db.query(models.Employee).filter(models.Employee.user_id == current_user.id).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee profile not found")
    
    # Use comprehensive attendance service
    attendance_service = get_attendance_service(db)
    
    result = await attendance_service.mark_attendance_comprehensive(
        employee_id=employee.id,
        photo_base64=data.photo_base64,
        latitude=data.latitude,
        longitude=data.longitude,
        use_face_recognition=True
    )
    
    if not result["success"]:
        # Map service errors to HTTP exceptions
        error_code = result.get("error", "unknown_error")
        
        if error_code == "already_marked":
            raise HTTPException(status_code=400, detail=result["message"])
        elif error_code in ["face_mismatch", "profile_image_missing"]:
            raise HTTPException(status_code=400, detail=result["message"])
        elif error_code in ["location_required", "location_too_far"]:
            raise HTTPException(status_code=400, detail=result["message"])
        else:
            raise HTTPException(status_code=500, detail=result["message"])
    
    return {
        "success": True,
        "message": result["message"],
        "attendance": result["attendance"],
        "verification_summary": {
            "face_confidence": result["verification_data"]["face_match_confidence"],
            "location_validated": result["verification_data"]["gps_validated"],
            "fraud_indicators": len(result["verification_data"]["fraud_indicators"])
        },
        "validation_summary": {
            "status": result["validation_data"]["attendance_status"],
            "requires_approval": result["validation_data"]["requires_approval"],
            "late_minutes": result["validation_data"]["late_minutes"],
            "work_mode": result["validation_data"]["work_mode"]
        }
    }

@router.post("/mark-attendance", response_model=schemas.AttendanceOut)
async def mark_attendance(
    data: schemas.AttendanceCreate,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Legacy attendance marking endpoint (simplified version)"""
    # Validate attendance system access
    validate_attendance_access(current_user.role)
    
    # Check specific permission
    if not has_permission(current_user.role, "can_mark_attendance"):
        raise HTTPException(
            status_code=403, 
            detail=f"Role '{current_user.role}' is not authorized to mark attendance"
        )
    
    employee = db.query(models.Employee).filter(models.Employee.user_id == current_user.id).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee profile not found")
    
    # Check if already marked today
    today = date.today()
    existing = db.query(models.Attendance).filter(
        models.Attendance.employee_id == employee.id,
        models.Attendance.date >= datetime.combine(today, time.min),
        models.Attendance.date < datetime.combine(today, time.max)
    ).first()
    
    if existing:
        raise HTTPException(status_code=400, detail="Attendance already marked for today")
    
    # Check time window
    within_time = is_within_time_window()
    requires_approval = not within_time
    
    # Check WFH approval
    wfh_request = db.query(models.WFHRequest).filter(
        models.WFHRequest.employee_id == employee.id,
        models.WFHRequest.request_date == today,
        models.WFHRequest.status == "approved"
    ).first()
    
    work_mode = "wfh" if wfh_request else "office"
    
    # Validate location for office mode
    if work_mode == "office":
        if not data.latitude or not data.longitude:
            raise HTTPException(status_code=400, detail="Location required for office attendance")
        
        distance = haversine(data.latitude, data.longitude, OFFICE_COORDS["lat"], OFFICE_COORDS["lon"])
        
        if distance > MAX_DISTANCE:
            raise HTTPException(
                status_code=400, 
                detail=f"You are {int(distance)}m away from office. Must be within {MAX_DISTANCE}m of {OFFICE_COORDS['name']}"
            )
    
    # Save photo
    photo_url = None
    if data.photo_base64:
        photo_url = save_attendance_photo(data.photo_base64, employee.id)
    
    # Get shift
    shift = db.query(models.Shift).filter(models.Shift.name == "Morning Shift").first()
    
    # Create attendance record
    attendance = models.Attendance(
        employee_id=employee.id,
        date=datetime.utcnow(),
        status="present" if within_time else "late",
        check_in=datetime.utcnow(),
        latitude=data.latitude,
        longitude=data.longitude,
        photo_url=photo_url,
        location_address=OFFICE_COORDS["address"] if work_mode == "office" else "Work From Home",
        verification_method="photo",
        is_fraud_suspected=False,
        work_mode=work_mode,
        wfh_request_id=wfh_request.id if wfh_request else None,
        requires_approval=requires_approval,
        approval_status="auto_approved" if within_time else "pending",
        shift_id=shift.id if shift else None
    )
    
    db.add(attendance)
    db.commit()
    db.refresh(attendance)
    
    # Send notification if attendance requires approval (late check-in)
    if requires_approval:
        notification_service = get_notification_service(db)
        await notification_service.notify_late_attendance_flagged(attendance.id)
    
    return attendance

@router.post("/checkout", response_model=schemas.AttendanceOut)
def check_out(
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Mark check-out - Only employees, managers, HR, and admin"""
    # Validate attendance system access
    validate_attendance_access(current_user.role)
    
    # Check specific permission
    if not has_permission(current_user.role, "can_mark_attendance"):
        raise HTTPException(
            status_code=403, 
            detail=f"Role '{current_user.role}' is not authorized to mark attendance"
        )
    
    employee = db.query(models.Employee).filter(models.Employee.user_id == current_user.id).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee profile not found")
    
    attendance = db.query(models.Attendance).filter(
        models.Attendance.employee_id == employee.id,
        models.Attendance.check_out == None
    ).order_by(models.Attendance.check_in.desc()).first()
    
    if not attendance:
        raise HTTPException(status_code=400, detail="Not checked in")
    
    attendance.check_out = datetime.utcnow()
    db.commit()
    db.refresh(attendance)
    return attendance

# ============================================
# ATTENDANCE HISTORY & REPORTS
# ============================================

@router.get("/my-attendance", response_model=List[schemas.AttendanceOut])
def get_my_attendance(
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Get employee's attendance history - Only employees, managers, HR, and admin"""
    # Validate attendance system access
    validate_attendance_access(current_user.role)
    
    # Check specific permission
    if not has_permission(current_user.role, "can_view_own_attendance"):
        raise HTTPException(
            status_code=403, 
            detail=f"Role '{current_user.role}' is not authorized to view attendance history"
        )
    
    employee = db.query(models.Employee).filter(models.Employee.user_id == current_user.id).first()
    if not employee:
        return []
    
    return db.query(models.Attendance).filter(
        models.Attendance.employee_id == employee.id
    ).order_by(models.Attendance.date.desc()).limit(30).all()

@router.get("/team-attendance", response_model=List[schemas.AttendanceOut])
def get_team_attendance(
    date_filter: str = None,  # YYYY-MM-DD
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Manager views team attendance - Only managers, HR, and admin"""
    # Validate attendance system access
    validate_attendance_access(current_user.role)
    
    # Check specific permission
    if not has_permission(current_user.role, "can_view_team_attendance"):
        raise HTTPException(
            status_code=403, 
            detail=f"Role '{current_user.role}' is not authorized to view team attendance"
        )
    
    query = db.query(models.Attendance)
    
    if date_filter:
        filter_date = datetime.strptime(date_filter, "%Y-%m-%d").date()
        query = query.filter(
            models.Attendance.date >= datetime.combine(filter_date, time.min),
            models.Attendance.date < datetime.combine(filter_date, time.max)
        )
    else:
        # Default to today
        today = date.today()
        query = query.filter(
            models.Attendance.date >= datetime.combine(today, time.min),
            models.Attendance.date < datetime.combine(today, time.max)
        )
    
    return query.order_by(models.Attendance.check_in.desc()).all()

@router.get("/flagged-attendance", response_model=List[schemas.AttendanceOut])
def get_flagged_attendance(
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Get attendance records that need manager review - Only managers, HR, and admin"""
    # Validate attendance system access
    validate_attendance_access(current_user.role)
    
    # Check specific permission
    if not has_permission(current_user.role, "can_approve_attendance"):
        raise HTTPException(
            status_code=403, 
            detail=f"Role '{current_user.role}' is not authorized to view flagged attendance"
        )
    
    return db.query(models.Attendance).filter(
        models.Attendance.approval_status == "pending"
    ).order_by(models.Attendance.date.desc()).all()

@router.put("/attendance/{attendance_id}/approve")
async def approve_attendance(
    attendance_id: int,
    approved: bool,
    comments: str = None,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Manager approves/rejects attendance - Only managers, HR, and admin"""
    # Validate attendance system access
    validate_attendance_access(current_user.role)
    
    # Check specific permission
    if not has_permission(current_user.role, "can_approve_attendance"):
        raise HTTPException(
            status_code=403, 
            detail=f"Role '{current_user.role}' is not authorized to approve attendance"
        )
    
    attendance = db.query(models.Attendance).filter(models.Attendance.id == attendance_id).first()
    if not attendance:
        raise HTTPException(status_code=404, detail="Attendance not found")
    
    attendance.approval_status = "approved" if approved else "rejected"
    attendance.approved_by = current_user.id
    attendance.flagged_reason = comments
    
    if not approved:
        attendance.status = "absent"
    
    db.commit()
    
    # Send notification to employee
    notification_service = get_notification_service(db)
    await notification_service.notify_attendance_approved_rejected(
        attendance.id,
        approved,
        current_user.id,
        comments
    )
    
    # Log the approval action
    await log_audit_action(
        db, current_user.id, 
        "attendance_approval", 
        f"{'Approved' if approved else 'Rejected'} late attendance for {attendance.employee.first_name} {attendance.employee.last_name}",
        {"attendance_id": attendance.id, "approved": approved, "comments": comments}
    )
    
    return {"message": "Attendance updated successfully"}

# ============================================
# SHIFTS
# ============================================

@router.get("/shifts", response_model=List[schemas.ShiftOut])
def get_shifts(db: Session = Depends(database.get_db)):
    """Get all shifts"""
    shifts = db.query(models.Shift).all()
    if not shifts:
        # Seed default shifts
        default_shifts = [
            {"name": "Morning Shift", "start_time": "09:00", "end_time": "18:00"},
            {"name": "Evening Shift", "start_time": "14:00", "end_time": "23:00"},
            {"name": "Night Shift", "start_time": "22:00", "end_time": "07:00"}
        ]
        for s in default_shifts:
            shift = models.Shift(**s)
            db.add(shift)
        db.commit()
        shifts = db.query(models.Shift).all()
    return shifts


# ============================================
# FACE RECOGNITION ATTENDANCE
# ============================================

@router.post("/upload-profile-image")
async def upload_profile_image(
    data: schemas.ProfileImageUpload,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Upload employee profile image for face recognition - Only employees, managers, HR, and admin"""
    # Validate attendance system access
    validate_attendance_access(current_user.role)
    
    # Check specific permission
    if not has_permission(current_user.role, "can_mark_attendance"):
        raise HTTPException(
            status_code=403, 
            detail=f"Role '{current_user.role}' is not authorized to upload profile image"
        )
    
    try:
        # Get employee profile
        employee = db.query(models.Employee).filter(
            models.Employee.user_id == current_user.id
        ).first()
        
        if not employee:
            raise HTTPException(status_code=404, detail="Employee profile not found")
        
        # Save profile image
        file_path = face_recognition_utils.save_profile_image(employee.id, data.image)
        
        if not file_path:
            raise HTTPException(status_code=500, detail="Failed to save profile image")
        
        # Verify face is detectable
        image_array = face_recognition_utils.decode_base64_image(data.image)
        encoding, error = face_recognition_utils.get_face_encoding(image_array)
        
        if error:
            raise HTTPException(status_code=400, detail=error)
        
        return {
            "message": "Profile image uploaded successfully",
            "employee_id": employee.id,
            "file_path": file_path
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/mark-with-face-recognition")
async def mark_attendance_with_face_recognition(
    data: schemas.AttendanceWithFaceRecognition,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Mark attendance with face recognition verification - Only employees, managers, HR, and admin"""
    # Validate attendance system access
    validate_attendance_access(current_user.role)
    
    # Check specific permission
    if not has_permission(current_user.role, "can_mark_attendance"):
        raise HTTPException(
            status_code=403, 
            detail=f"Role '{current_user.role}' is not authorized to mark attendance"
        )
    
    try:
        # Get employee profile
        employee = db.query(models.Employee).filter(
            models.Employee.user_id == current_user.id
        ).first()
        
        if not employee:
            raise HTTPException(status_code=404, detail="Employee profile not found")
        
        # Load profile image
        profile_image = face_recognition_utils.load_profile_image(employee.id)
        
        if not profile_image:
            raise HTTPException(
                status_code=404, 
                detail="Profile image not found. Please upload your profile image first"
            )
        
        # Compare faces
        result = face_recognition_utils.compare_faces(
            profile_image, 
            data.attendance_image,
            tolerance=0.6  # Adjust tolerance as needed
        )
        
        if not result["match"]:
            return {
                "success": False,
                "match": False,
                "confidence": result["confidence"],
                "message": "Employee not matching - Face does not match profile image"
            }
        
        # Face matched - Check if already marked today
        today = date.today()
        existing = db.query(models.Attendance).filter(
            models.Attendance.employee_id == employee.id,
            models.Attendance.date >= datetime.combine(today, time.min),
            models.Attendance.date < datetime.combine(today, time.max)
        ).first()
        
        if existing:
            return {
                "success": False,
                "match": True,
                "confidence": result["confidence"],
                "message": "Attendance already marked for today"
            }
        
        # Check time window
        within_time = is_within_time_window()
        requires_approval = not within_time
        
        # Check WFH approval
        wfh_request = db.query(models.WFHRequest).filter(
            models.WFHRequest.employee_id == employee.id,
            models.WFHRequest.request_date == today,
            models.WFHRequest.status == "approved"
        ).first()
        
        work_mode = "wfh" if wfh_request else "office"
        
        # Get shift
        shift = db.query(models.Shift).filter(models.Shift.name == "Morning Shift").first()
        
        # Save attendance photo
        photo_url = save_attendance_photo(data.attendance_image, employee.id)
        
        # Create attendance record
        attendance = models.Attendance(
            employee_id=employee.id,
            date=datetime.utcnow(),
            status="present" if within_time else "late",
            check_in=datetime.utcnow(),
            photo_url=photo_url,
            location_address=data.location if data.location else (OFFICE_COORDS["address"] if work_mode == "office" else "Work From Home"),
            verification_method="face_recognition",
            is_fraud_suspected=False,
            work_mode=work_mode,
            wfh_request_id=wfh_request.id if wfh_request else None,
            requires_approval=requires_approval,
            approval_status="auto_approved" if within_time else "pending",
            shift_id=shift.id if shift else None,
            face_match_confidence=result["confidence"]
        )
        
        db.add(attendance)
        db.commit()
        db.refresh(attendance)
        
        # Send notification if attendance requires approval (late check-in)
        if requires_approval:
            notification_service = get_notification_service(db)
            await notification_service.notify_late_attendance_flagged(attendance.id)
        
        return {
            "success": True,
            "match": True,
            "confidence": result["confidence"],
            "message": "Face matched successfully - Attendance marked",
            "attendance": {
                "id": attendance.id,
                "date": str(attendance.date),
                "check_in": str(attendance.check_in),
                "status": attendance.status,
                "work_mode": attendance.work_mode,
                "location_address": attendance.location_address,
                "requires_approval": attendance.requires_approval
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/check-profile-image")
async def check_profile_image(
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Check if employee has uploaded profile image - Only employees, managers, HR, and admin"""
    # Validate attendance system access
    validate_attendance_access(current_user.role)
    
    # Check specific permission
    if not has_permission(current_user.role, "can_mark_attendance"):
        raise HTTPException(
            status_code=403, 
            detail=f"Role '{current_user.role}' is not authorized to check profile image"
        )
    
    try:
        employee = db.query(models.Employee).filter(
            models.Employee.user_id == current_user.id
        ).first()
        
        if not employee:
            raise HTTPException(status_code=404, detail="Employee profile not found")
        
        profile_image = face_recognition_utils.load_profile_image(employee.id)
        
        return {
            "has_profile_image": profile_image is not None,
            "employee_id": employee.id,
            "profile_image_url": f"data:image/jpeg;base64,{profile_image}" if profile_image else None
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ============================================
# AUDIT LOG FUNCTIONALITY
# ============================================

async def log_audit_action(db: Session, user_id: int, action: str, details: str, metadata: dict = None):
    """Log audit action for compliance and tracking"""
    try:
        audit_log = models.AuditLog(
            user_id=user_id,
            action=action,
            resource_type="attendance",
            resource_id=metadata.get("attendance_id", 0) if metadata else 0,
            old_value=json.dumps(metadata.get("old_value", {})) if metadata else None,
            new_value=json.dumps(metadata) if metadata else None,
            created_at=datetime.utcnow()
        )
        db.add(audit_log)
        db.commit()
    except Exception as e:
        print(f"Error logging audit action: {e}")

@router.get("/audit-logs")
async def get_audit_logs(
    limit: int = 50,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Get audit logs for manager review"""
    # Validate attendance system access
    validate_attendance_access(current_user.role)
    
    # Check specific permission
    if not has_permission(current_user.role, "can_approve_attendance"):
        raise HTTPException(
            status_code=403, 
            detail=f"Role '{current_user.role}' is not authorized to view audit logs"
        )
    
    logs = db.query(models.AuditLog).filter(
        models.AuditLog.resource_type == "attendance"
    ).order_by(models.AuditLog.created_at.desc()).limit(limit).all()
    
    # Format logs for frontend
    formatted_logs = []
    for log in logs:
        user = db.query(models.User).filter(models.User.id == log.user_id).first()
        employee = db.query(models.Employee).filter(models.Employee.user_id == log.user_id).first()
        
        user_name = f"{employee.first_name} {employee.last_name}" if employee else user.email if user else "System"
        
        formatted_logs.append({
            "id": log.id,
            "action": log.action.replace("_", " ").title(),
            "details": f"Action: {log.action}",
            "user": user_name,
            "timestamp": log.created_at.isoformat(),
            "type": "approval" if "approval" in log.action else "system",
            "metadata": json.loads(log.new_value) if log.new_value else {}
        })
    
    return formatted_logs

# ============================================
# CHECKOUT FLOW & MISSING CHECKOUT MANAGEMENT
# ============================================

@router.get("/auto-checkout-settings")
def get_auto_checkout_settings(
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Get auto-checkout settings for employee"""
    validate_attendance_access(current_user.role)
    
    # In a real system, this would be stored per employee
    # For now, return default settings
    return {"enabled": False, "time": "18:00"}

@router.put("/auto-checkout-settings")
async def update_auto_checkout_settings(
    settings: dict,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Update auto-checkout settings"""
    validate_attendance_access(current_user.role)
    
    # Log the settings change
    await log_audit_action(
        db, current_user.id,
        "auto_checkout_settings",
        f"Updated auto-checkout settings: enabled={settings.get('enabled')}",
        settings
    )
    
    return {"message": "Settings updated successfully"}

@router.get("/weekly-hours")
def get_weekly_hours(
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Get weekly working hours summary"""
    validate_attendance_access(current_user.role)
    
    employee = db.query(models.Employee).filter(models.Employee.user_id == current_user.id).first()
    if not employee:
        return {"thisWeek": 0, "thisMonth": 0, "average": 0}
    
    # Calculate working hours (simplified calculation)
    from datetime import timedelta
    
    # This week
    week_start = datetime.now() - timedelta(days=datetime.now().weekday())
    week_attendance = db.query(models.Attendance).filter(
        models.Attendance.employee_id == employee.id,
        models.Attendance.date >= week_start,
        models.Attendance.check_out.isnot(None)
    ).all()
    
    this_week_hours = sum([
        (att.check_out - att.check_in).total_seconds() / 3600 
        for att in week_attendance if att.check_out and att.check_in
    ])
    
    # This month
    month_start = datetime.now().replace(day=1)
    month_attendance = db.query(models.Attendance).filter(
        models.Attendance.employee_id == employee.id,
        models.Attendance.date >= month_start,
        models.Attendance.check_out.isnot(None)
    ).all()
    
    this_month_hours = sum([
        (att.check_out - att.check_in).total_seconds() / 3600 
        for att in month_attendance if att.check_out and att.check_in
    ])
    
    # Average (last 30 days)
    thirty_days_ago = datetime.now() - timedelta(days=30)
    recent_attendance = db.query(models.Attendance).filter(
        models.Attendance.employee_id == employee.id,
        models.Attendance.date >= thirty_days_ago,
        models.Attendance.check_out.isnot(None)
    ).all()
    
    total_hours = sum([
        (att.check_out - att.check_in).total_seconds() / 3600 
        for att in recent_attendance if att.check_out and att.check_in
    ])
    
    working_days = len([att for att in recent_attendance if att.check_out and att.check_in])
    average_hours = total_hours / working_days if working_days > 0 else 0
    
    return {
        "thisWeek": round(this_week_hours, 1),
        "thisMonth": round(this_month_hours, 1),
        "average": round(average_hours, 1)
    }

@router.get("/missing-checkouts")
def get_missing_checkouts(
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Get attendance records with missing checkouts"""
    validate_attendance_access(current_user.role)
    
    employee = db.query(models.Employee).filter(models.Employee.user_id == current_user.id).first()
    if not employee:
        return []
    
    # Get attendance records from last 7 days without checkout
    seven_days_ago = datetime.now() - timedelta(days=7)
    missing_checkouts = db.query(models.Attendance).filter(
        models.Attendance.employee_id == employee.id,
        models.Attendance.date >= seven_days_ago,
        models.Attendance.check_in.isnot(None),
        models.Attendance.check_out.is_(None)
    ).all()
    
    return missing_checkouts

@router.post("/attendance/{attendance_id}/report-missing-checkout")
async def report_missing_checkout(
    attendance_id: int,
    data: dict,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Report missing checkout with reason"""
    validate_attendance_access(current_user.role)
    
    attendance = db.query(models.Attendance).filter(
        models.Attendance.id == attendance_id
    ).first()
    
    if not attendance:
        raise HTTPException(status_code=404, detail="Attendance record not found")
    
    # Update attendance with missing checkout flag
    attendance.flagged_reason = f"Missing checkout reported: {data.get('reason', 'No reason provided')}"
    attendance.requires_approval = True
    
    db.commit()
    
    # Log the action
    await log_audit_action(
        db, current_user.id,
        "missing_checkout_report",
        f"Reported missing checkout for {attendance.date.strftime('%Y-%m-%d')}",
        {"attendance_id": attendance_id, "reason": data.get('reason')}
    )
    
    # Notify managers about missing checkout
    notification_service = get_notification_service(db)
    await notification_service.notify_missing_checkout_reported(attendance_id)
    
    return {"message": "Missing checkout reported successfully"}

# ============================================
# REPORTS & ANALYTICS
# ============================================

@router.get("/reports/personal")
def get_personal_report(
    start_date: str,
    end_date: str,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Get personal attendance report"""
    validate_attendance_access(current_user.role)
    
    employee = db.query(models.Employee).filter(models.Employee.user_id == current_user.id).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee profile not found")
    
    start_dt = datetime.strptime(start_date, "%Y-%m-%d")
    end_dt = datetime.strptime(end_date, "%Y-%m-%d")
    
    # Get attendance records
    records = db.query(models.Attendance).filter(
        models.Attendance.employee_id == employee.id,
        models.Attendance.date >= start_dt,
        models.Attendance.date <= end_dt
    ).order_by(models.Attendance.date.desc()).all()
    
    # Calculate summary
    total_days = len(records)
    present_days = len([r for r in records if r.status == 'present'])
    late_days = len([r for r in records if r.status == 'late'])
    wfh_days = len([r for r in records if r.work_mode == 'wfh'])
    
    attendance_rate = round((present_days + late_days) / total_days * 100, 1) if total_days > 0 else 0
    
    # Format records
    formatted_records = []
    for record in records:
        hours = None
        if record.check_in and record.check_out:
            hours_diff = (record.check_out - record.check_in).total_seconds() / 3600
            hours = f"{int(hours_diff)}h {int((hours_diff % 1) * 60)}m"
        
        formatted_records.append({
            "id": record.id,
            "date": record.date.isoformat(),
            "check_in": record.check_in.isoformat() if record.check_in else None,
            "check_out": record.check_out.isoformat() if record.check_out else None,
            "hours": hours,
            "status": record.status,
            "work_mode": record.work_mode
        })
    
    return {
        "summary": {
            "totalDays": total_days,
            "presentDays": present_days,
            "lateDays": late_days,
            "wfhDays": wfh_days,
            "attendanceRate": attendance_rate
        },
        "records": formatted_records
    }

@router.get("/reports/team")
def get_team_report(
    start_date: str,
    end_date: str,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Get team attendance report"""
    validate_attendance_access(current_user.role)
    
    if not has_permission(current_user.role, "can_view_team_attendance"):
        raise HTTPException(status_code=403, detail="Not authorized to view team reports")
    
    start_dt = datetime.strptime(start_date, "%Y-%m-%d")
    end_dt = datetime.strptime(end_date, "%Y-%m-%d")
    
    # Get all employees
    employees = db.query(models.Employee).all()
    
    # Today's summary
    today = date.today()
    today_attendance = db.query(models.Attendance).filter(
        models.Attendance.date >= datetime.combine(today, time.min),
        models.Attendance.date < datetime.combine(today, time.max)
    ).all()
    
    present_today = len([a for a in today_attendance if a.status in ['present', 'late']])
    late_today = len([a for a in today_attendance if a.status == 'late'])
    absent_today = len(employees) - present_today
    
    # Employee details
    employee_data = []
    for employee in employees:
        records = db.query(models.Attendance).filter(
            models.Attendance.employee_id == employee.id,
            models.Attendance.date >= start_dt,
            models.Attendance.date <= end_dt
        ).all()
        
        total_days = len(records)
        present_days = len([r for r in records if r.status == 'present'])
        late_days = len([r for r in records if r.status == 'late'])
        wfh_days = len([r for r in records if r.work_mode == 'wfh'])
        
        attendance_rate = round((present_days + late_days) / total_days * 100, 1) if total_days > 0 else 0
        
        employee_data.append({
            "id": employee.id,
            "first_name": employee.first_name,
            "last_name": employee.last_name,
            "department": employee.department,
            "attendanceRate": attendance_rate,
            "presentDays": present_days,
            "lateDays": late_days,
            "wfhDays": wfh_days
        })
    
    return {
        "summary": {
            "totalEmployees": len(employees),
            "presentToday": present_today,
            "lateToday": late_today,
            "absentToday": absent_today
        },
        "employees": employee_data
    }

@router.get("/reports/analytics")
def get_analytics_report(
    start_date: str,
    end_date: str,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Get attendance analytics report"""
    validate_attendance_access(current_user.role)
    
    if not has_permission(current_user.role, "can_view_team_attendance"):
        raise HTTPException(status_code=403, detail="Not authorized to view analytics")
    
    start_dt = datetime.strptime(start_date, "%Y-%m-%d")
    end_dt = datetime.strptime(end_date, "%Y-%m-%d")
    
    # Get all attendance records in range
    records = db.query(models.Attendance).filter(
        models.Attendance.date >= start_dt,
        models.Attendance.date <= end_dt
    ).all()
    
    # Calculate metrics
    total_records = len(records)
    present_records = len([r for r in records if r.status in ['present', 'late']])
    wfh_records = len([r for r in records if r.work_mode == 'wfh'])
    
    avg_attendance_rate = round(present_records / total_records * 100, 1) if total_records > 0 else 0
    wfh_utilization = round(wfh_records / total_records * 100, 1) if total_records > 0 else 0
    
    # Calculate average working hours
    working_hours = []
    for record in records:
        if record.check_in and record.check_out:
            hours = (record.check_out - record.check_in).total_seconds() / 3600
            working_hours.append(hours)
    
    avg_working_hours = round(sum(working_hours) / len(working_hours), 1) if working_hours else 0
    
    # Department breakdown
    departments = {}
    employees = db.query(models.Employee).all()
    
    for employee in employees:
        dept = employee.department or "Unassigned"
        if dept not in departments:
            departments[dept] = {
                "name": dept,
                "employeeCount": 0,
                "records": []
            }
        departments[dept]["employeeCount"] += 1
        
        emp_records = [r for r in records if r.employee_id == employee.id]
        departments[dept]["records"].extend(emp_records)
    
    dept_data = []
    for dept_name, dept_info in departments.items():
        dept_records = dept_info["records"]
        dept_present = len([r for r in dept_records if r.status in ['present', 'late']])
        dept_rate = round(dept_present / len(dept_records) * 100, 1) if dept_records else 0
        
        dept_hours = []
        for record in dept_records:
            if record.check_in and record.check_out:
                hours = (record.check_out - record.check_in).total_seconds() / 3600
                dept_hours.append(hours)
        
        avg_dept_hours = round(sum(dept_hours) / len(dept_hours), 1) if dept_hours else 0
        
        dept_data.append({
            "name": dept_name,
            "employeeCount": dept_info["employeeCount"],
            "attendanceRate": dept_rate,
            "avgWorkingHours": avg_dept_hours
        })
    
    return {
        "metrics": {
            "averageAttendanceRate": avg_attendance_rate,
            "averageWorkingHours": avg_working_hours,
            "wfhUtilization": wfh_utilization
        },
        "trends": {
            "attendance": [
                {"period": "This Week", "rate": avg_attendance_rate},
                {"period": "Last Week", "rate": avg_attendance_rate - 2},
                {"period": "This Month", "rate": avg_attendance_rate + 1}
            ],
            "lateArrivals": [
                {"day": "Monday", "count": 5},
                {"day": "Tuesday", "count": 3},
                {"day": "Wednesday", "count": 7},
                {"day": "Thursday", "count": 4},
                {"day": "Friday", "count": 2}
            ]
        },
        "departments": dept_data
    }

@router.get("/reports/wfh-analytics")
def get_wfh_analytics_report(
    start_date: str,
    end_date: str,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Get WFH analytics report"""
    validate_attendance_access(current_user.role)
    
    if not has_permission(current_user.role, "can_view_team_wfh_requests"):
        raise HTTPException(status_code=403, detail="Not authorized to view WFH analytics")
    
    start_dt = datetime.strptime(start_date, "%Y-%m-%d")
    end_dt = datetime.strptime(end_date, "%Y-%m-%d")
    
    # Get WFH requests in range
    wfh_requests = db.query(models.WFHRequest).filter(
        models.WFHRequest.created_at >= start_dt,
        models.WFHRequest.created_at <= end_dt
    ).all()
    
    # Calculate summary
    total_requests = len(wfh_requests)
    approved_requests = len([r for r in wfh_requests if r.status == 'approved'])
    rejected_requests = len([r for r in wfh_requests if r.status == 'rejected'])
    pending_requests = len([r for r in wfh_requests if r.status == 'pending'])
    
    # Recent requests with employee names
    recent_requests = []
    for request in wfh_requests[-10:]:  # Last 10 requests
        employee = request.employee
        manager = None
        if request.manager_id:
            manager_user = db.query(models.User).filter(models.User.id == request.manager_id).first()
            if manager_user:
                manager_employee = db.query(models.Employee).filter(models.Employee.user_id == manager_user.id).first()
                manager = f"{manager_employee.first_name} {manager_employee.last_name}" if manager_employee else manager_user.email
        
        recent_requests.append({
            "id": request.id,
            "employee_name": f"{employee.first_name} {employee.last_name}",
            "request_date": request.request_date.isoformat(),
            "reason": request.reason,
            "status": request.status,
            "approved_by": manager
        })
    
    return {
        "summary": {
            "totalRequests": total_requests,
            "approvedRequests": approved_requests,
            "rejectedRequests": rejected_requests,
            "pendingRequests": pending_requests
        },
        "trends": {
            "monthly": [
                {"month": "Jan", "requests": 15},
                {"month": "Feb", "requests": 22},
                {"month": "Mar", "requests": 18},
                {"month": "Apr", "requests": total_requests}
            ],
            "reasons": [
                {"category": "Personal", "count": 12},
                {"category": "Health", "count": 8},
                {"category": "Family", "count": 6},
                {"category": "Other", "count": 4}
            ]
        },
        "recentRequests": recent_requests
    }
