from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime
from app import database, models, schemas
from app.dependencies import get_current_user

router = APIRouter(
    prefix="/leave",
    tags=["leave"]
)

# --- Balances ---

@router.get("/balances/{employee_id}", response_model=List[schemas.LeaveBalanceOut])
def get_leave_balances(employee_id: int, db: Session = Depends(database.get_db)):
    balances = db.query(models.LeaveBalance).filter(models.LeaveBalance.employee_id == employee_id).all()
    if not balances:
        # Seed balances
        seed_data = [
            {"leave_type": "Sick Leave", "balance": 10},
            {"leave_type": "Casual Leave", "balance": 12},
            {"leave_type": "Earned Leave", "balance": 15}
        ]
        for data in seed_data:
            b = models.LeaveBalance(employee_id=employee_id, **data)
            db.add(b)
        db.commit()
        balances = db.query(models.LeaveBalance).filter(models.LeaveBalance.employee_id == employee_id).all()
    return balances

# --- Holidays ---

@router.get("/holidays", response_model=List[schemas.HolidayOut])
def get_holidays(db: Session = Depends(database.get_db)):
    holidays = db.query(models.Holiday).all()
    if not holidays:
        # Seed holidays
        seed_data = [
            {"date": datetime(2023, 12, 25), "name": "Christmas", "type": "Public"},
            {"date": datetime(2024, 1, 1), "name": "New Year", "type": "Public"},
            {"date": datetime(2024, 1, 26), "name": "Republic Day", "type": "Public"}
        ]
        for data in seed_data:
            h = models.Holiday(**data)
            db.add(h)
        db.commit()
        holidays = db.query(models.Holiday).all()
    return holidays

# --- Requests ---

@router.post("/request/{employee_id}", response_model=schemas.LeaveRequestOut)
def request_leave(employee_id: int, leave: schemas.LeaveRequestCreate, db: Session = Depends(database.get_db)):
    # All leave requests go to pending status for manager approval
    # Auto-approval logic disabled - requires manual approval
    
    status = "pending"
    duration = (leave.end_date - leave.start_date).days + 1
    
    # Optional: Enable auto-approval for very short leaves (1 day or less)
    # Uncomment below to auto-approve single-day leaves
    # if duration <= 1:
    #     status = "approved"
    
    db_leave = models.LeaveRequest(
        **leave.dict(), 
        employee_id=employee_id,
        status=status
    )
    db.add(db_leave)
    db.commit()
    db.refresh(db_leave)
    
    # Only deduct balance after manual approval
    # Balance deduction happens in approve endpoint
            
    return db_leave

@router.get("/employee/{employee_id}", response_model=List[schemas.LeaveRequestOut])
def get_employee_leaves(employee_id: int, db: Session = Depends(database.get_db)):
    return db.query(models.LeaveRequest).filter(models.LeaveRequest.employee_id == employee_id).all()

@router.get("/all", response_model=List[schemas.LeaveRequestOut])
def get_all_leaves(db: Session = Depends(database.get_db)):
    return db.query(models.LeaveRequest).all()

@router.get("/pending", response_model=List[schemas.LeaveRequestWithEmployee])
def get_pending_leaves(
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Get all pending leave requests for managers/HR"""
    if current_user.role not in ['admin', 'hr', 'manager']:
        raise HTTPException(status_code=403, detail="Not authorized to view pending leaves")
    
    return db.query(models.LeaveRequest).filter(
        models.LeaveRequest.status == "pending"
    ).order_by(models.LeaveRequest.created_at.desc()).all()

@router.put("/approve/{leave_id}", response_model=schemas.LeaveRequestOut)
def approve_leave(leave_id: int, db: Session = Depends(database.get_db)):
    leave = db.query(models.LeaveRequest).filter(models.LeaveRequest.id == leave_id).first()
    if not leave:
        raise HTTPException(status_code=404, detail="Leave request not found")
    
    leave.status = "approved"
    
    # Deduct balance when approved
    duration = (leave.end_date - leave.start_date).days + 1
    balance = db.query(models.LeaveBalance).filter(
        models.LeaveBalance.employee_id == leave.employee_id
    ).first()
    
    if balance and balance.balance >= duration:
        balance.balance -= duration
    
    db.commit()
    db.refresh(leave)
    return leave

@router.put("/reject/{leave_id}", response_model=schemas.LeaveRequestOut)
def reject_leave(leave_id: int, db: Session = Depends(database.get_db)):
    leave = db.query(models.LeaveRequest).filter(models.LeaveRequest.id == leave_id).first()
    if not leave:
        raise HTTPException(status_code=404, detail="Leave request not found")
    leave.status = "rejected"
    db.commit()
    db.refresh(leave)
    return leave
