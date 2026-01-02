from functools import wraps
from fastapi import HTTPException, status, Depends
from typing import List

def require_roles(allowed_roles: List[str]):
    """
    Decorator to enforce role-based access control
    """
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Extract current_user from kwargs
            current_user = kwargs.get('current_user')
            if not current_user:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Authentication required"
                )
            
            if current_user.role not in allowed_roles:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Access denied. Required roles: {', '.join(allowed_roles)}. Your role: {current_user.role}"
                )
            
            return await func(*args, **kwargs)
        return wrapper
    return decorator

def require_role(allowed_roles: List[str]):
    """
    Dependency function to enforce role-based access control
    """
    def check_role(current_user):
        if not current_user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Authentication required"
            )
        
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Required roles: {', '.join(allowed_roles)}. Your role: {current_user.role}"
            )
        
        return current_user
    
    return check_role

def check_role_access(user_role: str, required_roles: List[str]) -> bool:
    """
    Check if user role has access to specific functionality
    """
    return user_role in required_roles

def get_role_permissions():
    """
    Define role-based permissions for the system
    """
    return {
        "super_admin": {
            "can_mark_attendance": True,
            "can_view_own_attendance": True,
            "can_view_team_attendance": True,
            "can_view_all_attendance": True,
            "can_approve_attendance": True,
            "can_create_wfh_request": True,
            "can_view_own_wfh_requests": True,
            "can_view_team_wfh_requests": True,
            "can_approve_wfh_requests": True,
            "can_manage_shifts": True,
            "can_manage_holidays": True,
            "can_manage_assets": True,
            "can_approve_asset_requests": True,
            # Payroll permissions
            "can_view_own_payroll": True,
            "can_view_all_payroll": True,
            "can_calculate_payroll": True,
            "can_approve_payroll": True,
            "can_manage_salary_structures": True,
            "can_export_payroll": True,
            "can_manage_payroll_config": True
        },
        "admin": {
            "can_mark_attendance": True,
            "can_view_own_attendance": True,
            "can_view_team_attendance": True,
            "can_view_all_attendance": True,
            "can_approve_attendance": True,
            "can_create_wfh_request": True,
            "can_view_own_wfh_requests": True,
            "can_view_team_wfh_requests": True,
            "can_approve_wfh_requests": True,
            "can_manage_shifts": True,
            "can_manage_holidays": True,
            "can_manage_assets": True,
            "can_approve_asset_requests": True,
            # Payroll permissions
            "can_view_own_payroll": True,
            "can_view_all_payroll": True,
            "can_calculate_payroll": True,
            "can_approve_payroll": True,
            "can_manage_salary_structures": True,
            "can_export_payroll": True,
            "can_manage_payroll_config": True
        },
        "hr": {
            "can_mark_attendance": True,
            "can_view_own_attendance": True,
            "can_view_team_attendance": True,
            "can_view_all_attendance": True,
            "can_approve_attendance": True,
            "can_create_wfh_request": True,
            "can_view_own_wfh_requests": True,
            "can_view_team_wfh_requests": True,
            "can_approve_wfh_requests": True,
            "can_manage_shifts": True,
            "can_manage_holidays": True,
            "can_manage_assets": False,
            "can_approve_asset_requests": True,
            # Payroll permissions
            "can_view_own_payroll": True,
            "can_view_all_payroll": True,
            "can_calculate_payroll": True,
            "can_approve_payroll": False,  # HR can calculate but not approve
            "can_manage_salary_structures": True,
            "can_export_payroll": True,
            "can_manage_payroll_config": False
        },
        "hr_manager": {
            "can_mark_attendance": True,
            "can_view_own_attendance": True,
            "can_view_team_attendance": True,
            "can_view_all_attendance": True,
            "can_approve_attendance": True,
            "can_create_wfh_request": True,
            "can_view_own_wfh_requests": True,
            "can_view_team_wfh_requests": True,
            "can_approve_wfh_requests": True,
            "can_manage_shifts": True,
            "can_manage_holidays": True,
            "can_manage_assets": False,
            "can_approve_asset_requests": True,
            # Payroll permissions
            "can_view_own_payroll": True,
            "can_view_all_payroll": True,
            "can_calculate_payroll": True,
            "can_approve_payroll": True,
            "can_manage_salary_structures": True,
            "can_export_payroll": True,
            "can_manage_payroll_config": True
        },
        "manager": {
            "can_mark_attendance": True,
            "can_view_own_attendance": True,
            "can_view_team_attendance": True,
            "can_view_all_attendance": False,
            "can_approve_attendance": True,
            "can_create_wfh_request": True,
            "can_view_own_wfh_requests": True,
            "can_view_team_wfh_requests": True,
            "can_approve_wfh_requests": True,
            "can_manage_shifts": False,
            "can_manage_holidays": False,
            "can_manage_assets": False,
            "can_approve_asset_requests": True,
            # Payroll permissions
            "can_view_own_payroll": True,
            "can_view_all_payroll": False,  # Can only view team payroll
            "can_calculate_payroll": False,
            "can_approve_payroll": False,
            "can_manage_salary_structures": False,
            "can_export_payroll": False,
            "can_manage_payroll_config": False
        },
        "assets_team": {
            "can_mark_attendance": True,
            "can_view_own_attendance": True,
            "can_view_team_attendance": False,
            "can_view_all_attendance": False,
            "can_approve_attendance": False,
            "can_create_wfh_request": True,
            "can_view_own_wfh_requests": True,
            "can_view_team_wfh_requests": False,
            "can_approve_wfh_requests": False,
            "can_manage_shifts": False,
            "can_manage_holidays": False,
            "can_manage_assets": True,
            "can_approve_asset_requests": False,
            # Payroll permissions
            "can_view_own_payroll": True,
            "can_view_all_payroll": False,
            "can_calculate_payroll": False,
            "can_approve_payroll": False,
            "can_manage_salary_structures": False,
            "can_export_payroll": False,
            "can_manage_payroll_config": False
        },
        "employee": {
            "can_mark_attendance": True,
            "can_view_own_attendance": True,
            "can_view_team_attendance": False,
            "can_view_all_attendance": False,
            "can_approve_attendance": False,
            "can_create_wfh_request": True,
            "can_view_own_wfh_requests": True,
            "can_view_team_wfh_requests": False,
            "can_approve_wfh_requests": False,
            "can_manage_shifts": False,
            "can_manage_holidays": False,
            "can_manage_assets": False,
            "can_approve_asset_requests": False,
            # Payroll permissions
            "can_view_own_payroll": True,
            "can_view_all_payroll": False,
            "can_calculate_payroll": False,
            "can_approve_payroll": False,
            "can_manage_salary_structures": False,
            "can_export_payroll": False,
            "can_manage_payroll_config": False
        },
        "candidate": {
            # Candidates have NO access to attendance system or payroll
            "can_mark_attendance": False,
            "can_view_own_attendance": False,
            "can_view_team_attendance": False,
            "can_view_all_attendance": False,
            "can_approve_attendance": False,
            "can_create_wfh_request": False,
            "can_view_own_wfh_requests": False,
            "can_view_team_wfh_requests": False,
            "can_approve_wfh_requests": False,
            "can_manage_shifts": False,
            "can_manage_holidays": False,
            "can_manage_assets": False,
            "can_approve_asset_requests": False,
            # Payroll permissions
            "can_view_own_payroll": False,
            "can_view_all_payroll": False,
            "can_calculate_payroll": False,
            "can_approve_payroll": False,
            "can_manage_salary_structures": False,
            "can_export_payroll": False,
            "can_manage_payroll_config": False
        }
    }

def has_permission(user_role: str, permission: str) -> bool:
    """
    Check if user role has specific permission
    """
    permissions = get_role_permissions()
    role_permissions = permissions.get(user_role, {})
    return role_permissions.get(permission, False)

def validate_attendance_access(user_role: str):
    """
    Validate if user can access attendance system at all
    Updated to include super_admin role and assets_team
    """
    if user_role == "candidate":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Candidates do not have access to attendance system. Please contact HR for assistance."
        )
    
    if user_role not in ["super_admin", "admin", "hr", "manager", "employee", "assets_team"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid user role for attendance system access"
        )