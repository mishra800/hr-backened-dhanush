from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app import database, models, schemas
from app.auth_utils import get_password_hash

from app.dependencies import get_current_user

router = APIRouter(
    prefix="/users",
    tags=["users"]
)

@router.get("/", response_model=List[schemas.UserOut])
def get_users(skip: int = 0, limit: int = 100, db: Session = Depends(database.get_db)):
    return db.query(models.User).offset(skip).limit(limit).all()

@router.post("/", response_model=schemas.UserOut)
def create_user(user: schemas.UserCreate, db: Session = Depends(database.get_db)):
    db_user = db.query(models.User).filter(models.User.email == user.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    hashed_password = get_password_hash(user.password)
    db_user = models.User(email=user.email, hashed_password=hashed_password, role=user.role)
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

@router.get("/me", response_model=schemas.UserOut)
def read_users_me(current_user: models.User = Depends(get_current_user)):
    return current_user

@router.get("/me/profile", response_model=schemas.EmployeeOut)
def get_my_profile(db: Session = Depends(database.get_db), current_user: models.User = Depends(get_current_user)):
    employee = db.query(models.Employee).filter(models.Employee.user_id == current_user.id).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee profile not found")
    return employee

@router.put("/me", response_model=schemas.UserOut)
def update_my_profile(
    profile_data: schemas.UserUpdate,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Update current user's profile"""
    # Update user fields if provided
    if profile_data.email:
        # Check if email is already taken by another user
        existing = db.query(models.User).filter(
            models.User.email == profile_data.email,
            models.User.id != current_user.id
        ).first()
        if existing:
            raise HTTPException(status_code=400, detail="Email already in use")
        current_user.email = profile_data.email
    
    # Update employee profile if exists
    employee = db.query(models.Employee).filter(
        models.Employee.user_id == current_user.id
    ).first()
    
    if employee:
        if profile_data.full_name:
            # Split full name into first and last
            name_parts = profile_data.full_name.strip().split(' ', 1)
            employee.first_name = name_parts[0]
            employee.last_name = name_parts[1] if len(name_parts) > 1 else ''
        
        if profile_data.phone:
            # Store phone in employee profile (add field if needed)
            # For now, we'll skip this as the model might not have it
            pass
        
        if profile_data.department:
            employee.department = profile_data.department
        
        if profile_data.position:
            employee.position = profile_data.position
    
    db.commit()
    db.refresh(current_user)
    return current_user
