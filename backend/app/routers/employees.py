from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from typing import List
import shutil
import os
from datetime import datetime
from app import database, models, schemas

router = APIRouter(
    prefix="/employees",
    tags=["employees"]
)

UPLOAD_DIR = "uploads"
if not os.path.exists(UPLOAD_DIR):
    os.makedirs(UPLOAD_DIR)

@router.get("/search")
def search_employees(
    q: str = None,
    department: str = None,
    position: str = None,
    status: str = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(database.get_db)
):
    """Search employees with filters"""
    query = db.query(models.Employee).join(models.User)
    
    if q:
        # Search in first name, last name, and email
        query = query.filter(
            (models.Employee.first_name.ilike(f"%{q}%")) |
            (models.Employee.last_name.ilike(f"%{q}%")) |
            (models.User.email.ilike(f"%{q}%"))
        )
    
    if department:
        query = query.filter(models.Employee.department.ilike(f"%{department}%"))
    
    if position:
        query = query.filter(models.Employee.position.ilike(f"%{position}%"))
    
    if status:
        query = query.filter(models.User.is_active == (status == "active"))
    
    employees = query.offset(skip).limit(limit).all()
    return employees

@router.get("/departments")
def get_departments(db: Session = Depends(database.get_db)):
    """Get list of all departments"""
    departments = db.query(models.Employee.department).distinct().filter(
        models.Employee.department.isnot(None),
        models.Employee.department != ""
    ).all()
    return [dept[0] for dept in departments if dept[0]]

@router.get("/positions")
def get_positions(db: Session = Depends(database.get_db)):
    """Get list of all positions"""
    positions = db.query(models.Employee.position).distinct().filter(
        models.Employee.position.isnot(None),
        models.Employee.position != ""
    ).all()
    return [pos[0] for pos in positions if pos[0]]

@router.get("/", response_model=List[schemas.EmployeeOut])
def get_employees(skip: int = 0, limit: int = 100, db: Session = Depends(database.get_db)):
    employees = db.query(models.Employee).join(models.User).offset(skip).limit(limit).all()
    return employees

@router.get("/interviewers", response_model=List[schemas.EmployeeOut])
def get_interviewers(db: Session = Depends(database.get_db)):
    """Get employees who can conduct interviews (HR, managers, admins)"""
    interviewers = db.query(models.Employee).join(models.User).filter(
        models.User.role.in_(['hr', 'manager', 'admin'])
    ).all()
    return interviewers

@router.post("/", response_model=schemas.EmployeeOut)
def create_employee(employee: schemas.EmployeeCreate, db: Session = Depends(database.get_db)):
    db_employee = models.Employee(**employee.dict())
    db.add(db_employee)
    db.commit()
    db.refresh(db_employee)
    return db_employee

@router.post("/create-with-account")
def create_employee_with_account(
    employee_data: dict,
    db: Session = Depends(database.get_db)
):
    """
    Create employee and automatically create user account
    Expected data:
    {
        "first_name": "John",
        "last_name": "Doe",
        "email": "john.doe@dhanushhealthcare.com",
        "department": "Engineering",
        "position": "Senior Developer",
        "date_of_joining": "2025-01-15",
        "pan_number": "ABCDE1234F",
        "aadhaar_number": "1234 5678 9012",
        "password": "optional - will generate if not provided"
    }
    """
    from app.auth_utils import get_password_hash
    import secrets
    
    # Extract email and password
    email = employee_data.get("email")
    if not email:
        raise HTTPException(status_code=400, detail="Email is required")
    
    # Check if user already exists
    existing_user = db.query(models.User).filter(models.User.email == email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="User with this email already exists")
    
    # Generate password if not provided
    password = employee_data.get("password")
    if not password:
        password = secrets.token_urlsafe(12)  # Generate random password
    
    # Create user account - use the same hashing function as auth
    hashed_password = get_password_hash(password)
    new_user = models.User(
        email=email,
        hashed_password=hashed_password,
        role="employee",
        is_active=True
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    # Create employee profile
    employee_dict = {
        "user_id": new_user.id,
        "first_name": employee_data.get("first_name"),
        "last_name": employee_data.get("last_name"),
        "department": employee_data.get("department"),
        "position": employee_data.get("position"),
        "date_of_joining": employee_data.get("date_of_joining"),
        "pan_number": employee_data.get("pan_number"),
        "aadhaar_number": employee_data.get("aadhaar_number"),
        "profile_summary": employee_data.get("profile_summary"),
        "wfh_status": employee_data.get("wfh_status", "office")
    }
    
    new_employee = models.Employee(**employee_dict)
    db.add(new_employee)
    db.commit()
    db.refresh(new_employee)
    
    return {
        "message": "Employee and user account created successfully",
        "employee": new_employee,
        "user": {
            "id": new_user.id,
            "email": new_user.email,
            "role": new_user.role
        },
        "login_credentials": {
            "email": email,
            "password": password,
            "role": new_user.role,
            "note": "Please share these credentials securely with the employee"
        }
    }

@router.get("/{employee_id}", response_model=schemas.EmployeeOut)
def get_employee(employee_id: int, db: Session = Depends(database.get_db)):
    employee = db.query(models.Employee).filter(models.Employee.id == employee_id).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    return employee

@router.put("/{employee_id}", response_model=schemas.EmployeeOut)
def update_employee(employee_id: int, employee_update: schemas.EmployeeUpdate, db: Session = Depends(database.get_db)):
    db_employee = db.query(models.Employee).filter(models.Employee.id == employee_id).first()
    if not db_employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    update_data = employee_update.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_employee, key, value)
    
    db.commit()
    db.refresh(db_employee)
    return db_employee

