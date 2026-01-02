"""
Onboarding Approval Service - Gatekeeper Model
Handles the gatekeeper model for onboarding workflow where IT provisioning 
only happens after compliance approval
"""

from datetime import datetime, timedelta
from typing import Dict, List, Optional
from sqlalchemy.orm import Session
from . import models
from .notification_service import NotificationService
from .it_provisioning_service import ITProvisioningService
import json
import secrets
import string


class OnboardingApprovalService:
    def __init__(self, db: Session):
        self.db = db
        self.notification_service = NotificationService(db)
        self.it_service = ITProvisioningService(db)
    
    def get_compliance_status(self, employee_id: int) -> Dict:
        """
        Get compliance gate status for an employee
        """
        employee = self.db.query(models.Employee).filter(models.Employee.id == employee_id).first()
        if not employee:
            return {"error": "Employee not found"}
        
        # Get or create onboarding approval record
        approval = self.db.query(models.OnboardingApproval).filter(
            models.OnboardingApproval.employee_id == employee_id,
            models.OnboardingApproval.approval_stage == "compliance_review"
        ).first()
        
        if not approval:
            approval = models.OnboardingApproval(
                employee_id=employee_id,
                approval_stage="compliance_review",
                status="pending"
            )
            self.db.add(approval)
            self.db.commit()
            self.db.refresh(approval)
        
        # Check form completion
        form_completed = employee.profile_summary is not None
        
        # Check document verification
        documents = self.db.query(models.EmployeeDocument).filter(
            models.EmployeeDocument.employee_id == employee_id
        ).all()
        
        documents_verified = len(documents) > 0 and all(doc.is_verified for doc in documents)
        
        return {
            "employee_id": employee_id,
            "compliance_gate_status": approval.status,
            "form_completed": form_completed,
            "documents_verified": documents_verified,
            "ocr_verification_complete": approval.ocr_verification_complete,
            "admin_review_complete": approval.admin_review_complete,
            "form_data_locked": approval.form_data_locked,
            "can_proceed_to_it": approval.status == "approved",
            "compliance_approved_at": approval.compliance_approved_at.isoformat() if approval.compliance_approved_at else None
        }