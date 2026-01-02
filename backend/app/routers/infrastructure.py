"""
Infrastructure Management API Routes
"""

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel

from ..database import get_db
from ..dependencies import get_current_user
from ..models import User
from ..infrastructure_service import InfrastructureService
from ..role_utils import require_role

router = APIRouter(prefix="/infrastructure", tags=["infrastructure"])

# Pydantic models
class InfrastructureRequestCreate(BaseModel):
    employee_id: int
    laptop_required: bool = True
    email_setup_required: bool = True
    wifi_setup_required: bool = True
    id_card_required: bool = True
    biometric_setup_required: bool = True
    additional_requirements: Optional[str] = None
    priority: str = "normal"
    request_notes: Optional[str] = None

class SetupProgressUpdate(BaseModel):
    setup_type: str  # laptop, email, wifi, id_card, biometric
    completed: bool
    additional_info: Optional[str] = None

@router.post("/requests")
async def create_infrastructure_request(
    request_data: InfrastructureRequestCreate,
    current_user: User = Depends(require_role(["hr", "admin"])),
    db: Session = Depends(get_db)
):
    """Create infrastructure setup request (HR/Admin only)"""
    service = InfrastructureService(db)
    
    result = service.create_infrastructure_request(
        employee_id=request_data.employee_id,
        requested_by=current_user.id,
        laptop_required=request_data.laptop_required,
        email_setup_required=request_data.email_setup_required,
        wifi_setup_required=request_data.wifi_setup_required,
        id_card_required=request_data.id_card_required,
        biometric_setup_required=request_data.biometric_setup_required,
        additional_requirements=request_data.additional_requirements,
        priority=request_data.priority,
        request_notes=request_data.request_notes
    )
    
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["message"])
    
    return result

@router.get("/requests/pending")
async def get_pending_requests(
    current_user: User = Depends(require_role(["assets_team", "admin"])),
    db: Session = Depends(get_db)
):
    """Get all pending infrastructure requests (Assets team)"""
    service = InfrastructureService(db)
    return service.get_pending_requests()

@router.get("/requests/my-assignments")
async def get_my_assignments(
    current_user: User = Depends(require_role(["assets_team", "admin"])),
    db: Session = Depends(get_db)
):
    """Get requests assigned to current technician"""
    service = InfrastructureService(db)
    return service.get_technician_requests(current_user.id)

@router.get("/requests/{request_id}")
async def get_request_details(
    request_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get detailed request information"""
    service = InfrastructureService(db)
    result = service.get_request_details(request_id)
    
    if "error" in result:
        raise HTTPException(status_code=404, detail=result["error"])
    
    return result

@router.post("/requests/{request_id}/assign")
async def assign_request(
    request_id: int,
    current_user: User = Depends(require_role(["assets_team", "admin"])),
    db: Session = Depends(get_db)
):
    """Assign infrastructure request to current technician"""
    service = InfrastructureService(db)
    
    result = service.assign_request_to_technician(request_id, current_user.id)
    
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["message"])
    
    return result

@router.post("/requests/{request_id}/start")
async def start_setup(
    request_id: int,
    current_user: User = Depends(require_role(["assets_team", "admin"])),
    db: Session = Depends(get_db)
):
    """Start infrastructure setup process"""
    service = InfrastructureService(db)
    
    result = service.start_infrastructure_setup(request_id, current_user.id)
    
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["message"])
    
    return result

@router.post("/requests/{request_id}/update-progress")
async def update_setup_progress(
    request_id: int,
    setup_type: str = Form(...),
    completed: bool = Form(...),
    additional_info: Optional[str] = Form(None),
    photo: Optional[UploadFile] = File(None),
    current_user: User = Depends(require_role(["assets_team", "admin"])),
    db: Session = Depends(get_db)
):
    """Update progress of specific setup item with photo"""
    service = InfrastructureService(db)
    
    result = service.update_setup_progress(
        request_id=request_id,
        technician_id=current_user.id,
        setup_type=setup_type,
        completed=completed,
        photo_file=photo,
        additional_info=additional_info
    )
    
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["message"])
    
    return result

@router.post("/requests/{request_id}/complete")
async def complete_setup(
    request_id: int,
    completion_notes: str = Form(...),
    completion_photo: Optional[UploadFile] = File(None),
    handover_photo: Optional[UploadFile] = File(None),
    current_user: User = Depends(require_role(["assets_team", "admin"])),
    db: Session = Depends(get_db)
):
    """Complete infrastructure setup with final photos"""
    service = InfrastructureService(db)
    
    result = service.complete_infrastructure_setup(
        request_id=request_id,
        technician_id=current_user.id,
        completion_notes=completion_notes,
        completion_photo=completion_photo,
        handover_photo=handover_photo
    )
    
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["message"])
    
    return result

# Quick action endpoint for HR/Admin to request infrastructure for employee
@router.post("/quick-request/{employee_id}")
async def quick_infrastructure_request(
    employee_id: int,
    current_user: User = Depends(require_role(["hr", "admin"])),
    db: Session = Depends(get_db)
):
    """Quick infrastructure request for new employee (standard setup)"""
    service = InfrastructureService(db)
    
    result = service.create_infrastructure_request(
        employee_id=employee_id,
        requested_by=current_user.id,
        laptop_required=True,
        email_setup_required=True,
        wifi_setup_required=True,
        id_card_required=True,
        biometric_setup_required=True,
        additional_requirements="Standard new employee setup",
        priority="normal",
        request_notes="Auto-generated request for new employee onboarding"
    )
    
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["message"])
    
    return result