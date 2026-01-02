"""
Asset Management Service
Handles asset requests, assignments, and complaints workflow
"""

from datetime import datetime, timedelta
from typing import Dict, List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
from . import models
from .notification_service import NotificationService
import json


class AssetManagementService:
    def __init__(self, db: Session):
        self.db = db
        self.notification_service = NotificationService(db)
    
    def create_asset_request(
        self, 
        employee_id: int, 
        request_type: str,
        requested_assets: List[str],
        reason: str = None,
        business_justification: str = None,
        priority: str = "normal",
        requested_by: int = None
    ) -> Dict:
        """Create a new asset request"""
        
        # If no requester specified, assume employee is requesting for themselves
        if requested_by is None:
            employee = self.db.query(models.Employee).filter(models.Employee.id == employee_id).first()
            if employee and employee.user_id:
                requested_by = employee.user_id
        
        asset_request = models.AssetRequest(
            employee_id=employee_id,
            request_type=request_type,
            requested_assets=requested_assets,
            reason=reason,
            business_justification=business_justification,
            priority=priority,
            requested_by=requested_by
        )
        
        self.db.add(asset_request)
        self.db.commit()
        self.db.refresh(asset_request)
        
        # Notify manager for approval
        self._notify_manager_for_approval(asset_request)
        
        return {
            "success": True,
            "message": "Asset request created successfully",
            "request_id": asset_request.id,
            "status": asset_request.status
        }
    
    def approve_by_manager(self, request_id: int, manager_id: int, notes: str = None) -> Dict:
        """Manager approves asset request"""
        request = self.db.query(models.AssetRequest).filter(models.AssetRequest.id == request_id).first()
        
        if not request:
            return {"success": False, "message": "Request not found"}
        
        if request.status != "pending":
            return {"success": False, "message": "Request is not in pending status"}
        
        request.approved_by_manager = manager_id
        request.manager_approved_at = datetime.utcnow()
        request.manager_notes = notes
        request.status = "manager_approved"
        
        self.db.commit()
        
        # Notify HR for approval
        self._notify_hr_for_approval(request)
        
        return {"success": True, "message": "Request approved by manager"}
    
    def approve_by_hr(self, request_id: int, hr_id: int, notes: str = None) -> Dict:
        """HR approves asset request"""
        request = self.db.query(models.AssetRequest).filter(models.AssetRequest.id == request_id).first()
        
        if not request:
            return {"success": False, "message": "Request not found"}
        
        if request.status != "manager_approved":
            return {"success": False, "message": "Request must be approved by manager first"}
        
        request.approved_by_hr = hr_id
        request.hr_approved_at = datetime.utcnow()
        request.hr_notes = notes
        request.status = "hr_approved"
        
        self.db.commit()
        
        # Notify assets team
        self._notify_assets_team(request)
        
        return {"success": True, "message": "Request approved by HR"}
    
    def assign_to_assets_team(self, request_id: int, assets_team_member_id: int) -> Dict:
        """Assign request to assets team member"""
        request = self.db.query(models.AssetRequest).filter(models.AssetRequest.id == request_id).first()
        
        if not request:
            return {"success": False, "message": "Request not found"}
        
        request.assigned_to_assets_team = assets_team_member_id
        request.status = "assigned_to_assets"
        
        self.db.commit()
        
        return {"success": True, "message": "Request assigned to assets team"}
    
    def fulfill_asset_request(
        self, 
        request_id: int, 
        asset_assignments: List[Dict],
        assets_team_member_id: int,
        notes: str = None
    ) -> Dict:
        """Fulfill asset request by assigning specific assets"""
        
        request = self.db.query(models.AssetRequest).filter(models.AssetRequest.id == request_id).first()
        
        if not request:
            return {"success": False, "message": "Request not found"}
        
        if request.status not in ["hr_approved", "assigned_to_assets"]:
            return {"success": False, "message": "Request not ready for fulfillment"}
        
        assigned_assets = []
        
        for assignment in asset_assignments:
            asset_id = assignment.get("asset_id")
            condition = assignment.get("condition", "good")
            
            # Get the asset
            asset = self.db.query(models.Asset).filter(models.Asset.id == asset_id).first()
            
            if not asset:
                continue
            
            if asset.status != "available":
                continue
            
            # Update asset status
            asset.status = "assigned"
            asset.assigned_to = request.employee_id
            
            # Create assignment record
            assignment_record = models.AssetAssignment(
                asset_id=asset_id,
                employee_id=request.employee_id,
                request_id=request_id,
                assigned_by=assets_team_member_id,
                condition_at_assignment=condition
            )
            
            self.db.add(assignment_record)
            assigned_assets.append({
                "asset_id": asset_id,
                "name": asset.name,
                "serial_number": asset.serial_number
            })
        
        # Update request status
        request.status = "completed"
        request.assets_assigned_at = datetime.utcnow()
        request.completed_at = datetime.utcnow()
        request.assets_team_notes = notes
        
        self.db.commit()
        
        # Notify employee that assets are ready
        self._notify_employee_assets_ready(request, assigned_assets)
        
        return {
            "success": True,
            "message": "Assets assigned successfully",
            "assigned_assets": assigned_assets
        }
    
    def create_complaint(
        self, 
        employee_id: int,
        title: str,
        description: str,
        complaint_type: str,
        asset_id: int = None,
        priority: str = "normal",
        impact_level: str = "medium"
    ) -> Dict:
        """Create asset complaint with enhanced notifications"""
        
        complaint = models.AssetComplaint(
            employee_id=employee_id,
            asset_id=asset_id,
            title=title,
            description=description,
            complaint_type=complaint_type,
            priority=priority,
            impact_level=impact_level
        )
        
        self.db.add(complaint)
        self.db.commit()
        self.db.refresh(complaint)
        
        # Notify assets team about new complaint with detailed information
        self._notify_assets_team_complaint(complaint)
        
        return {
            "success": True,
            "message": "IT issue reported successfully",
            "complaint_id": complaint.id,
            "ticket_number": f"COMP-{complaint.id:06d}"
        }
    
    def assign_complaint(self, complaint_id: int, technician_id: int) -> Dict:
        """Assign complaint to technician"""
        complaint = self.db.query(models.AssetComplaint).filter(models.AssetComplaint.id == complaint_id).first()
        
        if not complaint:
            return {"success": False, "message": "Complaint not found"}
        
        complaint.assigned_to = technician_id
        complaint.assigned_at = datetime.utcnow()
        complaint.status = "in_progress"
        
        self.db.commit()
        
        return {"success": True, "message": "Complaint assigned to technician"}
    
    def resolve_complaint(
        self, 
        complaint_id: int, 
        resolution_notes: str,
        resolution_action: str,
        technician_id: int
    ) -> Dict:
        """Resolve complaint with enhanced notifications"""
        complaint = self.db.query(models.AssetComplaint).filter(models.AssetComplaint.id == complaint_id).first()
        
        if not complaint:
            return {"success": False, "message": "Complaint not found"}
        
        complaint.resolution_notes = resolution_notes
        complaint.resolution_action = resolution_action
        complaint.resolved_at = datetime.utcnow()
        complaint.status = "resolved"
        
        self.db.commit()
        
        # Notify employee about resolution
        self._notify_employee_complaint_resolved(complaint)
        
        # Notify managers and admin about resolution
        self._notify_managers_complaint_resolved(complaint)
        
        return {"success": True, "message": "IT issue resolved successfully"}
    
    def get_pending_requests_for_manager(self, manager_id: int) -> List[Dict]:
        """Get pending asset requests for manager approval"""
        # Get employees under this manager
        employees = self.db.query(models.Employee).join(models.User).filter(
            models.User.role.in_(["employee"])
        ).all()
        
        employee_ids = [emp.id for emp in employees]
        
        requests = self.db.query(models.AssetRequest).filter(
            and_(
                models.AssetRequest.employee_id.in_(employee_ids),
                models.AssetRequest.status == "pending"
            )
        ).all()
        
        return [self._format_request(req) for req in requests]
    
    def get_pending_requests_for_hr(self) -> List[Dict]:
        """Get pending asset requests for HR approval"""
        requests = self.db.query(models.AssetRequest).filter(
            models.AssetRequest.status == "manager_approved"
        ).all()
        
        return [self._format_request(req) for req in requests]
    
    def get_requests_for_assets_team(self) -> List[Dict]:
        """Get requests for assets team"""
        requests = self.db.query(models.AssetRequest).filter(
            models.AssetRequest.status.in_(["hr_approved", "assigned_to_assets"])
        ).all()
        
        return [self._format_request(req) for req in requests]
    
    def get_complaints_for_assets_team(self) -> List[Dict]:
        """Get complaints for assets team"""
        complaints = self.db.query(models.AssetComplaint).filter(
            models.AssetComplaint.status.in_(["open", "in_progress"])
        ).all()
        
        return [self._format_complaint(complaint) for complaint in complaints]
    
    def get_employee_assets(self, employee_id: int) -> List[Dict]:
        """Get assets assigned to employee"""
        assets = self.db.query(models.Asset).filter(
            models.Asset.assigned_to == employee_id
        ).all()
        
        return [self._format_asset(asset) for asset in assets]
    
    def get_employee_requests(self, employee_id: int) -> List[Dict]:
        """Get asset requests by employee"""
        requests = self.db.query(models.AssetRequest).filter(
            models.AssetRequest.employee_id == employee_id
        ).order_by(models.AssetRequest.created_at.desc()).all()
        
        return [self._format_request(req) for req in requests]
    
    def get_employee_complaints(self, employee_id: int) -> List[Dict]:
        """Get complaints by employee"""
        complaints = self.db.query(models.AssetComplaint).filter(
            models.AssetComplaint.employee_id == employee_id
        ).order_by(models.AssetComplaint.created_at.desc()).all()
        
        return [self._format_complaint(complaint) for complaint in complaints]
    
    def _format_request(self, request: models.AssetRequest) -> Dict:
        """Format asset request for API response"""
        return {
            "id": request.id,
            "employee_id": request.employee_id,
            "employee_name": f"{request.employee.first_name} {request.employee.last_name}" if request.employee else "Unknown",
            "request_type": request.request_type,
            "requested_assets": request.requested_assets,
            "reason": request.reason,
            "priority": request.priority,
            "status": request.status,
            "created_at": request.created_at.isoformat() if request.created_at else None,
            "manager_notes": request.manager_notes,
            "hr_notes": request.hr_notes,
            "assets_team_notes": request.assets_team_notes
        }
    
    def _format_complaint(self, complaint: models.AssetComplaint) -> Dict:
        """Format complaint for API response"""
        # Get employee name safely
        employee_name = "Unknown"
        try:
            if complaint.employee:
                employee_name = f"{complaint.employee.first_name} {complaint.employee.last_name}"
            else:
                # Fallback: query employee separately
                employee = self.db.query(models.Employee).filter(models.Employee.id == complaint.employee_id).first()
                if employee:
                    employee_name = f"{employee.first_name} {employee.last_name}"
        except Exception:
            employee_name = "Unknown"
            
        return {
            "id": complaint.id,
            "ticket_number": f"COMP-{complaint.id:06d}",
            "employee_id": complaint.employee_id,
            "employee_name": employee_name,
            "asset_id": complaint.asset_id,
            "asset_name": complaint.asset.name if complaint.asset else None,
            "title": complaint.title,
            "description": complaint.description,
            "complaint_type": complaint.complaint_type,
            "priority": complaint.priority,
            "impact_level": complaint.impact_level,
            "status": complaint.status,
            "created_at": complaint.created_at.isoformat() if complaint.created_at else None,
            "assigned_to": complaint.assigned_to,
            "resolution_notes": complaint.resolution_notes
        }
    
    def _format_asset(self, asset: models.Asset) -> Dict:
        """Format asset for API response"""
        return {
            "id": asset.id,
            "name": asset.name,
            "type": asset.type,
            "serial_number": asset.serial_number,
            "status": asset.status,
            "specifications": asset.specifications
        }
    
    def _notify_manager_for_approval(self, request: models.AssetRequest):
        """Notify manager about pending asset request"""
        # Implementation depends on your notification system
        pass
    
    def _notify_hr_for_approval(self, request: models.AssetRequest):
        """Notify HR about pending asset request"""
        pass
    
    def _notify_assets_team(self, request: models.AssetRequest):
        """Notify assets team about approved request"""
        pass
    
    def _notify_assets_team_complaint(self, complaint: models.AssetComplaint):
        """Notify assets team about new IT complaint with detailed information"""
        try:
            # Get all assets team members
            assets_team_users = self.db.query(models.User).filter(
                models.User.role == "assets_team",
                models.User.is_active == True
            ).all()
            
            # Get employee information safely
            employee_name = "Unknown Employee"
            try:
                if complaint.employee:
                    employee_name = f"{complaint.employee.first_name} {complaint.employee.last_name}"
                else:
                    # Fallback: query employee separately
                    employee = self.db.query(models.Employee).filter(models.Employee.id == complaint.employee_id).first()
                    if employee:
                        employee_name = f"{employee.first_name} {employee.last_name}"
            except Exception as e:
                print(f"Error getting employee name: {e}")
                employee_name = f"Employee ID: {complaint.employee_id}"
            
            # Get asset information safely
            asset_info = "No specific equipment mentioned"
            try:
                if complaint.asset:
                    asset_info = f"Related Equipment: {complaint.asset.name} ({complaint.asset.serial_number})"
            except Exception as e:
                print(f"Error getting asset info: {e}")
                if complaint.asset_id:
                    asset_info = f"Related Equipment ID: {complaint.asset_id}"
            
            # Create detailed complaint message
            issue_type_map = {
                'hardware_issue': '💻 Hardware Issue',
                'software_issue': '🖥️ Software Issue', 
                'network_issue': '📶 Network Issue',
                'email_issue': '📧 Email Issue',
                'performance': '⚡ Performance Issue',
                'damage': '🔧 Physical Damage',
                'theft': '🚨 Theft/Loss',
                'other': '❓ Other IT Issue'
            }
            
            issue_type_display = issue_type_map.get(complaint.complaint_type, complaint.complaint_type)
            
            detailed_message = f"""🚨 New IT Issue Reported

Employee: {employee_name}
Ticket: COMP-{complaint.id:06d}
Issue: {complaint.title}

Type: {issue_type_display}
Priority: {complaint.priority.upper()}
Impact: {complaint.impact_level.upper()}

Description:
{complaint.description}

{asset_info}

Please investigate and resolve this IT issue promptly."""
            
            for user in assets_team_users:
                try:
                    self.notification_service.create_notification(
                        user_id=user.id,
                        title=f"🚨 New IT Issue: {complaint.title}",
                        message=detailed_message,
                        type="it_complaint",
                        action_url=f"/assets/complaints/{complaint.id}",
                        notification_data={
                            "complaint_id": complaint.id,
                            "employee_id": complaint.employee_id,
                            "priority": complaint.priority,
                            "impact_level": complaint.impact_level,
                            "complaint_type": complaint.complaint_type
                        }
                    )
                except Exception as e:
                    print(f"Error creating notification for user {user.id}: {e}")
                    # Continue with other users even if one fails
                    continue
                    
        except Exception as e:
            print(f"Error in _notify_assets_team_complaint: {e}")
            # Don't let notification errors prevent complaint creation
            pass
    
    def _notify_employee_complaint_resolved(self, complaint: models.AssetComplaint):
        """Notify employee that their IT complaint is resolved"""
        try:
            resolution_message = f"""✅ Your IT Issue Has Been Resolved

Ticket: COMP-{complaint.id:06d}
Issue: {complaint.title}

Resolution: {complaint.resolution_action.replace('_', ' ').title()}
Details: {complaint.resolution_notes}

Your IT issue has been resolved by our Assets Team. If you continue to experience problems, please report a new issue."""
            
            # Get employee's user ID safely
            employee_user = None
            try:
                if complaint.employee and complaint.employee.user_id:
                    employee_user = self.db.query(models.User).filter(models.User.id == complaint.employee.user_id).first()
                else:
                    # Fallback: query employee separately
                    employee = self.db.query(models.Employee).filter(models.Employee.id == complaint.employee_id).first()
                    if employee and employee.user_id:
                        employee_user = self.db.query(models.User).filter(models.User.id == employee.user_id).first()
            except Exception as e:
                print(f"Error getting employee user: {e}")
                
            if employee_user:
                self.notification_service.create_notification(
                    user_id=employee_user.id,
                    title="✅ IT Issue Resolved",
                    message=resolution_message,
                    type="complaint_resolved",
                    action_url=f"/assets/complaints/{complaint.id}",
                    notification_data={
                        "complaint_id": complaint.id,
                        "resolution_action": complaint.resolution_action
                    }
                )
        except Exception as e:
            print(f"Error in _notify_employee_complaint_resolved: {e}")
            # Don't let notification errors prevent resolution
    
    def _notify_managers_complaint_resolved(self, complaint: models.AssetComplaint):
        """Notify managers and admin that an IT complaint has been resolved"""
        try:
            # Get all manager, HR, and admin users
            manager_users = self.db.query(models.User).filter(
                models.User.role.in_(["manager", "hr", "admin"]),
                models.User.is_active == True
            ).all()
            
            # Get employee name safely
            employee_name = "Unknown Employee"
            try:
                if complaint.employee:
                    employee_name = f"{complaint.employee.first_name} {complaint.employee.last_name}"
                else:
                    # Fallback: query employee separately
                    employee = self.db.query(models.Employee).filter(models.Employee.id == complaint.employee_id).first()
                    if employee:
                        employee_name = f"{employee.first_name} {employee.last_name}"
            except Exception as e:
                print(f"Error getting employee name: {e}")
                employee_name = f"Employee ID: {complaint.employee_id}"
            
            resolution_message = f"""✅ IT Issue Resolved

Employee: {employee_name}
Ticket: COMP-{complaint.id:06d}
Issue: {complaint.title}

Resolution: {complaint.resolution_action.replace('_', ' ').title()}
Resolved by: Assets Team

The IT issue has been successfully resolved."""
            
            for user in manager_users:
                try:
                    self.notification_service.create_notification(
                        user_id=user.id,
                        title="✅ IT Issue Resolved",
                        message=resolution_message,
                        type="complaint_resolved",
                        action_url=f"/assets/complaints/{complaint.id}",
                        notification_data={
                            "complaint_id": complaint.id,
                            "employee_id": complaint.employee_id,
                            "resolution_action": complaint.resolution_action
                        }
                    )
                except Exception as e:
                    print(f"Error creating notification for manager {user.id}: {e}")
                    continue
        except Exception as e:
            print(f"Error in _notify_managers_complaint_resolved: {e}")
            # Don't let notification errors prevent resolution