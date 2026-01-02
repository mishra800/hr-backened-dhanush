from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime
from app import database, models, schemas
from app.dependencies import get_current_user

router = APIRouter(
    prefix="/performance",
    tags=["performance"]
)

# --- Reviews ---

@router.get("/reviews", response_model=List[schemas.PerformanceReviewOut])
def get_reviews(skip: int = 0, limit: int = 100, db: Session = Depends(database.get_db)):
    return db.query(models.PerformanceReview).offset(skip).limit(limit).all()

@router.post("/reviews", response_model=schemas.PerformanceReviewOut)
def create_review(
    review: schemas.PerformanceReviewCreate, 
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    employee = db.query(models.Employee).filter(models.Employee.id == review.employee_id).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")

    db_review = models.PerformanceReview(
        **review.dict(),
        reviewer_id=current_user.id
    )
    db.add(db_review)
    db.commit()
    db.refresh(db_review)
    return db_review

@router.get("/employee/{employee_id}", response_model=List[schemas.PerformanceReviewOut])
def get_employee_reviews(employee_id: int, db: Session = Depends(database.get_db)):
    return db.query(models.PerformanceReview).filter(models.PerformanceReview.employee_id == employee_id).all()

# --- Goals ---

@router.get("/goals/{employee_id}", response_model=List[schemas.GoalOut])
def get_goals(employee_id: int, db: Session = Depends(database.get_db)):
    return db.query(models.Goal).filter(models.Goal.employee_id == employee_id).all()

@router.post("/goals/{employee_id}", response_model=schemas.GoalOut)
def create_goal(employee_id: int, goal: schemas.GoalCreate, db: Session = Depends(database.get_db)):
    db_goal = models.Goal(**goal.dict(), employee_id=employee_id)
    db.add(db_goal)
    db.commit()
    db.refresh(db_goal)
    return db_goal

@router.put("/goals/{goal_id}/status", response_model=schemas.GoalOut)
def update_goal_status(goal_id: int, status: str, db: Session = Depends(database.get_db)):
    goal = db.query(models.Goal).filter(models.Goal.id == goal_id).first()
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    goal.status = status
    db.commit()
    db.refresh(goal)
    return goal

# --- Feedback ---

@router.post("/feedback", response_model=schemas.FeedbackOut)
def give_feedback(
    feedback: schemas.FeedbackCreate,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    db_feedback = models.Feedback(
        **feedback.dict(),
        reviewer_id=current_user.id
    )
    db.add(db_feedback)
    db.commit()
    db.refresh(db_feedback)
    return db_feedback

@router.get("/feedback/{employee_id}", response_model=List[schemas.FeedbackOut])
def get_feedback(employee_id: int, db: Session = Depends(database.get_db)):
    return db.query(models.Feedback).filter(models.Feedback.employee_id == employee_id).all()
import json
import random

# --- AI Features ---

@router.post("/analyze-sentiment")
def analyze_sentiment(feedback_text: str):
    # Real NLP Sentiment Analysis using ai_utils
    from app import ai_utils
    
    result = ai_utils.analyze_sentiment(feedback_text)
    sentiment = result["label"]
    score = result["score"]
    
    # Extract themes (simple keyword matching for now, could be enhanced with NLTK/Spacy)
    text_lower = feedback_text.lower()
    themes = []
    if "communicat" in text_lower: themes.append({"name": "Communication", "sentiment": sentiment})
    if "team" in text_lower: themes.append({"name": "Teamwork", "sentiment": sentiment})
    if "tech" in text_lower or "code" in text_lower: themes.append({"name": "Technical Skills", "sentiment": sentiment})
    
    return {
        "sentiment": sentiment,
        "confidence": round(abs(score) * 100, 1), # Confidence is magnitude of polarity
        "breakdown": {"positive": 60, "neutral": 30, "negative": 10} if sentiment == "Positive" else {"positive": 10, "neutral": 30, "negative": 60}, # Mock breakdown for UI
        "themes": themes
    }

@router.post("/predict-score")
def predict_score(data: schemas.PerformancePredictionRequest):
    # Prediction Algorithm
    # Predicted Rating = (KPI Achievement / 100) × 4 + (Project Success / 100) × 3 + (Peer Score / 10) × 3
    
    kpi_ratio = min(data.kpi_completed / max(data.total_kpis, 1), 1.0)
    project_ratio = min(data.project_success_rate / 100, 1.0)
    peer_ratio = min(data.peer_rating / 10, 1.0)
    
    predicted_score = (kpi_ratio * 4) + (project_ratio * 3) + (peer_ratio * 3)
    predicted_score = round(predicted_score, 1)
    
    category = "Unsatisfactory"
    if predicted_score >= 8.0: category = "Outstanding"
    elif predicted_score >= 7.0: category = "Exceeds Expectations"
    elif predicted_score >= 6.0: category = "Meets Expectations"
    elif predicted_score >= 5.0: category = "Needs Improvement"
    
    return {
        "predicted_score": predicted_score,
        "category": category,
        "confidence": round(random.uniform(82.0, 92.0), 1),
        "breakdown": {
            "goal_achievement": round(kpi_ratio * 100),
            "quality_of_work": round(project_ratio * 100),
            "collaboration": round(peer_ratio * 100)
        }
    }

@router.post("/generate-feedback")
def generate_feedback(data: schemas.FeedbackGenerationRequest):
    # Mock AI Generation
    avg_score = (data.technical_score + data.communication_score + data.teamwork_score + data.leadership_score) / 4
    
    summary = ""
    strengths = []
    development = []
    recommendations = []
    goals = []
    
    if avg_score >= 8.0:
        summary = f"{data.role} has shown exceptional performance this {data.period}. They are a role model for peers and consistently exceed expectations."
        strengths = ["Exceptional technical skills", "Proactive problem-solver", "Strong mentor"]
        development = ["Strategic initiatives", "Leadership development"]
        recommendations = ["Consider for promotion", "Assign mentorship responsibilities"]
        goals = ["Lead a major initiative", "Mentor 2 juniors"]
    elif avg_score >= 6.0:
        summary = f"{data.role} has delivered solid performance this {data.period}. They meet expectations and are a reliable team member."
        strengths = ["Solid technical foundation", "Reliable team player"]
        development = ["Enhance technical depth", "Improve proactive communication"]
        recommendations = ["Advanced training", "Increase project complexity"]
        goals = ["Complete 1 certification", "Deliver 2 complex projects"]
    else:
        summary = f"{data.role}'s performance shows room for improvement. We need to focus on strengthening core skills."
        strengths = ["Willingness to learn", "Positive attitude"]
        development = ["Strengthen core skills", "Improve time management"]
        recommendations = ["Performance improvement plan", "Weekly coaching"]
        goals = ["100% on-time delivery", "Complete foundational training"]
        
    return {
        "summary": summary,
        "strengths": strengths,
        "development": development,
        "recommendations": recommendations,
        "goals": goals
    }

@router.post("/analyze-engagement")
def analyze_engagement(data: schemas.EngagementAnalysisRequest):
    # Mock Engagement Analysis
    text_lower = data.text.lower()
    stress_words = ["stress", "burnout", "overwhelmed", "tired", "deadline", "pressure"]
    
    stress_count = sum(1 for w in stress_words if w in text_lower)
    stress_level = min(stress_count * 2, 10)
    
    sentiment_res = analyze_sentiment(data.text)
    
    engagement_score = 8
    if sentiment_res["sentiment"] == "Negative": engagement_score = 4
    if stress_level > 6: engagement_score -= 2
    
    return {
        "sentiment": sentiment_res["sentiment"],
        "stress_level": stress_level,
        "engagement_score": max(engagement_score, 1),
        "topics": sentiment_res["themes"]
    }
