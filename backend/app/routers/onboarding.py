from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from typing import List
from app import database, models, schemas
from app.dependencies import get_current_user
from app.it_provisioning_service import ITProvisioningService
from app.onboarding_approval_service import OnboardingApprovalService
from app.asset_management_service import AssetManagementService
from app.infrastructure_service import InfrastructureService
from datetime import datetime, timedelta
import shutil
import os

router = APIRouter(
    prefix="/onboarding",
    tags=["onboarding"]
)

# --- Tasks ---

@router.get("/tasks/", response_model=List[schemas.OnboardingTaskOut])
def read_tasks(db: Session = Depends(database.get_db), current_user: models.User = Depends(get_current_user)):
    employee = db.query(models.Employee).filter(models.Employee.user_id == current_user.id).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee profile not found")
    
    tasks = db.query(models.OnboardingTask).filter(models.OnboardingTask.employee_id == employee.id).all()
    
    # If no tasks exist, create default onboarding tasks
    if not tasks:
        default_tasks = [
            {
                "task_name": "Complete Employee Information Form",
                "description": "Fill out all personal, contact, and statutory information",
                "is_completed": False,
                "employee_id": employee.id
            },
            {
                "task_name": "Upload Required Documents",
                "description": "Upload PAN card, Aadhaar card, and other identity documents",
                "is_completed": False,
                "employee_id": employee.id
            },
            {
                "task_name": "Sign Offer Letter",
                "description": "Review and digitally sign your offer letter",
                "is_completed": False,
                "employee_id": employee.id
            },
            {
                "task_name": "Complete IT Setup",
                "description": "Receive and set up company email, VPN, and hardware",
                "is_completed": False,
                "employee_id": employee.id
            },
            {
                "task_name": "Attend Induction Training",
                "description": "Complete all mandatory training modules",
                "is_completed": False,
                "employee_id": employee.id
            }
        ]
        
        for task_data in default_tasks:
            task = models.OnboardingTask(**task_data)
            db.add(task)
        
        db.commit()
        tasks = db.query(models.OnboardingTask).filter(models.OnboardingTask.employee_id == employee.id).all()
    
    return tasks

@router.post("/tasks/", response_model=schemas.OnboardingTaskOut)
def create_task(task: schemas.OnboardingTaskCreate, db: Session = Depends(database.get_db), current_user: models.User = Depends(get_current_user)):
    # Admin only ideally
    employee = db.query(models.Employee).filter(models.Employee.user_id == current_user.id).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee profile not found")

    db_task = models.OnboardingTask(**task.dict(), employee_id=employee.id)
    db.add(db_task)
    db.commit()
    db.refresh(db_task)
    return db_task