@router.patch("/{employee_id}/status")
def update_employee_status(
    employee_id: int,
    status_data: dict,
    db: Session = Depends(database.get_db)
):
    """Update employee status (active/inactive)"""
    employee = db.query(models.Employee).filter(models.Employee.id == employee_id).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    # Update user status
    user = db.query(models.User).filter(models.User.id == employee.user_id).first()
    if user:
        new_status = status_data.get('status')
        if new_status in ['active', 'inactive']:
            user.is_active = (new_status == 'active')
            db.commit()
            return {"message": f"Employee status updated to {new_status}"}
    
    raise HTTPException(status_code=400, detail="Invalid status")

@router.get("/by-email/{email}")
def get_employee_by_email(email: str, db: Session = Depends(database.get_db)):
    """Get employee by email address"""
    employee = db.query(models.Employee).join(models.User).filter(
        models.User.email == email
    ).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    return employee

@router.get("/by-department/{department}")
def get_employees_by_department(
    department: str,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(database.get_db)
):
    """Get employees by department"""
    employees = db.query(models.Employee).filter(
        models.Employee.department.ilike(f"%{department}%")
    ).offset(skip).limit(limit).all()
    return employees

@router.delete("/{employee_id}")
def delete_employee(employee_id: int, db: Session = Depends(database.get_db)):
    db_employee = db.query(models.Employee).filter(models.Employee.id == employee_id).first()
    if not db_employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    db.delete(db_employee)
    db.commit()
    return {"message": "Employee deleted successfully"}

@router.post("/extract-info")
async def extract_info(file: UploadFile = File(...)):
    # Mock AI Extraction Logic
    # In a real app, this would use OCR (Tesseract/Google Vision)
    
    filename = file.filename.lower()
    
    # Simulate extraction based on filename or just random plausible data
    extracted_data = {
        "first_name": "ExtractedName",
        "last_name": "ExtractedSurname",
        "pan_number": "ABCDE1234F",
        "aadhaar_number": "1234 5678 9012",
        "summary": "Experienced professional with background in engineering."
    }
    
    if "offer" in filename:
        extracted_data["summary"] = "Offer letter detected. Candidate has been offered a Senior role."
    elif "pan" in filename:
        extracted_data["summary"] = "PAN Card detected. Identity verification pending."
    
    return extracted_data

@router.get("/{employee_id}/documents")
def get_employee_documents(employee_id: int, db: Session = Depends(database.get_db)):
    """Get all documents for an employee"""
    employee = db.query(models.Employee).filter(models.Employee.id == employee_id).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    documents = db.query(models.EmployeeDocument).filter(
        models.EmployeeDocument.employee_id == employee_id
    ).all()
    return documents

@router.delete("/{employee_id}/documents/{document_id}")
def delete_employee_document(
    employee_id: int,
    document_id: int,
    db: Session = Depends(database.get_db)
):
    """Delete an employee document"""
    document = db.query(models.EmployeeDocument).filter(
        models.EmployeeDocument.id == document_id,
        models.EmployeeDocument.employee_id == employee_id
    ).first()
    
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    
    # Delete file from filesystem
    if os.path.exists(document.document_url):
        os.remove(document.document_url)
    
    db.delete(document)
    db.commit()
    return {"message": "Document deleted successfully"}

