from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app import database, models, schemas
from app.dependencies import get_current_user
from datetime import datetime
import random

router = APIRouter(
    prefix="/learning",
    tags=["learning"]
)

# --- Courses ---

@router.get("/courses", response_model=List[schemas.CourseOut])
def get_courses(db: Session = Depends(database.get_db)):
    return db.query(models.Course).all()

@router.post("/courses", response_model=schemas.CourseOut)
def create_course(course: schemas.CourseCreate, db: Session = Depends(database.get_db)):
    db_course = models.Course(**course.dict())
    db.add(db_course)
    db.commit()
    db.refresh(db_course)
    return db_course

# --- Enrollments ---

@router.get("/enrollments/{employee_id}", response_model=List[schemas.EnrollmentOut])
def get_employee_enrollments(employee_id: int, db: Session = Depends(database.get_db)):
    return db.query(models.Enrollment).filter(models.Enrollment.employee_id == employee_id).all()

@router.post("/enroll/{employee_id}/{course_id}", response_model=schemas.EnrollmentOut)
def enroll_course(employee_id: int, course_id: int, db: Session = Depends(database.get_db)):
    existing = db.query(models.Enrollment).filter(
        models.Enrollment.employee_id == employee_id,
        models.Enrollment.course_id == course_id
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Already enrolled")

    db_enrollment = models.Enrollment(employee_id=employee_id, course_id=course_id)
    db.add(db_enrollment)
    db.commit()
    db.refresh(db_enrollment)
    return db_enrollment

@router.put("/progress/{enrollment_id}", response_model=schemas.EnrollmentOut)
def update_progress(enrollment_id: int, progress: int, db: Session = Depends(database.get_db)):
    enrollment = db.query(models.Enrollment).filter(models.Enrollment.id == enrollment_id).first()
    if not enrollment:
        raise HTTPException(status_code=404, detail="Enrollment not found")
    
    enrollment.progress = progress
    db.commit()
    db.refresh(enrollment)
    return enrollment

# --- Skills ---

@router.get("/skills", response_model=List[schemas.SkillOut])
def get_skills(db: Session = Depends(database.get_db)):
    skills = db.query(models.Skill).all()
    if not skills:
        # Seed
        seed = ["Python", "React", "Leadership", "Communication", "Project Management"]
        for name in seed:
            db.add(models.Skill(name=name))
        db.commit()
        skills = db.query(models.Skill).all()
    return skills

@router.get("/employee-skills/{employee_id}", response_model=List[schemas.EmployeeSkillOut])
def get_employee_skills(employee_id: int, db: Session = Depends(database.get_db)):
    return db.query(models.EmployeeSkill).filter(models.EmployeeSkill.employee_id == employee_id).all()

@router.post("/add-skill/{employee_id}", response_model=schemas.EmployeeSkillOut)
def add_employee_skill(employee_id: int, skill_id: int, proficiency: int, db: Session = Depends(database.get_db)):
    # Check if exists
    existing = db.query(models.EmployeeSkill).filter(
        models.EmployeeSkill.employee_id == employee_id,
        models.EmployeeSkill.skill_id == skill_id
    ).first()
    
    if existing:
        existing.proficiency = proficiency
        db.commit()
        db.refresh(existing)
        return existing
        
    skill = models.EmployeeSkill(employee_id=employee_id, skill_id=skill_id, proficiency=proficiency)
    db.add(skill)
    db.commit()
    db.refresh(skill)
    return skill

@router.get("/recommendations/{employee_id}", response_model=List[schemas.CourseOut])
def recommend_courses(employee_id: int, db: Session = Depends(database.get_db)):
    # Mock AI Recommendation Logic
    # If employee has "Python" skill < 5, recommend "Advanced Python"
    # For now, just return random courses not enrolled in
    
    enrolled_ids = [e.course_id for e in db.query(models.Enrollment).filter(models.Enrollment.employee_id == employee_id).all()]
    all_courses = db.query(models.Course).all()
    
    recommended = [c for c in all_courses if c.id not in enrolled_ids]
    return recommended[:3]

@router.post("/analyze-skill-gaps")
def analyze_skill_gaps(data: schemas.SkillGapRequest):
    # Mock AI Skill Gap Analysis
    role = data.current_role
    if data.target_role: role = data.target_role
    
    skills = []
    if "Engineer" in role:
        skills = [
            {"name": "JavaScript/TypeScript", "current": 85, "required": 90, "priority": "Medium", "time": "1-2 months"},
            {"name": "System Design", "current": 65, "required": 85, "priority": "High", "time": "2-3 months"},
            {"name": "Cloud Architecture", "current": 55, "required": 80, "priority": "Critical", "time": "4-6 months"},
            {"name": "Microservices", "current": 70, "required": 85, "priority": "High", "time": "2-3 months"},
            {"name": "DevOps & CI/CD", "current": 60, "required": 75, "priority": "Medium", "time": "1-2 months"}
        ]
    elif "Data" in role:
        skills = [
            {"name": "Machine Learning", "current": 75, "required": 90, "priority": "Critical", "time": "3-4 months"},
            {"name": "Deep Learning", "current": 60, "required": 85, "priority": "High", "time": "4-5 months"},
            {"name": "Statistical Analysis", "current": 80, "required": 90, "priority": "Medium", "time": "1-2 months"},
            {"name": "Big Data", "current": 50, "required": 75, "priority": "High", "time": "3-4 months"},
            {"name": "MLOps", "current": 45, "required": 70, "priority": "Critical", "time": "4-6 months"}
        ]
    else:
        skills = [
            {"name": "Project Management", "current": 70, "required": 85, "priority": "High", "time": "2-3 months"},
            {"name": "Communication", "current": 80, "required": 90, "priority": "Low", "time": "1 month"},
            {"name": "Agile/Scrum", "current": 75, "required": 85, "priority": "Medium", "time": "1-2 months"}
        ]
        
    recommendations = [
        "Focus on critical priority skills first for maximum impact",
        "Enroll in recommended courses and certifications",
        "Seek mentorship from senior team members"
    ]
    
    return {
        "role": role,
        "skills": skills,
        "recommendations": recommendations
    }

@router.post("/personalized-training")
def get_personalized_training(data: schemas.TrainingRecommendationRequest):
    # Mock AI Recommendations
    goal = data.career_goal.lower()
    courses = []
    
    if "machine learning" in goal or "data" in goal:
        courses = [
            {"title": "Machine Learning Specialization", "provider": "Coursera", "relevance": 98, "duration": "3 months", "level": "Intermediate", "skills": ["Supervised Learning", "Neural Networks"], "cost": "$49/mo"},
            {"title": "Deep Learning Specialization", "provider": "DeepLearning.AI", "relevance": 95, "duration": "4 months", "level": "Advanced", "skills": ["CNNs", "RNNs", "TensorFlow"], "cost": "$49/mo"},
            {"title": "Data Science Professional Cert", "provider": "IBM", "relevance": 96, "duration": "4 months", "level": "Beginner", "skills": ["Python", "SQL", "Data Viz"], "cost": "$39/mo"}
        ]
    elif "cloud" in goal or "architect" in goal:
        courses = [
            {"title": "AWS Certified Solutions Architect", "provider": "AWS Training", "relevance": 97, "duration": "2 months", "level": "Intermediate", "skills": ["AWS Services", "Cloud Arch"], "cost": "$150"},
            {"title": "Google Cloud Professional Architect", "provider": "Google Cloud", "relevance": 94, "duration": "2.5 months", "level": "Advanced", "skills": ["GCP Services", "Kubernetes"], "cost": "$200"}
        ]
    else:
        courses = [
            {"title": "Leadership Principles", "provider": "Harvard Business School", "relevance": 90, "duration": "6 weeks", "level": "Intermediate", "skills": ["Management", "Strategy"], "cost": "$1600"},
            {"title": "PMP Certification Prep", "provider": "PMI", "relevance": 88, "duration": "3 months", "level": "Advanced", "skills": ["Project Management", "Agile"], "cost": "$400"}
        ]
        
    return {
        "goal": data.career_goal,
        "courses": courses,
        "tips": ["Dedicate 5-10 hours per week", "Apply concepts in projects", "Join study groups"]
    }

@router.post("/predict-learning-outcome")
def predict_learning_outcome(data: schemas.LearningOutcomeRequest):
    # Mock Predictive Analytics
    skill = data.target_skill
    
    if "Machine Learning" in skill:
        return {
            "skill": skill,
            "success_probability": 85,
            "completion_time": "6-8 months",
            "proficiency": "Advanced",
            "career_impact": "High",
            "roi_score": 9.0,
            "timeline": [
                {"month": 1, "level": "Beginner", "proficiency": 25},
                {"month": 3, "level": "Intermediate", "proficiency": 50},
                {"month": 6, "level": "Advanced", "proficiency": 75},
                {"month": 8, "level": "Expert", "proficiency": 90}
            ],
            "opportunities": ["Senior ML Engineer", "Lead ML Projects", "Research Scientist"],
            "challenges": ["Steep math learning curve", "Time investment"]
        }
    elif "Cloud" in skill:
        return {
            "skill": skill,
            "success_probability": 90,
            "completion_time": "4-6 months",
            "proficiency": "Advanced",
            "career_impact": "Very High",
            "roi_score": 9.5,
            "timeline": [
                {"month": 1, "level": "Beginner", "proficiency": 30},
                {"month": 3, "level": "Intermediate", "proficiency": 60},
                {"month": 5, "level": "Advanced", "proficiency": 85}
            ],
            "opportunities": ["Cloud Architect", "Migration Lead", "Consultant"],
            "challenges": ["Multiple platforms", "Certification costs"]
        }
    else:
        return {
            "skill": skill,
            "success_probability": 75,
            "completion_time": "3-5 months",
            "proficiency": "Intermediate",
            "career_impact": "Medium",
            "roi_score": 7.5,
            "timeline": [
                {"month": 1, "level": "Beginner", "proficiency": 20},
                {"month": 3, "level": "Intermediate", "proficiency": 50},
                {"month": 5, "level": "Advanced", "proficiency": 70}
            ],
            "opportunities": ["Senior Role", "Team Lead"],
            "challenges": ["Time management", "Consistency"]
        }


# ============================================
# YOUTUBE LEARNING HUB
# ============================================

@router.post("/youtube/upload")
async def upload_youtube_video(
    data: schemas.YouTubeVideoCreate,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Upload YouTube video - Admin/HR/Manager only"""
    if current_user.role not in ['admin', 'hr', 'manager']:
        raise HTTPException(status_code=403, detail="Only Admin, HR, and Managers can upload videos")
    
    try:
        # In production, save to database
        # For now, return success
        return {
            "message": "Video uploaded successfully",
            "video": {
                "id": random.randint(1, 1000),
                "url": data.url,
                "title": data.title,
                "description": data.description,
                "category": data.category,
                "difficulty": data.difficulty,
                "tags": data.tags,
                "target_roles": data.target_roles,
                "target_skills": data.target_skills,
                "uploaded_by": current_user.email,
                "created_at": datetime.utcnow().isoformat()
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/youtube/videos")
async def get_youtube_videos(
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Get YouTube videos for current user based on role and profile"""
    try:
        # Get user profile
        employee = db.query(models.Employee).filter(
            models.Employee.user_id == current_user.id
        ).first()
        
        user_role = employee.position if employee else "Employee"
        
        # Mock AI-recommended videos based on role
        all_videos = []
        
        # Data Analyst videos
        if "Data" in user_role or "Analyst" in user_role:
            all_videos = [
                {
                    "id": 1,
                    "url": "https://youtu.be/vmEHCJofslg",
                    "title": "Python Pandas Full Course",
                    "description": "Complete tutorial on Pandas for data analysis",
                    "category": "Data Science",
                    "difficulty": "Intermediate",
                    "tags": ["Python", "Pandas", "Data Analysis"],
                    "duration": "2h 30m",
                    "views": "1.2M",
                    "thumbnail": "https://img.youtube.com/vi/vmEHCJofslg/maxresdefault.jpg"
                },
                {
                    "id": 2,
                    "url": "https://youtu.be/HXV3zeQKqGY",
                    "title": "SQL Interview Preparation",
                    "description": "Master SQL for interviews and real-world scenarios",
                    "category": "Database",
                    "difficulty": "Intermediate",
                    "tags": ["SQL", "Database", "Interview"],
                    "duration": "3h 15m",
                    "views": "850K",
                    "thumbnail": "https://img.youtube.com/vi/HXV3zeQKqGY/maxresdefault.jpg"
                },
                {
                    "id": 3,
                    "url": "https://youtu.be/g0m5sEHPU-s",
                    "title": "Power BI Complete Tutorial",
                    "description": "Learn Power BI from scratch to advanced",
                    "category": "Business Intelligence",
                    "difficulty": "Beginner",
                    "tags": ["Power BI", "Visualization", "BI"],
                    "duration": "4h 00m",
                    "views": "2.1M",
                    "thumbnail": "https://img.youtube.com/vi/g0m5sEHPU-s/maxresdefault.jpg"
                }
            ]
        # Manager videos
        elif "Manager" in user_role or "Lead" in user_role:
            all_videos = [
                {
                    "id": 4,
                    "url": "https://youtu.be/VyKE7vz93yo",
                    "title": "Leadership Communication Skills",
                    "description": "Essential communication skills for leaders",
                    "category": "Leadership",
                    "difficulty": "Intermediate",
                    "tags": ["Leadership", "Communication", "Management"],
                    "duration": "1h 45m",
                    "views": "650K",
                    "thumbnail": "https://img.youtube.com/vi/VyKE7vz93yo/maxresdefault.jpg"
                },
                {
                    "id": 5,
                    "url": "https://youtu.be/502ILHjX9EE",
                    "title": "Agile Project Management",
                    "description": "Master Agile methodologies and Scrum",
                    "category": "Project Management",
                    "difficulty": "Intermediate",
                    "tags": ["Agile", "Scrum", "Project Management"],
                    "duration": "2h 20m",
                    "views": "920K",
                    "thumbnail": "https://img.youtube.com/vi/502ILHjX9EE/maxresdefault.jpg"
                },
                {
                    "id": 6,
                    "url": "https://youtu.be/T4u5r8H6Fok",
                    "title": "Decision-Making Frameworks",
                    "description": "Strategic decision-making for managers",
                    "category": "Management",
                    "difficulty": "Advanced",
                    "tags": ["Strategy", "Decision Making", "Leadership"],
                    "duration": "1h 30m",
                    "views": "480K",
                    "thumbnail": "https://img.youtube.com/vi/T4u5r8H6Fok/maxresdefault.jpg"
                }
            ]
        # Software Engineer videos
        else:
            all_videos = [
                {
                    "id": 7,
                    "url": "https://youtu.be/rv3QikDG1Uw",
                    "title": "Microservices Architecture",
                    "description": "Complete guide to microservices design patterns",
                    "category": "Software Architecture",
                    "difficulty": "Advanced",
                    "tags": ["Microservices", "Architecture", "Backend"],
                    "duration": "3h 45m",
                    "views": "1.5M",
                    "thumbnail": "https://img.youtube.com/vi/rv3QikDG1Uw/maxresdefault.jpg"
                },
                {
                    "id": 8,
                    "url": "https://youtu.be/RGOj5yH7evk",
                    "title": "Docker & Kubernetes Tutorial",
                    "description": "Master containerization and orchestration",
                    "category": "DevOps",
                    "difficulty": "Intermediate",
                    "tags": ["Docker", "Kubernetes", "DevOps"],
                    "duration": "4h 30m",
                    "views": "2.8M",
                    "thumbnail": "https://img.youtube.com/vi/RGOj5yH7evk/maxresdefault.jpg"
                },
                {
                    "id": 9,
                    "url": "https://youtu.be/8aGhZQkoFbQ",
                    "title": "React Complete Course",
                    "description": "Build modern web apps with React",
                    "category": "Frontend Development",
                    "difficulty": "Beginner",
                    "tags": ["React", "JavaScript", "Frontend"],
                    "duration": "5h 00m",
                    "views": "3.2M",
                    "thumbnail": "https://img.youtube.com/vi/8aGhZQkoFbQ/maxresdefault.jpg"
                }
            ]
        
        return {
            "videos": all_videos,
            "recommended_for": user_role,
            "total": len(all_videos)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/youtube/all")
async def get_all_youtube_videos(
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Get all YouTube videos - Admin/HR/Manager only"""
    if current_user.role not in ['admin', 'hr', 'manager']:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Return all videos for management
    return {
        "videos": [],
        "message": "All uploaded videos"
    }
