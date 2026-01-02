"""
Enhanced Admin Service
Comprehensive service for managing system capabilities, roles, and security
"""

from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, desc, func
from . import models
from .notification_service import NotificationService
import json
import logging
from enum import Enum

logger = logging.getLogger(__name__)

class AuditAction(Enum):
    CAPABILITY_CHANGE = "capability_change"
    ROLE_CHANGE = "role_change"
    USER_CREATE = "user_create"
    USER_DELETE = "user_delete"
    USER_ACTIVATE = "user_activate"
    USER_DEACTIVATE = "user_deactivate"
    SYSTEM_SETTING_CHANGE = "system_setting_change"
    LOGIN = "login"
    LOGOUT = "logout"
    PERMISSION_GRANT = "permission_grant"
    PERMISSION_REVOKE = "permission_revoke"

class RiskLevel(Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

class AdminService:
    def __init__(self, db: Session):
        self.db = db
        self.notification_service = NotificationService(db)
    
    # ==================== CAPABILITY MANAGEMENT ====================
    
    def get_system_capabilities(self) -> Dict[str, Any]:
        """Get all system capabilities with role-based permissions"""
        try:
            # Try to get from database first
            capabilities = self._get_capabilities_from_db()
            if capabilities:
                return capabilities
            
            # Fallback to default capabilities
            return self._get_default_capabilities()
        except Exception as e:
            logger.error(f"Error fetching capabilities: {e}")
            return self._get_default_capabilities()
    
    def save_system_capabilities(self, capabilities: Dict[str, Any], updated_by: int) -> Dict[str, Any]:
        """Save system capabilities with audit logging"""
        try:
            # Validate capabilities structure
            validation_result = self._validate_capabilities(capabilities)
            if not validation_result["valid"]:
                return {"success": False, "message": validation_result["message"]}
            
            # Get old capabilities for audit
            old_capabilities = self.get_system_capabilities()
            
            # Save to database
            self._save_capabilities_to_db(capabilities, updated_by)
            
            # Create audit log
            self._create_audit_log(
                user_id=updated_by,
                action=AuditAction.CAPABILITY_CHANGE.value,
                resource_type="system_capabilities",
                resource_id=0,
                old_value=json.dumps(old_capabilities),
                new_value=json.dumps(capabilities),
                details=f"System capabilities updated for {len(capabilities)} roles"
            )
            
            # Notify relevant users about capability changes
            self._notify_capability_changes(capabilities, old_capabilities, updated_by)
            
            return {
                "success": True,
                "message": "Capabilities saved successfully",
                "updated_roles": list(capabilities.keys()),
                "total_roles": len(capabilities)
            }
            
        except Exception as e:
            logger.error(f"Error saving capabilities: {e}")
            return {"success": False, "message": f"Failed to save capabilities: {str(e)}"}
    
    def get_role_capabilities(self, role: str) -> Dict[str, Any]:
        """Get capabilities for a specific role"""
        all_capabilities = self.get_system_capabilities()
        return all_capabilities.get(role, {})
    
    def validate_user_permission(self, user_role: str, module: str, action: str) -> bool:
        """Validate if user has permission for specific action"""
        capabilities = self.get_role_capabilities(user_role)
        module_caps = capabilities.get(module, {})
        
        if not module_caps.get("enabled", False):
            return False
        
        permissions = module_caps.get("permissions", [])
        return action in permissions
    
    # ==================== USER MANAGEMENT ====================
    
    def get_user_statistics(self) -> Dict[str, Any]:
        """Get comprehensive user statistics"""
        try:
            users = self.db.query(models.User).all()
            
            stats = {
                "total_users": len(users),
                "active_users": len([u for u in users if u.is_active]),
                "inactive_users": len([u for u in users if not u.is_active]),
                "by_role": {},
                "recent_logins": self._get_recent_login_stats(),
                "security_stats": self._get_security_stats()
            }
            
            # Count by role
            for user in users:
                role = user.role or 'employee'
                stats["by_role"][role] = stats["by_role"].get(role, 0) + 1
            
            return stats
        except Exception as e:
            logger.error(f"Error fetching user statistics: {e}")
            return {"error": str(e)}
    
    def update_user_role(self, user_id: int, new_role: str, updated_by: int) -> Dict[str, Any]:
        """Update user role with validation and audit logging"""
        try:
            user = self.db.query(models.User).filter(models.User.id == user_id).first()
            if not user:
                return {"success": False, "message": "User not found"}
            
            # Validate role
            valid_roles = self._get_valid_roles()
            if new_role not in valid_roles:
                return {"success": False, "message": f"Invalid role. Valid roles: {', '.join(valid_roles)}"}
            
            # Check if user is trying to change their own role to super_admin
            if updated_by == user_id and new_role == 'super_admin':
                return {"success": False, "message": "Cannot promote yourself to super admin"}
            
            old_role = user.role
            user.role = new_role
            self.db.commit()
            
            # Create audit log
            self._create_audit_log(
                user_id=updated_by,
                action=AuditAction.ROLE_CHANGE.value,
                resource_type="user",
                resource_id=user_id,
                old_value=old_role,
                new_value=new_role,
                details=f"Role changed from {old_role} to {new_role} for user {user.email}"
            )
            
            # Notify user about role change
            self._notify_role_change(user, old_role, new_role)
            
            return {
                "success": True,
                "message": "User role updated successfully",
                "user_id": user_id,
                "old_role": old_role,
                "new_role": new_role
            }
            
        except Exception as e:
            logger.error(f"Error updating user role: {e}")
            return {"success": False, "message": str(e)}
    
    def get_users_list(self, skip: int = 0, limit: int = 100, role_filter: Optional[str] = None) -> Dict[str, Any]:
        """Get paginated list of users with optional role filtering"""
        try:
            query = self.db.query(models.User)
            
            if role_filter:
                query = query.filter(models.User.role == role_filter)
            
            total = query.count()
            users = query.offset(skip).limit(limit).all()
            
            users_data = []
            for user in users:
                users_data.append({
                    "id": user.id,
                    "email": user.email,
                    "role": user.role,
                    "is_active": user.is_active,
                    "created_at": user.created_at.isoformat() if user.created_at else None,
                    "last_login": self._get_user_last_login(user.id)
                })
            
            return {
                "users": users_data,
                "total": total,
                "skip": skip,
                "limit": limit
            }
            
        except Exception as e:
            logger.error(f"Error fetching users list: {e}")
            return {"error": str(e)}
    
    # ==================== AUDIT LOGGING ====================
    
    def get_audit_logs(self, skip: int = 0, limit: int = 100, action_filter: Optional[str] = None, 
                      user_filter: Optional[int] = None, days_back: int = 30) -> Dict[str, Any]:
        """Get audit logs with filtering and pagination"""
        try:
            query = self.db.query(models.AuditLog).join(models.User)
            
            # Apply filters
            if action_filter:
                query = query.filter(models.AuditLog.action == action_filter)
            
            if user_filter:
                query = query.filter(models.AuditLog.user_id == user_filter)
            
            # Date filter
            cutoff_date = datetime.utcnow() - timedelta(days=days_back)
            query = query.filter(models.AuditLog.created_at >= cutoff_date)
            
            total = query.count()
            logs = query.order_by(desc(models.AuditLog.created_at)).offset(skip).limit(limit).all()
            
            logs_data = []
            for log in logs:
                logs_data.append({
                    "id": log.id,
                    "user_id": log.user_id,
                    "user_email": log.user.email if log.user else "Unknown",
                    "action": log.action,
                    "resource_type": log.resource_type,
                    "resource_id": log.resource_id,
                    "old_value": log.old_value,
                    "new_value": log.new_value,
                    "ip_address": log.ip_address,
                    "user_agent": log.user_agent,
                    "created_at": log.created_at.isoformat(),
                    "risk_level": self._assess_action_risk(log.action),
                    "details": getattr(log, 'details', '')
                })
            
            return {
                "logs": logs_data,
                "total": total,
                "skip": skip,
                "limit": limit
            }
            
        except Exception as e:
            logger.error(f"Error fetching audit logs: {e}")
            return {"error": str(e)}
    
    def create_audit_log(self, user_id: int, action: str, resource_type: str, 
                        resource_id: int, old_value: str = None, new_value: str = None,
                        ip_address: str = None, user_agent: str = None, details: str = None) -> bool:
        """Create audit log entry"""
        return self._create_audit_log(user_id, action, resource_type, resource_id, 
                                    old_value, new_value, ip_address, user_agent, details)
    
    # ==================== SYSTEM SETTINGS ====================
    
    def get_system_settings(self) -> Dict[str, Any]:
        """Get system settings"""
        try:
            # In production, this would come from a settings table
            # For now, return default settings
            return {
                "session": {
                    "timeout_minutes": 30,
                    "max_concurrent_sessions": 3,
                    "require_2fa_for_admins": True
                },
                "security": {
                    "log_all_data_access": True,
                    "ip_whitelisting_enabled": False,
                    "password_expiry_days": 90,
                    "min_password_length": 8,
                    "require_special_chars": True
                },
                "data_retention": {
                    "audit_logs_days": 365,
                    "application_data_days": 730,
                    "user_activity_days": 90
                },
                "notifications": {
                    "notify_capability_changes": True,
                    "notify_role_changes": True,
                    "daily_security_digest": False,
                    "admin_email": "admin@company.com"
                }
            }
        except Exception as e:
            logger.error(f"Error fetching system settings: {e}")
            return {}
    
    def save_system_settings(self, settings: Dict[str, Any], updated_by: int) -> Dict[str, Any]:
        """Save system settings with audit logging"""
        try:
            old_settings = self.get_system_settings()
            
            # In production, save to database
            # For now, just validate and log
            
            # Create audit log
            self._create_audit_log(
                user_id=updated_by,
                action=AuditAction.SYSTEM_SETTING_CHANGE.value,
                resource_type="system_settings",
                resource_id=0,
                old_value=json.dumps(old_settings),
                new_value=json.dumps(settings),
                details="System settings updated"
            )
            
            return {"success": True, "message": "System settings saved successfully"}
            
        except Exception as e:
            logger.error(f"Error saving system settings: {e}")
            return {"success": False, "message": str(e)}
    
    # ==================== PERMISSION TEMPLATES ====================
    
    def get_permission_templates(self) -> Dict[str, Any]:
        """Get predefined permission templates"""
        return {
            "startup": {
                "name": "Startup Mode",
                "description": "Minimal roles with broad access for small teams",
                "capabilities": self._generate_startup_capabilities()
            },
            "enterprise": {
                "name": "Enterprise Mode", 
                "description": "Strict role separation for large organizations",
                "capabilities": self._generate_enterprise_capabilities()
            },
            "remote": {
                "name": "Remote First",
                "description": "Focus on engagement and self-service for distributed teams",
                "capabilities": self._generate_remote_capabilities()
            },
            "security_focused": {
                "name": "Security Focused",
                "description": "Maximum security with minimal permissions",
                "capabilities": self._generate_security_capabilities()
            }
        }
    
    def apply_permission_template(self, template_name: str, updated_by: int) -> Dict[str, Any]:
        """Apply a permission template"""
        templates = self.get_permission_templates()
        
        if template_name not in templates:
            return {"success": False, "message": "Template not found"}
        
        template = templates[template_name]
        return self.save_system_capabilities(template["capabilities"], updated_by)
    
    # ==================== PRIVATE HELPER METHODS ====================
    
    def _get_capabilities_from_db(self) -> Optional[Dict[str, Any]]:
        """Get capabilities from database (placeholder for future implementation)"""
        # In production, implement database storage for capabilities
        return None
    
    def _save_capabilities_to_db(self, capabilities: Dict[str, Any], updated_by: int):
        """Save capabilities to database (placeholder for future implementation)"""
        # In production, implement database storage for capabilities
        pass
    
    def _get_default_capabilities(self) -> Dict[str, Any]:
        """Get default system capabilities"""
        modules = [
            'dashboard', 'recruitment', 'onboarding', 'employees', 'attendance',
            'leave', 'performance', 'engagement', 'learning', 'payroll',
            'analysis', 'career', 'assets', 'announcements'
        ]
        
        return {
            "super_admin": {module: {"enabled": True, "permissions": ["read", "write", "delete"]} for module in modules},
            "admin": {module: {"enabled": True, "permissions": ["read", "write", "delete"]} for module in modules},
            "hr": {module: {"enabled": True, "permissions": ["read", "write"]} for module in modules},
            "manager": {
                module: {
                    "enabled": module in ['dashboard', 'recruitment', 'employees', 'attendance', 'leave', 'performance', 'engagement', 'analysis', 'assets', 'announcements'],
                    "permissions": ["read", "write"] if module in ['dashboard', 'recruitment', 'employees', 'attendance', 'leave', 'performance', 'engagement', 'analysis', 'assets', 'announcements'] else []
                } for module in modules
            },
            "assets_team": {
                module: {
                    "enabled": module in ['dashboard', 'assets', 'announcements'],
                    "permissions": ["read", "write"] if module in ['dashboard', 'assets', 'announcements'] else []
                } for module in modules
            },
            "employee": {
                module: {
                    "enabled": module in ['dashboard', 'attendance', 'leave', 'performance', 'engagement', 'learning', 'career', 'assets', 'announcements'],
                    "permissions": ["read"] if module in ['dashboard', 'attendance', 'leave', 'performance', 'engagement', 'learning', 'career', 'assets', 'announcements'] else []
                } for module in modules
            },
            "candidate": {
                module: {
                    "enabled": module == 'dashboard',
                    "permissions": ["read"] if module == 'dashboard' else []
                } for module in modules
            }
        }
    
    def _validate_capabilities(self, capabilities: Dict[str, Any]) -> Dict[str, Any]:
        """Validate capabilities structure"""
        if not isinstance(capabilities, dict):
            return {"valid": False, "message": "Capabilities must be a dictionary"}
        
        valid_roles = self._get_valid_roles()
        valid_permissions = ["read", "write", "delete"]
        
        for role, role_caps in capabilities.items():
            if role not in valid_roles:
                return {"valid": False, "message": f"Invalid role: {role}"}
            
            if not isinstance(role_caps, dict):
                return {"valid": False, "message": f"Role capabilities must be a dictionary for role: {role}"}
            
            for module, module_caps in role_caps.items():
                if not isinstance(module_caps, dict):
                    return {"valid": False, "message": f"Module capabilities must be a dictionary for {role}.{module}"}
                
                if "enabled" not in module_caps or "permissions" not in module_caps:
                    return {"valid": False, "message": f"Missing enabled or permissions for {role}.{module}"}
                
                if not isinstance(module_caps["permissions"], list):
                    return {"valid": False, "message": f"Permissions must be a list for {role}.{module}"}
                
                for perm in module_caps["permissions"]:
                    if perm not in valid_permissions:
                        return {"valid": False, "message": f"Invalid permission '{perm}' for {role}.{module}"}
        
        return {"valid": True, "message": "Capabilities are valid"}
    
    def _get_valid_roles(self) -> List[str]:
        """Get list of valid roles"""
        return ['super_admin', 'admin', 'hr', 'manager', 'assets_team', 'employee', 'candidate']
    
    def _create_audit_log(self, user_id: int, action: str, resource_type: str, 
                         resource_id: int, old_value: str = None, new_value: str = None,
                         ip_address: str = None, user_agent: str = None, details: str = None) -> bool:
        """Create audit log entry"""
        try:
            audit_log = models.AuditLog(
                user_id=user_id,
                action=action,
                resource_type=resource_type,
                resource_id=resource_id,
                old_value=old_value,
                new_value=new_value,
                ip_address=ip_address,
                user_agent=user_agent
            )
            
            # Add details if provided (assuming the model supports it)
            if hasattr(audit_log, 'details') and details:
                audit_log.details = details
            
            self.db.add(audit_log)
            self.db.commit()
            return True
            
        except Exception as e:
            logger.error(f"Error creating audit log: {e}")
            return False
    
    def _assess_action_risk(self, action: str) -> str:
        """Assess risk level of an action"""
        high_risk_actions = [
            AuditAction.CAPABILITY_CHANGE.value,
            AuditAction.ROLE_CHANGE.value,
            AuditAction.USER_DELETE.value,
            AuditAction.SYSTEM_SETTING_CHANGE.value
        ]
        
        medium_risk_actions = [
            AuditAction.USER_CREATE.value,
            AuditAction.USER_DEACTIVATE.value,
            AuditAction.PERMISSION_GRANT.value,
            AuditAction.PERMISSION_REVOKE.value
        ]
        
        if action in high_risk_actions:
            return RiskLevel.HIGH.value
        elif action in medium_risk_actions:
            return RiskLevel.MEDIUM.value
        else:
            return RiskLevel.LOW.value
    
    def _get_recent_login_stats(self) -> Dict[str, Any]:
        """Get recent login statistics"""
        # Placeholder - in production, implement login tracking
        return {
            "last_24h": 15,
            "last_7d": 89,
            "failed_attempts_24h": 3
        }
    
    def _get_security_stats(self) -> Dict[str, Any]:
        """Get security-related statistics"""
        # Placeholder - in production, implement security metrics
        return {
            "suspicious_activities": 2,
            "blocked_ips": 0,
            "2fa_enabled_users": 5
        }
    
    def _get_user_last_login(self, user_id: int) -> Optional[str]:
        """Get user's last login timestamp"""
        # Placeholder - in production, implement login tracking
        return None
    
    def _notify_capability_changes(self, new_caps: Dict[str, Any], old_caps: Dict[str, Any], updated_by: int):
        """Notify relevant users about capability changes"""
        # Placeholder - implement notification logic
        pass
    
    def _notify_role_change(self, user: models.User, old_role: str, new_role: str):
        """Notify user about role change"""
        # Placeholder - implement notification logic
        pass
    
    def _generate_startup_capabilities(self) -> Dict[str, Any]:
        """Generate startup mode capabilities"""
        # Broad access for small teams
        return self._get_default_capabilities()
    
    def _generate_enterprise_capabilities(self) -> Dict[str, Any]:
        """Generate enterprise mode capabilities"""
        # Strict role separation
        return self._get_default_capabilities()
    
    def _generate_remote_capabilities(self) -> Dict[str, Any]:
        """Generate remote-first capabilities"""
        # Focus on engagement and self-service
        return self._get_default_capabilities()
    
    def _generate_security_capabilities(self) -> Dict[str, Any]:
        """Generate security-focused capabilities"""
        # Minimal permissions with maximum security
        capabilities = self._get_default_capabilities()
        
        # Reduce permissions for all roles except super_admin
        for role in capabilities:
            if role != 'super_admin':
                for module in capabilities[role]:
                    if capabilities[role][module]["enabled"]:
                        # Remove delete permissions for security
                        permissions = capabilities[role][module]["permissions"]
                        if "delete" in permissions:
                            permissions.remove("delete")
        
        return capabilities