from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.orm import Session
from typing import Dict, Any, Optional
from datetime import datetime
from app import database, models
from app.dependencies import get_current_user
from app.admin_service import AdminService
from app.role_utils import require_roles
from pydantic import BaseModel
import json

router = APIRouter(
    prefix="/admin",
    tags=["admin"]
)

# Request/Response Models
class CapabilitiesUpdate(BaseModel):
    capabilities: Dict[str, Any]

class RoleUpdate(BaseModel):
    new_role: str

class SystemSettingsUpdate(BaseModel):
    settings: Dict[str, Any]

class UserQuery(BaseModel):
    skip: int = 0
    limit: int = 100
    role_filter: Optional[str] = None

class AuditLogQuery(BaseModel):
    skip: int = 0
    limit: int = 100
    action_filter: Optional[str] = None
    user_filter: Optional[int] = None
    days_back: int = 30

# Helper function to get client info
def get_client_info(request: Request) -> Dict[str, str]:
    return {
        "ip_address": request.client.host if request.client else "unknown",
        "user_agent": request.headers.get("user-agent", "unknown")
    }

@router.get("/capabilities")
async def get_capabilities(
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Get all role-based module capabilities"""
    if current_user.role not in ['admin', 'super_admin']:
        raise HTTPException(status_code=403, detail="Only super admins can access system capabilities")
    
    admin_service = AdminService(db)
    return admin_service.get_system_capabilities()

@router.post("/capabilities")
async def save_capabilities(
    capabilities_update: CapabilitiesUpdate,
    request: Request,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Save role-based module capabilities"""
    if current_user.role not in ['admin', 'super_admin']:
        raise HTTPException(status_code=403, detail="Only super admins can modify system capabilities")
    
    admin_service = AdminService(db)
    
    # Log the capability change attempt
    client_info = get_client_info(request)
    admin_service.create_audit_log(
        user_id=current_user.id,
        action="capability_change_attempt",
        resource_type="system_capabilities",
        resource_id=0,
        new_value=json.dumps(capabilities_update.capabilities),
        ip_address=client_info["ip_address"],
        user_agent=client_info["user_agent"],
        details=f"Capability change attempted by {current_user.email}"
    )
    
    result = admin_service.save_system_capabilities(capabilities_update.capabilities, current_user.id)
    
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["message"])
    
    return result

