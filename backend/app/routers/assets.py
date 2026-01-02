"""
Asset Management API Routes
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime

from ..database import get_db
from ..dependencies import get_current_user
from ..models import User
from ..asset_management_service import AssetManagementService
from ..role_utils import require_role

router = APIRouter(prefix="/assets", tags=["assets"])

# Pydantic models for request/response
class AssetRequestCreate(BaseModel):
    employee_id: int
    request_type: str  # new_employee, replacement, additional, complaint
    requested_assets: List[str]
    reason: Optional[str] = None
    business_justification: Optional[str] = None
    priority: str = "normal"

class ComplaintCreate(BaseModel):
    title: str
    description: str
    complaint_type: str  # hardware_issue, software_issue, damage, theft, other
    asset_id: Optional[int] = None
    priority: str = "normal"
    impact_level: str = "medium"

class AssetAssignmentItem(BaseModel):
    asset_id: int
    condition: str = "good"

class FulfillRequest(BaseModel):
    asset_assignments: List[AssetAssignmentItem]
    notes: Optional[str] = None

class ApprovalRequest(BaseModel):
    notes: Optional[str] = None

class ComplaintResolution(BaseModel):
    resolution_notes: str
    resolution_action: str

@router.post("/requests")
async def create_asset_request(
    request_data: AssetRequestCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create new asset request"""
    service = AssetManagementService(db)
    
    result = service.create_asset_request(
        employee_id=request_data.employee_id,
        request_type=request_data.request_type,
        requested_assets=request_data.requested_assets,
        reason=request_data.reason,
        business_justification=request_data.business_justification,
        priority=request_data.priority,
        requested_by=current_user.id
    )
    
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["message"])
    
    return result

