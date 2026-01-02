from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List
from app import database, models, schemas

router = APIRouter(
    prefix="/career",
    tags=["career"]
)

@router.get("/jobs", response_model=List[schemas.JobOut])
def get_public_jobs(skip: int = 0, limit: int = 100, db: Session = Depends(database.get_db)):
    # In a real app, we might filter by is_active=True specifically for public view
    jobs = db.query(models.Job).filter(models.Job.is_active == True).offset(skip).limit(limit).all()
    return jobs

@router.get("/path-recommendation/{employee_id}")
def get_career_path(employee_id: int, db: Session = Depends(database.get_db)):
    # Mock AI Career Path Recommendation
    # In reality, this would look at the employee's skills, tenure, and performance reviews
    
    # Fetch basic employee info (mocking logic if not found)
    employee = db.query(models.Employee).filter(models.Employee.id == employee_id).first()
    current_role = employee.position if employee else "Software Engineer"
    
    recommendations = []
    
    if "Engineer" in current_role or "Developer" in current_role:
        recommendations = [
            {
                "target_role": "Senior Software Engineer",
                "timeframe": "6-12 Months",
                "match_score": 85,
                "skill_gaps": ["System Design", "Cloud Architecture (AWS)"],
                "learning_path": ["Advanced System Design Course", "AWS Certified Solutions Architect"]
            },
            {
                "target_role": "Team Lead",
                "timeframe": "12-18 Months",
                "match_score": 70,
                "skill_gaps": ["Leadership", "Project Management", "Mentoring"],
                "learning_path": ["Leadership 101", "Agile Project Management"]
            }
        ]
    elif "Manager" in current_role:
        recommendations = [
            {
                "target_role": "Senior Engineering Manager",
                "timeframe": "18-24 Months",
                "match_score": 75,
                "skill_gaps": ["Strategic Planning", "Budgeting"],
                "learning_path": ["Executive Leadership Program", "Finance for Non-Finance Managers"]
            }
        ]
    else:
        # Default generic path
        recommendations = [
            {
                "target_role": f"Senior {current_role}",
                "timeframe": "12 Months",
                "match_score": 80,
                "skill_gaps": ["Advanced Domain Knowledge"],
                "learning_path": ["Advanced Certification"]
            }
        ]
        
    return {
        "current_role": current_role,
        "recommendations": recommendations
    }