@router.get("/capabilities/{role}")
async def get_role_capabilities(
    role: str,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Get capabilities for a specific role"""
    # Users can view their own role capabilities, admins can view any
    if current_user.role not in ['admin', 'super_admin'] and current_user.role != role:
        raise HTTPException(status_code=403, detail="You can only view your own role capabilities")
    
    admin_service = AdminService(db)
    capabilities = admin_service.get_role_capabilities(role)
    
    if not capabilities:
        raise HTTPException(status_code=404, detail=f"Role not found: {role}")
    
    return capabilities

@router.get("/users/stats")
async def get_user_stats(
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Get comprehensive user statistics"""
    if current_user.role not in ['admin', 'super_admin']:
        raise HTTPException(status_code=403, detail="Only super admins can access user statistics")
    
    admin_service = AdminService(db)
    return admin_service.get_user_statistics()

@router.get("/users")
async def get_users_list(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    role_filter: Optional[str] = Query(None),
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Get paginated list of users with optional filtering"""
    if current_user.role not in ['admin', 'super_admin']:
        raise HTTPException(status_code=403, detail="Only super admins can access user lists")
    
    admin_service = AdminService(db)
    return admin_service.get_users_list(skip, limit, role_filter)

@router.patch("/users/{user_id}/role")
async def update_user_role(
    user_id: int,
    role_update: RoleUpdate,
    request: Request,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Update a user's role"""
    if current_user.role not in ['admin', 'super_admin']:
        raise HTTPException(status_code=403, detail="Only super admins can change user roles")
    
    admin_service = AdminService(db)
    
    # Log the role change attempt
    client_info = get_client_info(request)
    admin_service.create_audit_log(
        user_id=current_user.id,
        action="role_change_attempt",
        resource_type="user",
        resource_id=user_id,
        new_value=role_update.new_role,
        ip_address=client_info["ip_address"],
        user_agent=client_info["user_agent"],
        details=f"Role change attempted for user {user_id} by {current_user.email}"
    )
    
    result = admin_service.update_user_role(user_id, role_update.new_role, current_user.id)
    
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["message"])
    
    return result

@router.get("/audit-logs")
async def get_audit_logs(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    action_filter: Optional[str] = Query(None),
    user_filter: Optional[int] = Query(None),
    days_back: int = Query(30, ge=1, le=365),
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Get audit logs with filtering and pagination"""
    if current_user.role not in ['admin', 'super_admin']:
        raise HTTPException(status_code=403, detail="Only super admins can access audit logs")
    
    admin_service = AdminService(db)
    return admin_service.get_audit_logs(skip, limit, action_filter, user_filter, days_back)

@router.get("/system-settings")
async def get_system_settings(
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Get system settings"""
    if current_user.role not in ['admin', 'super_admin']:
        raise HTTPException(status_code=403, detail="Only super admins can access system settings")
    
    admin_service = AdminService(db)
    return admin_service.get_system_settings()

@router.post("/system-settings")
async def save_system_settings(
    settings_update: SystemSettingsUpdate,
    request: Request,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Save system settings"""
    if current_user.role not in ['admin', 'super_admin']:
        raise HTTPException(status_code=403, detail="Only super admins can modify system settings")
    
    admin_service = AdminService(db)
    
    # Log the settings change attempt
    client_info = get_client_info(request)
    admin_service.create_audit_log(
        user_id=current_user.id,
        action="system_setting_change_attempt",
        resource_type="system_settings",
        resource_id=0,
        new_value=json.dumps(settings_update.settings),
        ip_address=client_info["ip_address"],
        user_agent=client_info["user_agent"],
        details=f"System settings change attempted by {current_user.email}"
    )
    
    result = admin_service.save_system_settings(settings_update.settings, current_user.id)
    
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["message"])
    
    return result

@router.get("/permission-templates")
async def get_permission_templates(
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Get predefined permission templates"""
    if current_user.role not in ['admin', 'super_admin']:
        raise HTTPException(status_code=403, detail="Only super admins can access permission templates")
    
    admin_service = AdminService(db)
    return admin_service.get_permission_templates()

@router.post("/permission-templates/{template_name}/apply")
async def apply_permission_template(
    template_name: str,
    request: Request,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Apply a permission template"""
    if current_user.role not in ['admin', 'super_admin']:
        raise HTTPException(status_code=403, detail="Only super admins can apply permission templates")
    
    admin_service = AdminService(db)
    
    # Log the template application attempt
    client_info = get_client_info(request)
    admin_service.create_audit_log(
        user_id=current_user.id,
        action="template_apply_attempt",
        resource_type="permission_template",
        resource_id=0,
        new_value=template_name,
        ip_address=client_info["ip_address"],
        user_agent=client_info["user_agent"],
        details=f"Permission template '{template_name}' application attempted by {current_user.email}"
    )
    
    result = admin_service.apply_permission_template(template_name, current_user.id)
    
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["message"])
    
    return result

@router.post("/users/{user_id}/activate")
async def activate_user(
    user_id: int,
    request: Request,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Activate a user account"""
    if current_user.role not in ['admin', 'super_admin']:
        raise HTTPException(status_code=403, detail="Only super admins can activate users")
    
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if user.is_active:
        raise HTTPException(status_code=400, detail="User is already active")
    
    user.is_active = True
    db.commit()
    
    # Log the activation
    admin_service = AdminService(db)
    client_info = get_client_info(request)
    admin_service.create_audit_log(
        user_id=current_user.id,
        action="user_activate",
        resource_type="user",
        resource_id=user_id,
        old_value="inactive",
        new_value="active",
        ip_address=client_info["ip_address"],
        user_agent=client_info["user_agent"],
        details=f"User {user.email} activated by {current_user.email}"
    )
    
    return {"success": True, "message": "User activated successfully"}

@router.post("/users/{user_id}/deactivate")
async def deactivate_user(
    user_id: int,
    request: Request,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Deactivate a user account"""
    if current_user.role not in ['admin', 'super_admin']:
        raise HTTPException(status_code=403, detail="Only super admins can deactivate users")
    
    if current_user.id == user_id:
        raise HTTPException(status_code=400, detail="Cannot deactivate your own account")
    
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if not user.is_active:
        raise HTTPException(status_code=400, detail="User is already inactive")
    
    user.is_active = False
    db.commit()
    
    # Log the deactivation
    admin_service = AdminService(db)
    client_info = get_client_info(request)
    admin_service.create_audit_log(
        user_id=current_user.id,
        action="user_deactivate",
        resource_type="user",
        resource_id=user_id,
        old_value="active",
        new_value="inactive",
        ip_address=client_info["ip_address"],
        user_agent=client_info["user_agent"],
        details=f"User {user.email} deactivated by {current_user.email}"
    )
    
    return {"success": True, "message": "User deactivated successfully"}

@router.get("/health")
async def admin_health_check():
    """Admin service health check"""
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "service": "admin"
    }

@router.post("/create-sample-audit-logs")
async def create_sample_audit_logs(
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Create sample audit logs for testing (development only)"""
    if current_user.role not in ['admin', 'super_admin']:
        raise HTTPException(status_code=403, detail="Only super admins can create sample audit logs")
    
    admin_service = AdminService(db)
    
    # Create some sample audit logs
    sample_logs = [
        {
            "action": "capability_change",
            "resource_type": "system_capabilities",
            "resource_id": 0,
            "details": "System capabilities updated for testing"
        },
        {
            "action": "role_change", 
            "resource_type": "user",
            "resource_id": current_user.id,
            "old_value": "employee",
            "new_value": "admin",
            "details": f"Role changed for testing by {current_user.email}"
        },
        {
            "action": "login",
            "resource_type": "session",
            "resource_id": current_user.id,
            "details": f"User {current_user.email} logged in"
        },
        {
            "action": "system_setting_change",
            "resource_type": "system_settings",
            "resource_id": 0,
            "old_value": '{"timeout": 30}',
            "new_value": '{"timeout": 60}',
            "details": "Session timeout updated"
        }
    ]
    
    created_count = 0
    for log_data in sample_logs:
        success = admin_service.create_audit_log(
            user_id=current_user.id,
            action=log_data["action"],
            resource_type=log_data["resource_type"],
            resource_id=log_data["resource_id"],
            old_value=log_data.get("old_value"),
            new_value=log_data.get("new_value"),
            ip_address="127.0.0.1",
            user_agent="Sample-Agent/1.0",
            details=log_data["details"]
        )
        if success:
            created_count += 1
    
    return {
        "success": True,
        "message": f"Created {created_count} sample audit logs",
        "created_count": created_count
    }

# Permission validation endpoint
@router.post("/validate-permission")
async def validate_permission(
    module: str,
    action: str,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Validate if current user has permission for specific action"""
    admin_service = AdminService(db)
    has_permission = admin_service.validate_user_permission(current_user.role, module, action)
    
    return {
        "user_role": current_user.role,
        "module": module,
        "action": action,
        "has_permission": has_permission
    }
