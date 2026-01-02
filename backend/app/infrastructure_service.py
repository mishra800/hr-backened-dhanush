"""
Infrastructure Management Service
Handles infrastructure setup requests with photo documentation
"""

from datetime import datetime
from typing import Dict, List, Optional
from sqlalchemy.orm import Session
from . import models
from .notification_service import NotificationService
import os
import uuid
from fastapi import UploadFile


class InfrastructureService:
    def __init__(self, db: Session):
        self.db = db
        self.notification_service = NotificationService(db)
    
    def create_infrastructure_request(
        self, 
        employee_id: int,
        requested_by: int,
        laptop_required: bool = True,
        email_setup_required: bool = True,
        wifi_setup_required: bool = True,
        id_card_required: bool = True,
        biometric_setup_required: bool = True,
        additional_requirements: str = None,
        priority: str = "normal",
        request_notes: str = None
    ) -> Dict:
        """Create infrastructure setup request for new employee"""
        
        # Check if request already exists for this employee
        existing_request = self.db.query(models.InfrastructureRequest).filter(
            models.InfrastructureRequest.employee_id == employee_id,
            models.InfrastructureRequest.status.in_(["pending", "assigned", "in_progress"])
        ).first()
        
        if existing_request:
            return {
                "success": False,
                "message": "Infrastructure request already exists for this employee",
                "request_id": existing_request.id
            }
        
        # Create new infrastructure request
        infra_request = models.InfrastructureRequest(
            employee_id=employee_id,
            requested_by=requested_by,
            laptop_required=laptop_required,
            email_setup_required=email_setup_required,
            wifi_setup_required=wifi_setup_required,
            id_card_required=id_card_required,
            biometric_setup_required=biometric_setup_required,
            additional_requirements=additional_requirements,
            priority=priority,
            request_notes=request_notes
        )
        
        self.db.add(infra_request)
        self.db.commit()
        self.db.refresh(infra_request)
        
        # Notify assets team
        self._notify_assets_team_new_request(infra_request)
        
        return {
            "success": True,
            "message": "Infrastructure request created successfully",
            "request_id": infra_request.id,
            "ticket_number": f"INFRA-{infra_request.id:06d}"
        }
    
    def assign_request_to_technician(self, request_id: int, technician_id: int) -> Dict:
        """Assign infrastructure request to technician"""
        request = self.db.query(models.InfrastructureRequest).filter(
            models.InfrastructureRequest.id == request_id
        ).first()
        
        if not request:
            return {"success": False, "message": "Request not found"}
        
        if request.status != "pending":
            return {"success": False, "message": "Request is not in pending status"}
        
        request.assigned_to = technician_id
        request.assigned_at = datetime.utcnow()
        request.status = "assigned"
        
        self.db.commit()
        
        return {"success": True, "message": "Request assigned successfully"}
    
    def start_infrastructure_setup(self, request_id: int, technician_id: int) -> Dict:
        """Start infrastructure setup process"""
        request = self.db.query(models.InfrastructureRequest).filter(
            models.InfrastructureRequest.id == request_id
        ).first()
        
        if not request:
            return {"success": False, "message": "Request not found"}
        
        if request.assigned_to != technician_id:
            return {"success": False, "message": "Request not assigned to you"}
        
        request.status = "in_progress"
        request.started_at = datetime.utcnow()
        
        self.db.commit()
        
        return {"success": True, "message": "Infrastructure setup started"}
    
    def update_setup_progress(
        self,
        request_id: int,
        technician_id: int,
        setup_type: str,
        completed: bool,
        photo_file: UploadFile = None,
        additional_info: str = None
    ) -> Dict:
        """Update progress of specific setup item with photo"""
        
        request = self.db.query(models.InfrastructureRequest).filter(
            models.InfrastructureRequest.id == request_id
        ).first()
        
        if not request:
            return {"success": False, "message": "Request not found"}
        
        if request.assigned_to != technician_id:
            return {"success": False, "message": "Request not assigned to you"}
        
        # Save photo if provided
        photo_url = None
        if photo_file:
            photo_url = self._save_photo(photo_file, request_id, setup_type)
        
        # Update specific setup item
        if setup_type == "laptop":
            request.laptop_provided = completed
            if photo_url:
                request.laptop_photo_url = photo_url
            if additional_info:
                request.laptop_serial_number = additional_info
                
        elif setup_type == "email":
            request.email_setup_completed = completed
            if photo_url:
                request.email_setup_photo_url = photo_url
            if additional_info:
                request.email_address_created = additional_info
                
        elif setup_type == "wifi":
            request.wifi_setup_completed = completed
            if photo_url:
                request.wifi_setup_photo_url = photo_url
                
        elif setup_type == "id_card":
            request.id_card_provided = completed
            if photo_url:
                request.id_card_photo_url = photo_url
            if additional_info:
                request.id_card_number = additional_info
                
        elif setup_type == "biometric":
            request.biometric_setup_completed = completed
            if photo_url:
                request.biometric_setup_photo_url = photo_url
        
        self.db.commit()
        
        # Check if all required items are completed
        all_completed = self._check_all_items_completed(request)
        
        return {
            "success": True,
            "message": f"{setup_type.title()} setup updated successfully",
            "photo_url": photo_url,
            "all_completed": all_completed
        }
    
    def complete_infrastructure_setup(
        self,
        request_id: int,
        technician_id: int,
        completion_notes: str,
        completion_photo: UploadFile = None,
        handover_photo: UploadFile = None
    ) -> Dict:
        """Complete infrastructure setup with final photos"""
        
        request = self.db.query(models.InfrastructureRequest).filter(
            models.InfrastructureRequest.id == request_id
        ).first()
        
        if not request:
            return {"success": False, "message": "Request not found"}
        
        if request.assigned_to != technician_id:
            return {"success": False, "message": "Request not assigned to you"}
        
        # Check if all required items are completed
        if not self._check_all_items_completed(request):
            return {"success": False, "message": "Not all required items are completed"}
        
        # Save completion photos
        if completion_photo:
            request.completion_photo_url = self._save_photo(completion_photo, request_id, "completion")
        
        if handover_photo:
            request.employee_handover_photo_url = self._save_photo(handover_photo, request_id, "handover")
        
        # Update request status
        request.status = "completed"
        request.completed_at = datetime.utcnow()
        request.completion_notes = completion_notes
        
        self.db.commit()
        
        # Notify HR/Admin that setup is completed
        self._notify_requester_completion(request)
        
        return {
            "success": True,
            "message": "Infrastructure setup completed successfully",
            "completion_photo_url": request.completion_photo_url,
            "handover_photo_url": request.employee_handover_photo_url
        }
    
    def get_pending_requests(self) -> List[Dict]:
        """Get all pending infrastructure requests"""
        requests = self.db.query(models.InfrastructureRequest).filter(
            models.InfrastructureRequest.status.in_(["pending", "assigned", "in_progress"])
        ).order_by(models.InfrastructureRequest.created_at.desc()).all()
        
        return [self._format_request(req) for req in requests]
    
    def get_technician_requests(self, technician_id: int) -> List[Dict]:
        """Get requests assigned to specific technician"""
        requests = self.db.query(models.InfrastructureRequest).filter(
            models.InfrastructureRequest.assigned_to == technician_id,
            models.InfrastructureRequest.status.in_(["assigned", "in_progress"])
        ).order_by(models.InfrastructureRequest.created_at.desc()).all()
        
        return [self._format_request(req) for req in requests]
    
    def get_request_details(self, request_id: int) -> Dict:
        """Get detailed information about a specific request"""
        request = self.db.query(models.InfrastructureRequest).filter(
            models.InfrastructureRequest.id == request_id
        ).first()
        
        if not request:
            return {"error": "Request not found"}
        
        return self._format_request_detailed(request)
    
    def _check_all_items_completed(self, request: models.InfrastructureRequest) -> bool:
        """Check if all required infrastructure items are completed"""
        items_to_check = []
        
        if request.laptop_required:
            items_to_check.append(request.laptop_provided)
        if request.email_setup_required:
            items_to_check.append(request.email_setup_completed)
        if request.wifi_setup_required:
            items_to_check.append(request.wifi_setup_completed)
        if request.id_card_required:
            items_to_check.append(request.id_card_provided)
        if request.biometric_setup_required:
            items_to_check.append(request.biometric_setup_completed)
        
        return all(items_to_check)
    
    def _save_photo(self, photo_file: UploadFile, request_id: int, setup_type: str) -> str:
        """Save uploaded photo and return URL"""
        try:
            # Create uploads directory if it doesn't exist
            upload_dir = "uploads/infrastructure"
            os.makedirs(upload_dir, exist_ok=True)
            
            # Generate unique filename
            file_extension = photo_file.filename.split('.')[-1] if '.' in photo_file.filename else 'jpg'
            filename = f"infra_{request_id}_{setup_type}_{uuid.uuid4().hex[:8]}.{file_extension}"
            file_path = os.path.join(upload_dir, filename)
            
            # Save file
            with open(file_path, "wb") as buffer:
                content = photo_file.file.read()
                buffer.write(content)
            
            return f"/{file_path}"
            
        except Exception as e:
            print(f"Error saving photo: {e}")
            return None
    
    def _format_request(self, request: models.InfrastructureRequest) -> Dict:
        """Format request for API response"""
        return {
            "id": request.id,
            "ticket_number": f"INFRA-{request.id:06d}",
            "employee_id": request.employee_id,
            "employee_name": f"{request.employee.first_name} {request.employee.last_name}" if request.employee else "Unknown",
            "status": request.status,
            "priority": request.priority,
            "created_at": request.created_at.isoformat() if request.created_at else None,
            "assigned_to": request.assigned_to,
            "assignee_name": f"{request.assignee.email}" if request.assignee else None,
            "progress": self._calculate_progress(request)
        }
    
    def _format_request_detailed(self, request: models.InfrastructureRequest) -> Dict:
        """Format detailed request information"""
        base_info = self._format_request(request)
        
        base_info.update({
            "laptop_required": request.laptop_required,
            "laptop_provided": request.laptop_provided,
            "laptop_photo_url": request.laptop_photo_url,
            "laptop_serial_number": request.laptop_serial_number,
            
            "email_setup_required": request.email_setup_required,
            "email_setup_completed": request.email_setup_completed,
            "email_setup_photo_url": request.email_setup_photo_url,
            "email_address_created": request.email_address_created,
            
            "wifi_setup_required": request.wifi_setup_required,
            "wifi_setup_completed": request.wifi_setup_completed,
            "wifi_setup_photo_url": request.wifi_setup_photo_url,
            
            "id_card_required": request.id_card_required,
            "id_card_provided": request.id_card_provided,
            "id_card_photo_url": request.id_card_photo_url,
            "id_card_number": request.id_card_number,
            
            "biometric_setup_required": request.biometric_setup_required,
            "biometric_setup_completed": request.biometric_setup_completed,
            "biometric_setup_photo_url": request.biometric_setup_photo_url,
            
            "completion_photo_url": request.completion_photo_url,
            "employee_handover_photo_url": request.employee_handover_photo_url,
            
            "request_notes": request.request_notes,
            "completion_notes": request.completion_notes,
            "additional_requirements": request.additional_requirements
        })
        
        return base_info
    
    def _calculate_progress(self, request: models.InfrastructureRequest) -> int:
        """Calculate completion percentage"""
        total_items = 0
        completed_items = 0
        
        if request.laptop_required:
            total_items += 1
            if request.laptop_provided:
                completed_items += 1
                
        if request.email_setup_required:
            total_items += 1
            if request.email_setup_completed:
                completed_items += 1
                
        if request.wifi_setup_required:
            total_items += 1
            if request.wifi_setup_completed:
                completed_items += 1
                
        if request.id_card_required:
            total_items += 1
            if request.id_card_provided:
                completed_items += 1
                
        if request.biometric_setup_required:
            total_items += 1
            if request.biometric_setup_completed:
                completed_items += 1
        
        if total_items == 0:
            return 100
        
        return int((completed_items / total_items) * 100)
    
    def _notify_assets_team_new_request(self, request: models.InfrastructureRequest):
        """Notify assets team about new infrastructure request with detailed requirements"""
        # Get all assets team members
        assets_team_users = self.db.query(models.User).filter(
            models.User.role == "assets_team",
            models.User.is_active == True
        ).all()
        
        # Create detailed message about what needs to be provided
        required_items = []
        if request.laptop_required:
            required_items.append("💻 Laptop - Provide company laptop with setup and photo documentation")
        if request.email_setup_required:
            required_items.append("📧 Email Setup - Create company email account with screenshot")
        if request.wifi_setup_required:
            required_items.append("📶 WiFi Setup - Configure network access with connection proof")
        if request.id_card_required:
            required_items.append("🆔 ID Card - Issue employee access card with photo")
        if request.biometric_setup_required:
            required_items.append("👆 Biometric Setup - Enroll fingerprint/face recognition with photo")
        
        detailed_message = f"""New Employee Infrastructure Setup Required

Employee: {request.employee.first_name} {request.employee.last_name}
Ticket: INFRA-{request.id:06d}

Required Items:
{chr(10).join(required_items)}

Please provide each item with photo documentation. Take photos during setup and delivery for audit trail."""
        
        for user in assets_team_users:
            self.notification_service.create_notification(
                user_id=user.id,
                title="🏗️ New Infrastructure Setup Request",
                message=detailed_message,
                type="infrastructure_request",
                action_url=f"/assets/infrastructure/{request.id}",
                notification_data={
                    "request_id": request.id, 
                    "employee_id": request.employee_id,
                    "required_items": required_items
                }
            )
    
    def _notify_requester_completion(self, request: models.InfrastructureRequest):
        """Notify HR/Admin that infrastructure setup is completed with photo evidence"""
        completed_items = []
        photo_evidence = []
        
        if request.laptop_provided:
            completed_items.append("💻 Laptop provided")
            if request.laptop_photo_url:
                photo_evidence.append(f"Laptop setup photo: {request.laptop_photo_url}")
        if request.email_setup_completed:
            completed_items.append("📧 Email setup completed")
            if request.email_setup_photo_url:
                photo_evidence.append(f"Email setup screenshot: {request.email_setup_photo_url}")
        if request.wifi_setup_completed:
            completed_items.append("📶 WiFi access configured")
            if request.wifi_setup_photo_url:
                photo_evidence.append(f"WiFi connection proof: {request.wifi_setup_photo_url}")
        if request.id_card_provided:
            completed_items.append("🆔 ID card issued")
            if request.id_card_photo_url:
                photo_evidence.append(f"ID card photo: {request.id_card_photo_url}")
        if request.biometric_setup_completed:
            completed_items.append("👆 Biometric enrollment completed")
            if request.biometric_setup_photo_url:
                photo_evidence.append(f"Biometric setup photo: {request.biometric_setup_photo_url}")
        
        completion_message = f"""✅ Infrastructure Setup Completed with Photo Documentation

Employee: {request.employee.first_name} {request.employee.last_name}
Ticket: INFRA-{request.id:06d}

Completed Items:
{chr(10).join(completed_items)}

📸 Photo Evidence Available:
{chr(10).join(photo_evidence)}

All infrastructure items have been provided with complete photo documentation. Employee is ready to start work."""
        
        # Notify the original requester (HR/Admin)
        self.notification_service.create_notification(
            user_id=request.requested_by,
            title="✅ Infrastructure Setup Completed",
            message=completion_message,
            type="infrastructure_completed",
            action_url=f"/onboarding/infrastructure/{request.id}",
            notification_data={
                "request_id": request.id, 
                "employee_id": request.employee_id,
                "completed_items": completed_items,
                "photo_evidence": photo_evidence,
                "has_photos": True
            }
        )
        
        # Also notify all admin and manager users
        admin_manager_users = self.db.query(models.User).filter(
            models.User.role.in_(["admin", "manager", "hr"]),
            models.User.is_active == True,
            models.User.id != request.requested_by  # Don't duplicate for the original requester
        ).all()
        
        for user in admin_manager_users:
            self.notification_service.create_notification(
                user_id=user.id,
                title="🎉 New Employee Infrastructure Ready",
                message=f"""New Employee Infrastructure Setup Completed

Employee: {request.employee.first_name} {request.employee.last_name}
Ticket: INFRA-{request.id:06d}

✅ All infrastructure items provided with photo documentation:
{chr(10).join(completed_items)}

Employee is ready to start work.""",
                type="infrastructure_completed",
                action_url=f"/onboarding/infrastructure/{request.id}",
                notification_data={
                    "request_id": request.id, 
                    "employee_id": request.employee_id,
                    "completed_items": completed_items,
                    "is_new_employee": True
                }
            )