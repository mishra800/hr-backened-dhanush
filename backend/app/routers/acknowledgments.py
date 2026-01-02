"""
Asset Acknowledgment API Routes
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Dict, Any
from pydantic import BaseModel
from datetime import datetime

from ..database import get_db
from ..dependencies import get_current_user
from ..models import User, Employee
from ..asset_acknowledgment_service import AssetAcknowledgmentService
from ..role_utils import require_role

router = APIRouter(prefix="/acknowledgments", tags=["acknowledgments"])

class AcknowledgmentCreate(BaseModel):
    employee_name: str
    employee_id_number: str
    department: str
    date_of_joining: datetime
    
    # Received Items
    laptop_received: bool = False
    laptop_serial_number: str = None
    laptop_model: str = None
    laptop_condition: str = None
    
    email_received: bool = False
    email_address: str = None
    email_password_received: bool = False
    
    wifi_access_received: bool = False
    wifi_credentials_received: bool = False
    
    id_card_received: bool = False
    id_card_number: str = None
    
    biometric_setup_completed: bool = False
    biometric_type: str = None
    
    # Additional Items
    monitor_received: bool = False
    monitor_serial_number: str = None
    keyboard_received: bool = False
    mouse_received: bool = False
    headset_received: bool = False
    mobile_received: bool = False
    mobile_number: str = None
    
    # Login Status
    system_login_working: bool = False
    email_login_working: bool = False
    vpn_access_working: bool = False
    
    # Comments
    employee_comments: str = None
    issues_reported: str = None
    additional_requirements: str = None

class AcknowledgmentReview(BaseModel):
    review_status: str  # approved, needs_action
    admin_comments: str = None

@router.post("/submit")
async def submit_acknowledgment(
    acknowledgment_data: AcknowledgmentCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Submit asset acknowledgment form"""
    # Get employee ID from current user
    employee = db.query(Employee).filter(Employee.user_id == current_user.id).first()
    
    if not employee:
        raise HTTPException(status_code=404, detail="Employee profile not found")
    
    service = AssetAcknowledgmentService(db)
    
    result = service.create_acknowledgment(
        employee_id=employee.id,
        acknowledgment_data=acknowledgment_data.dict()
    )
    
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["message"])
    
    return result

@router.get("/check-pending")
async def check_pending_acknowledgment(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Check if employee has pending infrastructure setup to acknowledge"""
    employee = db.query(Employee).filter(Employee.user_id == current_user.id).first()
    
    if not employee:
        raise HTTPException(status_code=404, detail="Employee profile not found")
    
    service = AssetAcknowledgmentService(db)
    return service.check_pending_acknowledgment(employee.id)

@router.get("/my-acknowledgments")
async def get_my_acknowledgments(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get acknowledgments for current employee"""
    employee = db.query(Employee).filter(Employee.user_id == current_user.id).first()
    
    if not employee:
        raise HTTPException(status_code=404, detail="Employee profile not found")
    
    service = AssetAcknowledgmentService(db)
    return service.get_employee_acknowledgments(employee.id)

@router.get("/pending")
async def get_pending_acknowledgments(
    current_user: User = Depends(require_role(["admin", "hr"])),
    db: Session = Depends(get_db)
):
    """Get all pending acknowledgments for admin review"""
    service = AssetAcknowledgmentService(db)
    return service.get_pending_acknowledgments()

@router.get("/{acknowledgment_id}")
async def get_acknowledgment_details(
    acknowledgment_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get detailed acknowledgment information"""
    service = AssetAcknowledgmentService(db)
    result = service.get_acknowledgment_details(acknowledgment_id)
    
    if "error" in result:
        raise HTTPException(status_code=404, detail=result["error"])
    
    return result

@router.post("/{acknowledgment_id}/review")
async def review_acknowledgment(
    acknowledgment_id: int,
    review_data: AcknowledgmentReview,
    current_user: User = Depends(require_role(["admin", "hr"])),
    db: Session = Depends(get_db)
):
    """Admin reviews acknowledgment"""
    service = AssetAcknowledgmentService(db)
    
    result = service.review_acknowledgment(
        acknowledgment_id=acknowledgment_id,
        reviewer_id=current_user.id,
        review_status=review_data.review_status,
        admin_comments=review_data.admin_comments
    )
    
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["message"])
    
    return result