@router.put("/tasks/{task_id}/complete", response_model=schemas.OnboardingTaskOut)
def complete_task(task_id: int, db: Session = Depends(database.get_db)):
    task = db.query(models.OnboardingTask).filter(models.OnboardingTask.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    task.is_completed = True
    task.completed_at = datetime.utcnow()
    db.commit()
    db.refresh(task)
    return task

# --- Offer Letter ---

@router.post("/generate-offer", response_model=schemas.OfferLetterOut)
def generate_offer_letter(db: Session = Depends(database.get_db), current_user: models.User = Depends(get_current_user)):
    employee = db.query(models.Employee).filter(models.Employee.user_id == current_user.id).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee profile not found")
    
    existing = db.query(models.OfferLetter).filter(models.OfferLetter.employee_id == employee.id).first()
    if existing:
        return existing

    content = f"""
    OFFER OF EMPLOYMENT

    Dear {employee.first_name} {employee.last_name},

    We are pleased to offer you the position of {employee.position} at our company.
    Your start date will be {employee.date_of_joining}.

    We look forward to welcoming you to the team.

    Sincerely,
    HR Department
    """
    
    offer = models.OfferLetter(employee_id=employee.id, content=content)
    db.add(offer)
    db.commit()
    db.refresh(offer)
    return offer

@router.post("/sign-offer", response_model=schemas.OfferLetterOut)
def sign_offer_letter(db: Session = Depends(database.get_db), current_user: models.User = Depends(get_current_user)):
    employee = db.query(models.Employee).filter(models.Employee.user_id == current_user.id).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee profile not found")
    
    offer = db.query(models.OfferLetter).filter(models.OfferLetter.employee_id == employee.id).first()
    if not offer:
        raise HTTPException(status_code=404, detail="Offer letter not found")
    
    offer.is_signed = True
    offer.signed_at = datetime.utcnow()
    db.commit()
    db.refresh(offer)
    return offer

# --- Documents ---

import random

@router.post("/upload-doc", response_model=schemas.EmployeeDocumentOut)
def upload_onboarding_doc(file: UploadFile = File(...), doc_type: str = "General", db: Session = Depends(database.get_db), current_user: models.User = Depends(get_current_user)):
    employee = db.query(models.Employee).filter(models.Employee.user_id == current_user.id).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee profile not found")

    upload_dir = "uploads"
    os.makedirs(upload_dir, exist_ok=True)
    file_location = f"{upload_dir}/{file.filename}"
    
    with open(file_location, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    # Mock AI OCR Verification
    ocr_confidence = round(random.uniform(60.0, 99.9), 1)
    is_verified = ocr_confidence >= 75.0
    rejection_reason = None
    
    if not is_verified:
        rejection_reason = "Low OCR confidence. Please ensure the document is clear and well-lit."
    
    doc = models.EmployeeDocument(
        employee_id=employee.id,
        document_type=doc_type,
        document_url=file_location,
        is_verified=is_verified,
        ocr_confidence=ocr_confidence,
        rejection_reason=rejection_reason
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)
    return doc

@router.post("/it-handshake/ready", response_model=schemas.ITProvisioningResponse)
def mark_it_ready(
    request: schemas.ITProvisioningRequest, 
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    Mark IT setup as ready and provision all IT resources
    """
    employee = db.query(models.Employee).filter(models.Employee.id == request.employee_id).first()
    if not employee:
        # Provide helpful error message with available employee IDs
        available_employees = db.query(models.Employee.id, models.Employee.first_name, models.Employee.last_name).limit(5).all()
        available_ids = [f"ID {emp.id}: {emp.first_name} {emp.last_name}" for emp in available_employees]
        raise HTTPException(
            status_code=404, 
            detail=f"Employee with ID {request.employee_id} not found. Available employees: {', '.join(available_ids)}"
        )
    
    # Initialize IT provisioning service
    it_service = ITProvisioningService(db)
    
    # Provision all IT resources
    provisioning_result = it_service.provision_all_resources(
        employee_id=request.employee_id,
        provision_email=request.provision_email,
        provision_vpn=request.provision_vpn,
        provision_access_card=request.provision_access_card,
        assign_assets=request.assign_assets,
        access_level=request.access_level,
        building_access=request.building_access,
        floor_access=request.floor_access
    )
    
    # Update employee IT setup status
    employee.it_setup_status = "completed"
    db.commit()
    
    # Get provisioning logs
    logs = db.query(models.ITProvisioningLog).filter(
        models.ITProvisioningLog.employee_id == request.employee_id
    ).order_by(models.ITProvisioningLog.created_at.desc()).limit(10).all()
    
    return schemas.ITProvisioningResponse(
        success=provisioning_result["success"],
        message=provisioning_result["message"],
        provisioned_resources=provisioning_result["provisioned_resources"],
        failed_resources=provisioning_result["failed_resources"],
        logs=[schemas.ITProvisioningLogOut.model_validate(log) for log in logs]
    )

@router.get("/it-resources/{employee_id}")
def get_employee_it_resources(
    employee_id: int, 
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    Get all IT resources for an employee
    """
    it_service = ITProvisioningService(db)
    return it_service.get_employee_it_resources(employee_id)

@router.post("/documents/{document_id}/verify")
def verify_document(
    document_id: int,
    verification_status: bool,
    rejection_reason: str = None,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Manually verify or reject a document (Admin only)"""
    if current_user.role not in ["admin", "hr"]:
        raise HTTPException(status_code=403, detail="Only admin or HR can verify documents")
    
    document = db.query(models.EmployeeDocument).filter(models.EmployeeDocument.id == document_id).first()
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    
    document.is_verified = verification_status
    if not verification_status and rejection_reason:
        document.rejection_reason = rejection_reason
    else:
        document.rejection_reason = None
    
    document.verified_by = current_user.id
    document.verified_at = datetime.utcnow()
    
    db.commit()
    db.refresh(document)
    
    return {
        "message": f"Document {'verified' if verification_status else 'rejected'} successfully",
        "document": schemas.EmployeeDocumentOut.model_validate(document)
    }

@router.get("/documents/pending-verification")
def get_pending_document_verifications(
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Get all documents pending manual verification"""
    if current_user.role not in ["admin", "hr"]:
        raise HTTPException(status_code=403, detail="Only admin or HR can view pending verifications")
    
    pending_docs = db.query(models.EmployeeDocument).filter(
        models.EmployeeDocument.is_verified == False,
        models.EmployeeDocument.ocr_confidence < 75.0
    ).join(models.Employee).all()
    
    return [
        {
            "document_id": doc.id,
            "employee_name": f"{doc.employee.first_name} {doc.employee.last_name}",
            "employee_id": doc.employee_id,
            "document_type": doc.document_type,
            "document_url": doc.document_url,
            "ocr_confidence": doc.ocr_confidence,
            "uploaded_at": doc.uploaded_at.isoformat(),
            "rejection_reason": doc.rejection_reason
        }
        for doc in pending_docs
    ]

@router.get("/documents", response_model=List[schemas.EmployeeDocumentOut])
def get_my_documents(db: Session = Depends(database.get_db), current_user: models.User = Depends(get_current_user)):
    employee = db.query(models.Employee).filter(models.Employee.user_id == current_user.id).first()
    if not employee:
        return []
    return db.query(models.EmployeeDocument).filter(models.EmployeeDocument.employee_id == employee.id).all()


# --- Induction ---

@router.get("/induction-modules", response_model=List[schemas.InductionModuleOut])
def get_induction_modules(db: Session = Depends(database.get_db)):
    # Return mock data or from DB
    modules = db.query(models.InductionModule).all()
    if not modules:
        # Seed if empty
        seed_data = [
            {"title": "Company Culture", "video_url": "https://www.youtube.com/embed/dQw4w9WgXcQ", "description": "Learn about our values."},
            {"title": "IT Security Policy", "video_url": "https://www.youtube.com/embed/dQw4w9WgXcQ", "description": "Important security guidelines."},
            {"title": "HR Benefits", "video_url": "https://www.youtube.com/embed/dQw4w9WgXcQ", "description": "Overview of your benefits."}
        ]
        for data in seed_data:
            m = models.InductionModule(**data)
            db.add(m)
        db.commit()
        modules = db.query(models.InductionModule).all()
    return modules

# --- AI Chatbot ---

@router.post("/chat")
def onboarding_chat(message: str):
    # Mock AI Response
    responses = {
        "wifi": "The office WiFi password is 'SecureNet2024'.",
        "parking": "You can park in the visitor lot for your first week.",
        "dress code": "Our dress code is business casual.",
        "benefits": "You can view the benefits guide in the Documents section."
    }
    
    response = "I'm not sure about that. Please contact HR."
    for key, val in responses.items():
        if key in message.lower():
            response = val
            break
            
    return {"response": response}

@router.get("/my-employee-id")
def get_my_employee_id(db: Session = Depends(database.get_db), current_user: models.User = Depends(get_current_user)):
    """Get the current user's employee ID"""
    employee = db.query(models.Employee).filter(models.Employee.user_id == current_user.id).first()
    if not employee:
        # If no employee record exists, create one
        employee = models.Employee(
            user_id=current_user.id,
            first_name=current_user.email.split('@')[0].title(),
            last_name="User",
            department="General",
            position="Employee",
            date_of_joining=datetime.utcnow(),
            is_active=True
        )
        db.add(employee)
        db.commit()
        db.refresh(employee)
    
    return {
        "employee_id": employee.id,
        "user_id": current_user.id,
        "name": f"{employee.first_name} {employee.last_name}",
        "email": current_user.email
    }

@router.post("/employee-information")
async def submit_employee_information(
    full_name: str = None,
    designation: str = None,
    employee_id: str = None,
    personal_contact: str = None,
    official_contact: str = None,
    personal_email: str = None,
    official_email: str = None,
    permanent_address: str = None,
    present_address: str = None,
    date_of_birth: str = None,
    gender: str = None,
    marital_status: str = None,
    blood_group: str = None,
    nationality: str = None,
    father_name: str = None,
    mother_name: str = None,
    spouse_name: str = None,
    emergency_contact_name: str = None,
    emergency_contact_number: str = None,
    emergency_contact_relation: str = None,
    education: str = None,
    employment_history: str = None,
    bank_name: str = None,
    account_number: str = None,
    ifsc_code: str = None,
    branch_name: str = None,
    pan_number: str = None,
    aadhaar_number: str = None,
    uan_number: str = None,
    pf_number: str = None,
    esi_number: str = None,
    has_criminal_record: bool = False,
    has_health_issues: bool = False,
    health_issues_details: str = None,
    previous_employer_clearance: bool = True,
    photo: UploadFile = File(None),
    signature: UploadFile = File(None),
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    Submit comprehensive employee information during onboarding
    """
    try:
        # Get or create employee record
        employee = db.query(models.Employee).filter(models.Employee.user_id == current_user.id).first()
        
        if not employee:
            # Create new employee record
            employee = models.Employee(
                user_id=current_user.id,
                first_name=full_name.split()[0] if full_name else "",
                last_name=" ".join(full_name.split()[1:]) if full_name and len(full_name.split()) > 1 else "",
                department=designation,
                position=designation,
                date_of_joining=datetime.utcnow()
            )
            db.add(employee)
            db.flush()
        
        # Update employee with additional information
        if full_name:
            names = full_name.split()
            employee.first_name = names[0]
            employee.last_name = " ".join(names[1:]) if len(names) > 1 else ""
        
        if designation:
            employee.position = designation
            employee.department = designation
        
        if pan_number:
            employee.pan_number = pan_number
        
        if aadhaar_number:
            employee.aadhaar_number = aadhaar_number
        
        # Handle file uploads
        if photo:
            photo_dir = "backend/uploads/employee_photos"
            os.makedirs(photo_dir, exist_ok=True)
            photo_path = os.path.join(photo_dir, f"{employee.id}_{photo.filename}")
            with open(photo_path, "wb") as buffer:
                shutil.copyfileobj(photo.file, buffer)
        
        if signature:
            sig_dir = "backend/uploads/employee_signatures"
            os.makedirs(sig_dir, exist_ok=True)
            sig_path = os.path.join(sig_dir, f"{employee.id}_{signature.filename}")
            with open(sig_path, "wb") as buffer:
                shutil.copyfileobj(signature.file, buffer)
        
        # Store additional information in profile_summary as JSON
        import json
        additional_info = {
            "personal_contact": personal_contact,
            "official_contact": official_contact,
            "personal_email": personal_email,
            "official_email": official_email,
            "permanent_address": permanent_address,
            "present_address": present_address,
            "date_of_birth": date_of_birth,
            "gender": gender,
            "marital_status": marital_status,
            "blood_group": blood_group,
            "nationality": nationality,
            "father_name": father_name,
            "mother_name": mother_name,
            "spouse_name": spouse_name,
            "emergency_contact": {
                "name": emergency_contact_name,
                "number": emergency_contact_number,
                "relation": emergency_contact_relation
            },
            "education": json.loads(education) if education else [],
            "employment_history": json.loads(employment_history) if employment_history else [],
            "bank_details": {
                "bank_name": bank_name,
                "account_number": account_number,
                "ifsc_code": ifsc_code,
                "branch_name": branch_name
            },
            "statutory": {
                "uan_number": uan_number,
                "pf_number": pf_number,
                "esi_number": esi_number
            },
            "declarations": {
                "has_criminal_record": has_criminal_record,
                "has_health_issues": has_health_issues,
                "health_issues_details": health_issues_details,
                "previous_employer_clearance": previous_employer_clearance
            }
        }
        
        employee.profile_summary = json.dumps(additional_info)
        
        db.commit()
        db.refresh(employee)
        
        return {
            "message": "Employee information submitted successfully",
            "employee_id": employee.id,
            "status": "completed"
        }
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error submitting employee information: {str(e)}")


# --- Enhanced Onboarding Management - Gatekeeper Model ---

@router.get("/compliance-status/{employee_id}")
def get_compliance_status(
    employee_id: int,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Get compliance gate status for an employee"""
    approval_service = OnboardingApprovalService(db)
    return approval_service.get_compliance_status(employee_id)

@router.post("/submit-for-review/{employee_id}")
def submit_for_compliance_review(
    employee_id: int,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Submit employee data for compliance review (Complete Phase 3)"""
    approval_service = OnboardingApprovalService(db)
    return approval_service.submit_for_compliance_review(employee_id)

@router.post("/approve-and-request-it")
def approve_compliance_and_request_it(
    request: schemas.ApproveAndRequestITRequest,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    THE GATEKEEPER ENDPOINT: Approve compliance and request IT provisioning
    This is the key endpoint that implements the gatekeeper model
    """
    # Only admin/HR can approve compliance
    if current_user.role not in ["admin", "hr"]:
        raise HTTPException(status_code=403, detail="Only admin or HR can approve compliance")
    
    approval_service = OnboardingApprovalService(db)
    result = approval_service.approve_compliance_and_request_it(
        request.dict(), 
        current_user.id
    )
    
    # After compliance approval, create asset request for new employee
    if result.get("success"):
        asset_service = AssetManagementService(db)
        
        # Create asset request for new employee
        asset_request_result = asset_service.create_asset_request(
            employee_id=request.employee_id,
            request_type="new_employee",
            requested_assets=["Laptop", "Monitor", "Keyboard", "Mouse", "Headset"],
            reason="New employee onboarding - standard IT equipment",
            business_justification="Required for employee to start work",
            priority="normal",
            requested_by=current_user.id
        )
        
        # Auto-approve by manager and HR since this is part of onboarding
        if asset_request_result.get("success"):
            request_id = asset_request_result["request_id"]
            
            # Auto-approve by manager (using current HR/admin user)
            asset_service.approve_by_manager(request_id, current_user.id, "Auto-approved for new employee onboarding")
            
            # Auto-approve by HR (using current HR/admin user)
            asset_service.approve_by_hr(request_id, current_user.id, "Auto-approved for new employee onboarding")
            
            result["asset_request_created"] = True
            result["asset_request_id"] = request_id
    
    return result

@router.post("/process-it-ticket/{ticket_id}")
def process_it_provisioning_ticket(
    ticket_id: int,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Process IT provisioning ticket (IT Team endpoint)"""
    # Only admin/IT can process tickets
    if current_user.role not in ["admin", "it"]:
        raise HTTPException(status_code=403, detail="Only admin or IT can process tickets")
    
    approval_service = OnboardingApprovalService(db)
    return approval_service.process_it_provisioning(ticket_id, current_user.id)

@router.get("/it-tickets")
def get_it_provisioning_tickets(
    status: str = "open",
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Get IT provisioning tickets (IT Team dashboard)"""
    if current_user.role not in ["admin", "it"]:
        raise HTTPException(status_code=403, detail="Only admin or IT can view tickets")
    
    tickets = db.query(models.ITProvisioningTicket).filter(
        models.ITProvisioningTicket.status == status
    ).order_by(models.ITProvisioningTicket.created_at.desc()).all()
    
    return [schemas.ITProvisioningTicketOut.model_validate(ticket) for ticket in tickets]

@router.get("/pending-approvals")
def get_pending_compliance_approvals(
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Get employees pending compliance approval (Admin dashboard)"""
    if current_user.role not in ["admin", "hr"]:
        raise HTTPException(status_code=403, detail="Only admin or HR can view pending approvals")
    
    # Get employees with pending compliance reviews
    pending_approvals = db.query(models.OnboardingApproval).filter(
        models.OnboardingApproval.approval_stage == "compliance_review",
        models.OnboardingApproval.status == "pending"
    ).join(models.Employee).all()
    
    return [
        {
            "approval_id": approval.id,
            "employee_id": approval.employee_id,
            "employee_name": f"{approval.employee.first_name} {approval.employee.last_name}",
            "created_at": approval.created_at.isoformat() if approval.created_at else None,
            "documents_verified": approval.documents_verified,
            "background_check_status": approval.background_check_status
        }
        for approval in pending_approvals
    ]

@router.post("/request-infrastructure/{employee_id}")
def request_infrastructure_setup(
    employee_id: int,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Request infrastructure setup for new employee (HR/Admin button)"""
    if current_user.role not in ["admin", "hr"]:
        raise HTTPException(status_code=403, detail="Only admin or HR can request infrastructure setup")
    
    # Check if employee exists
    employee = db.query(models.Employee).filter(models.Employee.id == employee_id).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    # Create infrastructure request
    infra_service = InfrastructureService(db)
    
    result = infra_service.create_infrastructure_request(
        employee_id=employee_id,
        requested_by=current_user.id,
        laptop_required=True,
        email_setup_required=True,
        wifi_setup_required=True,
        id_card_required=True,
        biometric_setup_required=True,
        additional_requirements="New employee onboarding - complete infrastructure setup required",
        priority="normal",
        request_notes=f"Infrastructure setup requested by {current_user.email} for new employee {employee.first_name} {employee.last_name}"
    )
    
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["message"])
    
    return {
        "success": True,
        "message": f"Infrastructure setup requested for {employee.first_name} {employee.last_name}",
        "ticket_number": result["ticket_number"],
        "request_id": result["request_id"]
    }
    result = []
    for approval in pending_approvals:
        employee = approval.employee
        
        # Get document count and verification status
        documents = db.query(models.EmployeeDocument).filter(
            models.EmployeeDocument.employee_id == employee.id
        ).all()
        
        result.append({
            "employee_id": employee.id,
            "employee_name": f"{employee.first_name} {employee.last_name}",
            "department": employee.department,
            "position": employee.position,
            "form_completed": employee.profile_summary is not None,
            "documents_count": len(documents),
            "documents_verified": all(doc.is_verified for doc in documents) if documents else False,
            "submitted_at": approval.created_at.isoformat(),
            "days_pending": (datetime.utcnow() - approval.created_at).days
        })
    
    return result

@router.get("/progress/{employee_id}")
def get_onboarding_progress(
    employee_id: int,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Get detailed onboarding progress for an employee"""
    approval_service = OnboardingApprovalService(db)
    return approval_service.get_onboarding_progress(employee_id)

@router.post("/advance-phase/{employee_id}")
def advance_onboarding_phase(
    employee_id: int,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Advance employee to next onboarding phase"""
    approval_service = OnboardingApprovalService(db)
    return approval_service.advance_to_next_phase(employee_id)

@router.post("/activate-employee/{employee_id}")
def activate_employee(
    employee_id: int,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Final employee activation"""
    approval_service = OnboardingApprovalService(db)
    return approval_service.activate_employee(employee_id, current_user.id)

@router.get("/bulk-operations")
def get_bulk_operations_dashboard(
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Get bulk operations dashboard for admin users"""
    if current_user.role not in ["admin", "hr"]:
        raise HTTPException(status_code=403, detail="Only admin or HR can access bulk operations")
    
    # Get employees by status
    employees_by_status = {}
    statuses = ["pre_boarding", "initiation", "parallel_tracks", "induction", "activation", "completed"]
    
    for status in statuses:
        count = db.query(models.Employee).filter(
            models.Employee.onboarding_status == status
        ).count()
        employees_by_status[status] = count
    
    # Get overdue employees (more than 7 days in onboarding)
    overdue_employees = db.query(models.Employee).filter(
        models.Employee.onboarding_status != "completed",
        models.Employee.date_of_joining <= datetime.utcnow() - timedelta(days=7)
    ).all()
    
    # Get immediate joiners
    immediate_joiners = db.query(models.Employee).filter(
        models.Employee.is_immediate_joiner == True,
        models.Employee.onboarding_status != "completed"
    ).all()
    
    return {
        "employees_by_status": employees_by_status,
        "overdue_count": len(overdue_employees),
        "immediate_joiners_count": len(immediate_joiners),
        "overdue_employees": [
            {
                "id": emp.id,
                "name": f"{emp.first_name} {emp.last_name}",
                "department": emp.department,
                "days_overdue": (datetime.utcnow() - emp.date_of_joining).days if emp.date_of_joining else 0
            }
            for emp in overdue_employees
        ],
        "immediate_joiners": [
            {
                "id": emp.id,
                "name": f"{emp.first_name} {emp.last_name}",
                "department": emp.department,
                "status": emp.onboarding_status
            }
            for emp in immediate_joiners
        ]
    }

@router.post("/bulk-advance-phase")
def bulk_advance_phase(
    employee_ids: List[int],
    target_phase: int,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Bulk advance multiple employees to a specific phase"""
    if current_user.role not in ["admin", "hr"]:
        raise HTTPException(status_code=403, detail="Only admin or HR can perform bulk operations")
    
    approval_service = OnboardingApprovalService(db)
    results = []
    
    for employee_id in employee_ids:
        try:
            result = approval_service.advance_to_phase(employee_id, target_phase)
            results.append({
                "employee_id": employee_id,
                "success": True,
                "message": f"Advanced to phase {target_phase}"
            })
        except Exception as e:
            results.append({
                "employee_id": employee_id,
                "success": False,
                "message": str(e)
            })
    
    return {
        "results": results,
        "total_processed": len(employee_ids),
        "successful": len([r for r in results if r["success"]]),
        "failed": len([r for r in results if not r["success"]])
    }

@router.get("/employees/search")
def search_onboarding_employees(
    query: str = "",
    status: str = None,
    department: str = None,
    immediate_joiner: bool = None,
    limit: int = 50,
    offset: int = 0,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Search and filter employees in onboarding"""
    if current_user.role not in ["admin", "hr", "manager"]:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    query_obj = db.query(models.Employee)
    
    # Apply filters
    if query:
        query_obj = query_obj.filter(
            (models.Employee.first_name.ilike(f"%{query}%")) |
            (models.Employee.last_name.ilike(f"%{query}%")) |
            (models.Employee.department.ilike(f"%{query}%"))
        )
    
    if status:
        query_obj = query_obj.filter(models.Employee.onboarding_status == status)
    
    if department:
        query_obj = query_obj.filter(models.Employee.department == department)
    
    if immediate_joiner is not None:
        query_obj = query_obj.filter(models.Employee.is_immediate_joiner == immediate_joiner)
    
    # Get total count
    total = query_obj.count()
    
    # Apply pagination
    employees = query_obj.offset(offset).limit(limit).all()
    
    return {
        "employees": [
            {
                "id": emp.id,
                "name": f"{emp.first_name} {emp.last_name}",
                "department": emp.department,
                "position": emp.position,
                "onboarding_status": emp.onboarding_status,
                "is_immediate_joiner": emp.is_immediate_joiner,
                "date_of_joining": emp.date_of_joining.isoformat() if emp.date_of_joining else None,
                "it_setup_status": emp.it_setup_status
            }
            for emp in employees
        ],
        "total": total,
        "limit": limit,
        "offset": offset
    }

@router.get("/departments")
def get_departments(
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Get list of all departments for filtering"""
    departments = db.query(models.Employee.department).distinct().all()
    return [dept[0] for dept in departments if dept[0]]

@router.get("/dashboard-stats")
def get_onboarding_dashboard_stats(
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Get onboarding dashboard statistics"""
    
    # Get all employees in onboarding
    employees = db.query(models.Employee).filter(
        models.Employee.onboarding_status != "completed"
    ).all()
    
    stats = {
        "total_onboarding": len(employees),
        "by_phase": {
            "pre_boarding": 0,
            "initiation": 0,
            "parallel_tracks": 0,
            "induction": 0,
            "activation": 0
        },
        "immediate_joiners": 0,
        "overdue": 0,
        "recent_activations": []
    }
    
    approval_service = OnboardingApprovalService(db)
    
    for employee in employees:
        try:
            progress = approval_service.get_onboarding_progress(employee.id)
            phase = progress["current_phase"]
            
            if phase == 1:
                stats["by_phase"]["pre_boarding"] += 1
            elif phase == 2:
                stats["by_phase"]["initiation"] += 1
            elif phase == 3:
                stats["by_phase"]["parallel_tracks"] += 1
            elif phase == 4:
                stats["by_phase"]["induction"] += 1
            elif phase == 5:
                stats["by_phase"]["activation"] += 1
            
            if employee.is_immediate_joiner:
                stats["immediate_joiners"] += 1
            
            # Check if overdue (more than 7 days in onboarding)
            if progress["days_since_joining"] > 7:
                stats["overdue"] += 1
        except Exception as e:
            # Skip employees with errors in progress calculation
            continue
    
    # Get recent activations (last 7 days)
    recent_activations = db.query(models.Employee).filter(
        models.Employee.onboarding_status == "completed",
        models.Employee.date_of_joining >= datetime.utcnow() - timedelta(days=7)
    ).limit(5).all()
    
    stats["recent_activations"] = [
        {
            "name": f"{emp.first_name} {emp.last_name}",
            "department": emp.department,
            "position": emp.position,
            "activation_date": emp.date_of_joining.isoformat() if emp.date_of_joining else None
        }
        for emp in recent_activations
    ]
    
    return stats

@router.get("/check-prerequisites/{employee_id}/{phase}")
def check_phase_prerequisites(
    employee_id: int,
    phase: int,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Check if employee can proceed to specific phase"""
    approval_service = OnboardingApprovalService(db)
    return approval_service.check_phase_prerequisites(employee_id, phase)

@router.get("/timeline/{employee_id}")
def get_onboarding_timeline(
    employee_id: int,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Get onboarding timeline for an employee"""
    
    employee = db.query(models.Employee).filter(models.Employee.id == employee_id).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    # Get IT provisioning logs
    it_logs = db.query(models.ITProvisioningLog).filter(
        models.ITProvisioningLog.employee_id == employee_id
    ).order_by(models.ITProvisioningLog.created_at).all()
    
    # Get document uploads
    documents = db.query(models.EmployeeDocument).filter(
        models.EmployeeDocument.employee_id == employee_id
    ).order_by(models.EmployeeDocument.uploaded_at).all()
    
    # Get onboarding approvals
    approvals = db.query(models.OnboardingApproval).filter(
        models.OnboardingApproval.employee_id == employee_id
    ).order_by(models.OnboardingApproval.created_at).all()
    
    # Build timeline
    timeline = []
    
    # Add joining date
    if employee.date_of_joining:
        timeline.append({
            "date": employee.date_of_joining.isoformat(),
            "event": "Employee Joined",
            "description": f"{employee.first_name} {employee.last_name} joined as {employee.position}",
            "type": "milestone",
            "icon": "🎉"
        })
    
    # Add approval events
    for approval in approvals:
        timeline.append({
            "date": approval.created_at.isoformat(),
            "event": f"Phase {approval.approval_stage.title()} {approval.status.title()}",
            "description": f"Onboarding phase {approval.approval_stage} was {approval.status}",
            "type": "approval",
            "icon": "✅" if approval.status == "approved" else "⏳",
            "status": approval.status
        })
    
    # Add IT provisioning events
    for log in it_logs:
        timeline.append({
            "date": log.created_at.isoformat(),
            "event": f"IT {log.resource_type.title()} {log.action.title()}",
            "description": f"{log.resource_type} was {log.action}",
            "type": "it_provisioning",
            "icon": "💻",
            "status": log.status
        })
    
    # Add document events
    for doc in documents:
        timeline.append({
            "date": doc.uploaded_at.isoformat(),
            "event": f"Document Uploaded",
            "description": f"{doc.document_type} uploaded and {'verified' if doc.is_verified else 'rejected'}",
            "type": "document",
            "icon": "📄",
            "status": "verified" if doc.is_verified else "rejected"
        })
    
    # Sort by date
    timeline.sort(key=lambda x: x["date"])
    
    return {
        "employee_id": employee_id,
        "employee_name": f"{employee.first_name} {employee.last_name}",
        "timeline": timeline
    }