@router.get("/requests/pending-manager")
async def get_pending_manager_requests(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get asset requests pending manager approval"""
    if current_user.role not in ["manager", "admin"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    service = AssetManagementService(db)
    return service.get_pending_requests_for_manager(current_user.id)

@router.get("/requests/pending-hr")
async def get_pending_hr_requests(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get asset requests pending HR approval"""
    if current_user.role not in ["hr", "admin"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    service = AssetManagementService(db)
    return service.get_pending_requests_for_hr()

@router.get("/requests/assets-team")
async def get_assets_team_requests(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get requests for assets team"""
    if current_user.role not in ["assets_team", "admin"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    service = AssetManagementService(db)
    return service.get_requests_for_assets_team()

@router.post("/requests/{request_id}/approve-manager")
async def approve_by_manager(
    request_id: int,
    approval_data: ApprovalRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Manager approves asset request"""
    if current_user.role not in ["manager", "admin"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    service = AssetManagementService(db)
    
    result = service.approve_by_manager(
        request_id=request_id,
        manager_id=current_user.id,
        notes=approval_data.notes
    )
    
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["message"])
    
    return result

@router.post("/requests/{request_id}/approve-hr")
async def approve_by_hr(
    request_id: int,
    approval_data: ApprovalRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """HR approves asset request"""
    if current_user.role not in ["hr", "admin"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    service = AssetManagementService(db)
    
    result = service.approve_by_hr(
        request_id=request_id,
        hr_id=current_user.id,
        notes=approval_data.notes
    )
    
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["message"])
    
    return result

@router.post("/requests/{request_id}/assign-team")
async def assign_to_assets_team(
    request_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Assign request to assets team member"""
    if current_user.role not in ["assets_team", "admin"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    service = AssetManagementService(db)
    
    result = service.assign_to_assets_team(
        request_id=request_id,
        assets_team_member_id=current_user.id
    )
    
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["message"])
    
    return result

@router.post("/requests/{request_id}/fulfill")
async def fulfill_asset_request(
    request_id: int,
    fulfill_data: FulfillRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Fulfill asset request by assigning assets"""
    if current_user.role not in ["assets_team", "admin"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    service = AssetManagementService(db)
    
    result = service.fulfill_asset_request(
        request_id=request_id,
        asset_assignments=[assignment.dict() for assignment in fulfill_data.asset_assignments],
        assets_team_member_id=current_user.id,
        notes=fulfill_data.notes
    )
    
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["message"])
    
    return result

@router.post("/complaints")
async def create_complaint(
    complaint_data: ComplaintCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create asset complaint"""
    # Get employee ID from current user
    from ..models import Employee
    employee = db.query(Employee).filter(Employee.user_id == current_user.id).first()
    
    # If no employee profile exists, create a basic one
    if not employee:
        # Extract name from email or use default
        email_parts = current_user.email.split('@')[0]
        first_name = email_parts.capitalize()
        last_name = "User"
        
        # Create basic employee profile
        employee = Employee(
            user_id=current_user.id,
            first_name=first_name,
            last_name=last_name,
            department="Unknown",
            position="Employee"
        )
        db.add(employee)
        db.commit()
        db.refresh(employee)
    
    service = AssetManagementService(db)
    
    result = service.create_complaint(
        employee_id=employee.id,
        title=complaint_data.title,
        description=complaint_data.description,
        complaint_type=complaint_data.complaint_type,
        asset_id=complaint_data.asset_id,
        priority=complaint_data.priority,
        impact_level=complaint_data.impact_level
    )
    
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["message"])
    
    return result

@router.get("/complaints/assets-team")
async def get_complaints_for_assets_team(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get complaints for assets team"""
    # Check if user has required role
    if current_user.role not in ["assets_team", "admin"]:
        raise HTTPException(
            status_code=403, 
            detail=f"Access denied. Required roles: assets_team, admin. Your role: {current_user.role}"
        )
    
    service = AssetManagementService(db)
    return service.get_complaints_for_assets_team()

@router.post("/complaints/{complaint_id}/assign")
async def assign_complaint(
    complaint_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Assign complaint to technician"""
    if current_user.role not in ["assets_team", "admin"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    service = AssetManagementService(db)
    
    result = service.assign_complaint(
        complaint_id=complaint_id,
        technician_id=current_user.id
    )
    
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["message"])
    
    return result

@router.post("/complaints/{complaint_id}/resolve")
async def resolve_complaint(
    complaint_id: int,
    resolution_data: ComplaintResolution,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Resolve complaint"""
    if current_user.role not in ["assets_team", "admin"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    service = AssetManagementService(db)
    
    result = service.resolve_complaint(
        complaint_id=complaint_id,
        resolution_notes=resolution_data.resolution_notes,
        resolution_action=resolution_data.resolution_action,
        technician_id=current_user.id
    )
    
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["message"])
    
    return result

@router.get("/my-assets")
async def get_my_assets(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get assets assigned to current user"""
    from ..models import Employee
    employee = db.query(Employee).filter(Employee.user_id == current_user.id).first()
    
    if not employee:
        raise HTTPException(status_code=404, detail="Employee profile not found")
    
    service = AssetManagementService(db)
    return service.get_employee_assets(employee.id)

@router.get("/my-requests")
async def get_my_requests(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get asset requests by current user"""
    from ..models import Employee
    employee = db.query(Employee).filter(Employee.user_id == current_user.id).first()
    
    if not employee:
        raise HTTPException(status_code=404, detail="Employee profile not found")
    
    service = AssetManagementService(db)
    return service.get_employee_requests(employee.id)

@router.get("/my-complaints")
async def get_my_complaints(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get complaints by current user"""
    from ..models import Employee
    employee = db.query(Employee).filter(Employee.user_id == current_user.id).first()
    
    if not employee:
        raise HTTPException(status_code=404, detail="Employee profile not found")
    
    service = AssetManagementService(db)
    return service.get_employee_complaints(employee.id)

@router.get("/available")
async def get_available_assets(
    asset_type: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get available assets for assignment"""
    if current_user.role not in ["assets_team", "admin"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    from ..models import Asset
    
    query = db.query(Asset).filter(Asset.status == "available")
    
    if asset_type:
        query = query.filter(Asset.type == asset_type)
    
    assets = query.all()
    
    return [
        {
            "id": asset.id,
            "name": asset.name,
            "type": asset.type,
            "serial_number": asset.serial_number,
            "specifications": asset.specifications
        }
        for asset in assets
    ]