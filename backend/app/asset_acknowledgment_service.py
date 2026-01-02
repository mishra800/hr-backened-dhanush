"""
Asset Acknowledgment Service
Handles employee acknowledgment of received IT assets and setup
"""

import asyncio
from datetime import datetime
from typing import Dict, List, Optional
from sqlalchemy.orm import Session
from . import models
from .notification_service import NotificationService


class AssetAcknowledgmentService:
    def __init__(self, db: Session):
        self.db = db
        self.notification_service = NotificationService(db)
    
    def create_acknowledgment(
        self,
        employee_id: int,
        acknowledgment_data: Dict,
        infrastructure_request_id: Optional[int] = None
    ) -> Dict:
        """Create asset acknowledgment form submission"""
        
        employee = self.db.query(models.Employee).filter(models.Employee.id == employee_id).first()
        if not employee:
            return {"success": False, "message": "Employee not found"}
        
        # Create acknowledgment record
        acknowledgment = models.AssetAcknowledgment(
            employee_id=employee_id,
            infrastructure_request_id=infrastructure_request_id,
            employee_name=acknowledgment_data.get("employee_name", f"{employee.first_name} {employee.last_name}"),
            employee_id_number=acknowledgment_data.get("employee_id_number", str(employee_id)),
            department=acknowledgment_data.get("department", employee.department or ""),
            date_of_joining=acknowledgment_data.get("date_of_joining", employee.date_of_joining or datetime.utcnow()),
            
            # Received Items
            laptop_received=acknowledgment_data.get("laptop_received", False),
            laptop_serial_number=acknowledgment_data.get("laptop_serial_number"),
            laptop_model=acknowledgment_data.get("laptop_model"),
            laptop_condition=acknowledgment_data.get("laptop_condition"),
            
            email_received=acknowledgment_data.get("email_received", False),
            email_address=acknowledgment_data.get("email_address"),
            email_password_received=acknowledgment_data.get("email_password_received", False),
            
            wifi_access_received=acknowledgment_data.get("wifi_access_received", False),
            wifi_credentials_received=acknowledgment_data.get("wifi_credentials_received", False),
            
            id_card_received=acknowledgment_data.get("id_card_received", False),
            id_card_number=acknowledgment_data.get("id_card_number"),
            
            biometric_setup_completed=acknowledgment_data.get("biometric_setup_completed", False),
            biometric_type=acknowledgment_data.get("biometric_type"),
            
            # Additional Items
            monitor_received=acknowledgment_data.get("monitor_received", False),
            monitor_serial_number=acknowledgment_data.get("monitor_serial_number"),
            keyboard_received=acknowledgment_data.get("keyboard_received", False),
            mouse_received=acknowledgment_data.get("mouse_received", False),
            headset_received=acknowledgment_data.get("headset_received", False),
            mobile_received=acknowledgment_data.get("mobile_received", False),
            mobile_number=acknowledgment_data.get("mobile_number"),
            
            # Login Credentials
            system_login_working=acknowledgment_data.get("system_login_working", False),
            email_login_working=acknowledgment_data.get("email_login_working", False),
            vpn_access_working=acknowledgment_data.get("vpn_access_working", False),
            
            # Employee Acknowledgment
            employee_signature=acknowledgment_data.get("employee_signature", "Digital Confirmation"),
            employee_comments=acknowledgment_data.get("employee_comments"),
            issues_reported=acknowledgment_data.get("issues_reported"),
            additional_requirements=acknowledgment_data.get("additional_requirements")
        )
        
        self.db.add(acknowledgment)
        self.db.commit()
        self.db.refresh(acknowledgment)
        
        # Notify admin about new acknowledgment
        self._notify_admin_new_acknowledgment(acknowledgment)
        
        return {
            "success": True,
            "message": "Asset acknowledgment submitted successfully",
            "acknowledgment_id": acknowledgment.id,
            "reference_number": f"ACK-{acknowledgment.id:06d}"
        }
    
    def get_pending_acknowledgments(self) -> List[Dict]:
        """Get all pending acknowledgments for admin review"""
        acknowledgments = self.db.query(models.AssetAcknowledgment).filter(
            models.AssetAcknowledgment.review_status == "pending"
        ).order_by(models.AssetAcknowledgment.created_at.desc()).all()
        
        return [self._format_acknowledgment(ack) for ack in acknowledgments]
    
    def review_acknowledgment(
        self,
        acknowledgment_id: int,
        reviewer_id: int,
        review_status: str,
        admin_comments: str = None
    ) -> Dict:
        """Admin reviews and approves/rejects acknowledgment"""
        acknowledgment = self.db.query(models.AssetAcknowledgment).filter(
            models.AssetAcknowledgment.id == acknowledgment_id
        ).first()
        
        if not acknowledgment:
            return {"success": False, "message": "Acknowledgment not found"}
        
        acknowledgment.reviewed_by = reviewer_id
        acknowledgment.review_status = review_status
        acknowledgment.admin_comments = admin_comments
        acknowledgment.reviewed_at = datetime.utcnow()
        
        if review_status == "approved":
            acknowledgment.status = "completed"
        elif review_status == "needs_action":
            acknowledgment.status = "under_review"
        
        self.db.commit()
        
        # Notify employee about review result
        self._notify_employee_review_result(acknowledgment)
        
        return {"success": True, "message": f"Acknowledgment {review_status} successfully"}
    
    def get_employee_acknowledgments(self, employee_id: int) -> List[Dict]:
        """Get acknowledgments for specific employee"""
        acknowledgments = self.db.query(models.AssetAcknowledgment).filter(
            models.AssetAcknowledgment.employee_id == employee_id
        ).order_by(models.AssetAcknowledgment.created_at.desc()).all()
        
        return [self._format_acknowledgment(ack) for ack in acknowledgments]
    
    def get_acknowledgment_details(self, acknowledgment_id: int) -> Dict:
        """Get detailed acknowledgment information"""
        acknowledgment = self.db.query(models.AssetAcknowledgment).filter(
            models.AssetAcknowledgment.id == acknowledgment_id
        ).first()
        
        if not acknowledgment:
            return {"error": "Acknowledgment not found"}
        
        return self._format_acknowledgment_detailed(acknowledgment)
    
    def check_pending_acknowledgment(self, employee_id: int) -> Dict:
        """Check if employee has pending infrastructure setup to acknowledge"""
        # Check if there's a completed infrastructure request without acknowledgment
        completed_request = self.db.query(models.InfrastructureRequest).filter(
            models.InfrastructureRequest.employee_id == employee_id,
            models.InfrastructureRequest.status == "completed"
        ).first()
        
        if not completed_request:
            return {"has_pending": False}
        
        # Check if acknowledgment already exists
        existing_ack = self.db.query(models.AssetAcknowledgment).filter(
            models.AssetAcknowledgment.employee_id == employee_id,
            models.AssetAcknowledgment.infrastructure_request_id == completed_request.id
        ).first()
        
        if existing_ack:
            return {"has_pending": False, "existing_acknowledgment": existing_ack.id}
        
        return {
            "has_pending": True,
            "infrastructure_request_id": completed_request.id,
            "setup_details": {
                "laptop_provided": completed_request.laptop_provided,
                "email_setup_completed": completed_request.email_setup_completed,
                "wifi_setup_completed": completed_request.wifi_setup_completed,
                "id_card_provided": completed_request.id_card_provided,
                "biometric_setup_completed": completed_request.biometric_setup_completed,
                "email_address_created": completed_request.email_address_created,
                "id_card_number": completed_request.id_card_number
            }
        }
    
    def _format_acknowledgment(self, acknowledgment: models.AssetAcknowledgment) -> Dict:
        """Format acknowledgment for API response"""
        return {
            "id": acknowledgment.id,
            "reference_number": f"ACK-{acknowledgment.id:06d}",
            "employee_id": acknowledgment.employee_id,
            "employee_name": acknowledgment.employee_name,
            "employee_id_number": acknowledgment.employee_id_number,
            "department": acknowledgment.department,
            "status": acknowledgment.status,
            "review_status": acknowledgment.review_status,
            "created_at": acknowledgment.created_at.isoformat() if acknowledgment.created_at else None,
            "reviewed_at": acknowledgment.reviewed_at.isoformat() if acknowledgment.reviewed_at else None,
            "has_issues": bool(acknowledgment.issues_reported),
            "reviewer_name": acknowledgment.reviewer.email if acknowledgment.reviewer else None
        }
    
    def _format_acknowledgment_detailed(self, acknowledgment: models.AssetAcknowledgment) -> Dict:
        """Format detailed acknowledgment information"""
        base_info = self._format_acknowledgment(acknowledgment)
        
        base_info.update({
            "date_of_joining": acknowledgment.date_of_joining.isoformat() if acknowledgment.date_of_joining else None,
            
            # Received Items
            "laptop_received": acknowledgment.laptop_received,
            "laptop_serial_number": acknowledgment.laptop_serial_number,
            "laptop_model": acknowledgment.laptop_model,
            "laptop_condition": acknowledgment.laptop_condition,
            
            "email_received": acknowledgment.email_received,
            "email_address": acknowledgment.email_address,
            "email_password_received": acknowledgment.email_password_received,
            
            "wifi_access_received": acknowledgment.wifi_access_received,
            "wifi_credentials_received": acknowledgment.wifi_credentials_received,
            
            "id_card_received": acknowledgment.id_card_received,
            "id_card_number": acknowledgment.id_card_number,
            
            "biometric_setup_completed": acknowledgment.biometric_setup_completed,
            "biometric_type": acknowledgment.biometric_type,
            
            # Additional Items
            "monitor_received": acknowledgment.monitor_received,
            "monitor_serial_number": acknowledgment.monitor_serial_number,
            "keyboard_received": acknowledgment.keyboard_received,
            "mouse_received": acknowledgment.mouse_received,
            "headset_received": acknowledgment.headset_received,
            "mobile_received": acknowledgment.mobile_received,
            "mobile_number": acknowledgment.mobile_number,
            
            # Login Status
            "system_login_working": acknowledgment.system_login_working,
            "email_login_working": acknowledgment.email_login_working,
            "vpn_access_working": acknowledgment.vpn_access_working,
            
            # Comments and Issues
            "employee_comments": acknowledgment.employee_comments,
            "issues_reported": acknowledgment.issues_reported,
            "additional_requirements": acknowledgment.additional_requirements,
            "admin_comments": acknowledgment.admin_comments,
            
            "acknowledgment_date": acknowledgment.acknowledgment_date.isoformat() if acknowledgment.acknowledgment_date else None
        })
        
        return base_info
    
    def _notify_admin_new_acknowledgment(self, acknowledgment: models.AssetAcknowledgment):
        """Notify admin about new asset acknowledgment submission"""
        # Get all admin and HR users
        admin_users = self.db.query(models.User).filter(
            models.User.role.in_(["admin", "hr"]),
            models.User.is_active == True
        ).all()
        
        message = f"""📋 New Asset Acknowledgment Submitted

Employee: {acknowledgment.employee_name}
Reference: ACK-{acknowledgment.id:06d}
Department: {acknowledgment.department}

Items Acknowledged:
{'✅ Laptop' if acknowledgment.laptop_received else '❌ Laptop'}
{'✅ Email Setup' if acknowledgment.email_received else '❌ Email Setup'}
{'✅ WiFi Access' if acknowledgment.wifi_access_received else '❌ WiFi Access'}
{'✅ ID Card' if acknowledgment.id_card_received else '❌ ID Card'}
{'✅ Biometric Setup' if acknowledgment.biometric_setup_completed else '❌ Biometric Setup'}

Login Status:
{'✅ System Login Working' if acknowledgment.system_login_working else '❌ System Login Issues'}
{'✅ Email Login Working' if acknowledgment.email_login_working else '❌ Email Login Issues'}
{'✅ VPN Access Working' if acknowledgment.vpn_access_working else '❌ VPN Access Issues'}

{f"⚠️ Issues Reported: {acknowledgment.issues_reported}" if acknowledgment.issues_reported else "✅ No Issues Reported"}

Please review and approve this acknowledgment."""
        
        for user in admin_users:
            try:
                # Run async notification in a new event loop
                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)
                loop.run_until_complete(
                    self.notification_service.send_notification(
                        user_id=user.id,
                        subject="📋 New Asset Acknowledgment",
                        message=message,
                        channels=["email"]
                    )
                )
                loop.close()
            except Exception as e:
                print(f"Failed to send notification to admin {user.id}: {e}")
    
    def _notify_employee_review_result(self, acknowledgment: models.AssetAcknowledgment):
        """Notify employee about acknowledgment review result"""
        employee_user = self.db.query(models.User).filter(
            models.User.id == acknowledgment.employee.user_id
        ).first()
        
        if not employee_user:
            return
        
        if acknowledgment.review_status == "approved":
            message = f"""✅ Asset Acknowledgment Approved

Reference: ACK-{acknowledgment.id:06d}

Your asset acknowledgment has been reviewed and approved by admin. Your IT setup is now complete and officially recorded.

{f"Admin Comments: {acknowledgment.admin_comments}" if acknowledgment.admin_comments else ""}"""
            title = "✅ Asset Acknowledgment Approved"
        
        elif acknowledgment.review_status == "needs_action":
            message = f"""⚠️ Asset Acknowledgment Requires Action

Reference: ACK-{acknowledgment.id:06d}

Your asset acknowledgment has been reviewed and requires additional action or clarification.

Admin Comments: {acknowledgment.admin_comments or 'Please contact IT support for assistance.'}

Please address the issues mentioned and resubmit if necessary."""
            title = "⚠️ Asset Acknowledgment Needs Action"
        
        else:
            return
        
        try:
            # Run async notification in a new event loop
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            loop.run_until_complete(
                self.notification_service.send_notification(
                    user_id=employee_user.id,
                    subject=title,
                    message=message,
                    channels=["email"]
                )
            )
            loop.close()
        except Exception as e:
            print(f"Failed to send notification to employee {employee_user.id}: {e}")