@router.patch("/{employee_id}/documents/{document_id}/verify")
def verify_employee_document(
    employee_id: int,
    document_id: int,
    verification_data: dict,
    db: Session = Depends(database.get_db)
):
    """Verify/approve an employee document"""
    document = db.query(models.EmployeeDocument).filter(
        models.EmployeeDocument.id == document_id,
        models.EmployeeDocument.employee_id == employee_id
    ).first()
    
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    
    document.is_verified = verification_data.get('is_verified', False)
    document.rejection_reason = verification_data.get('rejection_reason')
    document.verified_at = datetime.utcnow() if document.is_verified else None
    
    db.commit()
    return {"message": "Document verification updated"}

@router.post("/{employee_id}/upload-document")
async def upload_document(employee_id: int, file: UploadFile = File(...), doc_type: str = "General", db: Session = Depends(database.get_db)):
    file_location = f"{UPLOAD_DIR}/{file.filename}"
    with open(file_location, "wb+") as file_object:
        shutil.copyfileobj(file.file, file_object)
        
    db_document = models.EmployeeDocument(
        employee_id=employee_id,
        document_type=doc_type,
        document_url=file_location
    )
    db.add(db_document)
    db.commit()
    db.refresh(db_document)
    return db_document


@router.get("/stats/overview")
def get_employee_stats(db: Session = Depends(database.get_db)):
    """Get employee statistics overview"""
    from sqlalchemy import func
    
    total_employees = db.query(models.Employee).count()
    active_employees = db.query(models.Employee).join(models.User).filter(
        models.User.is_active == True
    ).count()
    
    # Department breakdown
    dept_stats = db.query(
        models.Employee.department,
        func.count(models.Employee.id).label('count')
    ).filter(
        models.Employee.department.isnot(None),
        models.Employee.department != ""
    ).group_by(models.Employee.department).all()
    
    # Recent joiners (last 30 days)
    from datetime import datetime, timedelta
    thirty_days_ago = datetime.utcnow() - timedelta(days=30)
    recent_joiners = db.query(models.Employee).filter(
        models.Employee.date_of_joining >= thirty_days_ago
    ).count()
    
    return {
        "total_employees": total_employees,
        "active_employees": active_employees,
        "inactive_employees": total_employees - active_employees,
        "recent_joiners": recent_joiners,
        "department_breakdown": [
            {"department": dept, "count": count} for dept, count in dept_stats
        ]
    }

@router.get("/export/csv")
def export_employees_csv(db: Session = Depends(database.get_db)):
    """Export employees to CSV format"""
    import csv
    import io
    from fastapi.responses import StreamingResponse
    
    employees = db.query(models.Employee).join(models.User).all()
    
    output = io.StringIO()
    writer = csv.writer(output)
    
    # Write header
    writer.writerow([
        'ID', 'First Name', 'Last Name', 'Email', 'Department', 
        'Position', 'Date of Joining', 'Status', 'Phone'
    ])
    
    # Write data
    for emp in employees:
        writer.writerow([
            emp.id,
            emp.first_name or '',
            emp.last_name or '',
            emp.user.email if emp.user else '',
            emp.department or '',
            emp.position or '',
            emp.date_of_joining.strftime('%Y-%m-%d') if emp.date_of_joining else '',
            'Active' if emp.user and emp.user.is_active else 'Inactive',
            emp.phone or ''
        ])
    
    output.seek(0)
    
    return StreamingResponse(
        io.BytesIO(output.getvalue().encode('utf-8')),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=employees.csv"}
    )

# Profile management endpoints
from app.dependencies import get_current_user

@router.put("/me/profile")
def update_my_profile(
    profile_data: dict,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Update current user's employee profile"""
    
    # Get employee record for current user
    employee = db.query(models.Employee).filter(
        models.Employee.user_id == current_user.id
    ).first()
    
    if not employee:
        # Create employee record if it doesn't exist
        employee = models.Employee(
            user_id=current_user.id,
            first_name=profile_data.get('first_name', ''),
            last_name=profile_data.get('last_name', ''),
            phone=profile_data.get('phone', ''),
            department=profile_data.get('department', ''),
            position=profile_data.get('position', '')
        )
        db.add(employee)
    else:
        # Update existing employee record
        if 'first_name' in profile_data:
            employee.first_name = profile_data['first_name']
        if 'last_name' in profile_data:
            employee.last_name = profile_data['last_name']
        if 'phone' in profile_data:
            employee.phone = profile_data['phone']
        if 'department' in profile_data:
            employee.department = profile_data['department']
        if 'position' in profile_data:
            employee.position = profile_data['position']
    
    db.commit()
    db.refresh(employee)
    
    return {
        "message": "Profile updated successfully",
        "employee": employee
    }
    