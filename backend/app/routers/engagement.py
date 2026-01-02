from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from typing import List
from app import database, models, schemas
from app.dependencies import get_current_user
from datetime import datetime
import shutil
import os

router = APIRouter(
    prefix="/engagement",
    tags=["engagement"]
)

@router.get("/surveys", response_model=List[schemas.SurveyOut])
def get_surveys(db: Session = Depends(database.get_db)):
    return db.query(models.Survey).all()

@router.post("/surveys", response_model=schemas.SurveyOut)
def create_survey(survey: schemas.SurveyCreate, db: Session = Depends(database.get_db)):
    db_survey = models.Survey(**survey.dict())
    db.add(db_survey)
    db.commit()
    db.refresh(db_survey)
    return db_survey

@router.post("/surveys/{survey_id}/respond/{employee_id}", response_model=schemas.SurveyResponseOut)
def respond_to_survey(
    survey_id: int, 
    employee_id: int, 
    response: schemas.SurveyResponseCreate, 
    db: Session = Depends(database.get_db)
):
    db_survey = db.query(models.Survey).filter(models.Survey.id == survey_id).first()
    if not db_survey:
        raise HTTPException(status_code=404, detail="Survey not found")
        
    db_response = models.SurveyResponse(
        **response.dict(),
        survey_id=survey_id,
        employee_id=employee_id
    )
    db.add(db_response)
    db.commit()
    db.refresh(db_response)
    return db_response
import random

@router.post("/analyze-advanced-sentiment")
def analyze_advanced_sentiment(data: schemas.EngagementAnalysisRequest):
    # Mock Advanced NLP
    text_lower = data.text.lower()
    
    positive_words = ["good", "great", "excellent", "happy", "love", "amazing", "satisfied", "enjoy", "wonderful"]
    negative_words = ["bad", "poor", "hate", "terrible", "awful", "disappointed", "frustrated", "stressed", "overwhelmed"]
    stress_words = ["stress", "pressure", "overwhelm", "burnout", "exhausted", "tired"]
    
    pos_count = sum(1 for w in positive_words if w in text_lower)
    neg_count = sum(1 for w in negative_words if w in text_lower)
    stress_count = sum(1 for w in stress_words if w in text_lower)
    
    # Determine Sentiment & Metrics
    if pos_count > neg_count + 1:
        sentiment = "Very Positive"
        engagement = 9
        satisfaction = 9
        morale = 8.5
        stress = 3
    elif pos_count > neg_count:
        sentiment = "Positive"
        engagement = 7.5
        satisfaction = 7.5
        morale = 7
        stress = 4
    elif neg_count > pos_count + 1:
        sentiment = "Very Negative"
        engagement = 3
        satisfaction = 3
        morale = 3.5
        stress = 8
    elif neg_count > pos_count:
        sentiment = "Negative"
        engagement = 4.5
        satisfaction = 4.5
        morale = 5
        stress = 7
    else:
        sentiment = "Neutral"
        engagement = 6
        satisfaction = 6
        morale = 6
        stress = 5
        
    # Adjust stress based on specific keywords
    if stress_count > 0:
        stress = min(stress + (stress_count * 1.5), 10)
        
    # Topics
    topics = []
    if "work" in text_lower or "environment" in text_lower: topics.append({"name": "Work Environment", "sentiment": sentiment})
    if "team" in text_lower: topics.append({"name": "Team Collaboration", "sentiment": sentiment})
    if "balance" in text_lower: topics.append({"name": "Work-Life Balance", "sentiment": sentiment})
    if "manage" in text_lower: topics.append({"name": "Management", "sentiment": sentiment})
    
    return {
        "sentiment": sentiment,
        "confidence": round(random.uniform(78.0, 92.0), 1),
        "metrics": {
            "engagement": engagement,
            "satisfaction": satisfaction,
            "morale": morale,
            "stress": round(stress, 1)
        },
        "topics": topics
    }

@router.post("/predict-attrition")
def predict_attrition(data: schemas.AttritionPredictionRequest):
    # Mock ML Prediction
    risk_score = 0
    factors = []
    
    if data.no_promotion_years >= 3:
        risk_score += 25
        factors.append("No promotion in 3+ years")
    if data.below_market_salary:
        risk_score += 20
        factors.append("Below market salary")
    if data.engagement_score < 5:
        risk_score += 15
        factors.append("Low engagement score")
    if data.job_search_activity:
        risk_score += 30
        factors.append("Increased job search activity")
    if data.workload_hours > 50:
        risk_score += 10
        factors.append("High workload")
        
    risk_score = min(risk_score, 100)
    
    risk_level = "Low"
    if risk_score >= 70: risk_level = "High"
    elif risk_score >= 40: risk_level = "Medium"
    
    actions = []
    if risk_level == "High":
        actions = ["Schedule immediate retention conversation", "Review compensation", "Discuss career path"]
    elif risk_level == "Medium":
        actions = ["Conduct stay interview", "Check workload balance"]
        
    return {
        "risk_score": risk_score,
        "risk_level": risk_level,
        "factors": factors,
        "actions": actions
    }

# ============================================
# NEW ENGAGEMENT FEATURES
# ============================================

@router.post("/pulse-survey")
async def submit_pulse_survey(
    data: schemas.PulseSurveyCreate,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Submit daily pulse survey"""
    try:
        # Store pulse survey data
        # In production, create a PulseSurvey model
        return {
            "message": "Pulse survey submitted successfully",
            "mood": data.mood,
            "timestamp": datetime.utcnow().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/recognition")
async def send_recognition(
    data: schemas.RecognitionCreate,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Send recognition to a colleague"""
    try:
        # Store recognition data
        # In production, create a Recognition model and send notification
        return {
            "message": "Recognition sent successfully",
            "recipient_id": data.recipient_id,
            "badge": data.badge,
            "timestamp": datetime.utcnow().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/feedback")
async def submit_feedback(
    data: schemas.FeedbackCreate,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Submit anonymous feedback"""
    try:
        # Store feedback data
        # In production, create a Feedback model
        return {
            "message": "Feedback submitted successfully",
            "category": data.category,
            "anonymous": data.anonymous,
            "timestamp": datetime.utcnow().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/wellness-checkin")
async def submit_wellness_checkin(
    data: schemas.WellnessCheckinCreate,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Submit wellness check-in"""
    try:
        # Store wellness data
        # In production, create a WellnessCheckin model
        return {
            "message": "Wellness check-in recorded successfully",
            "score": data.score,
            "timestamp": datetime.utcnow().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/engagement-metrics")
async def get_engagement_metrics(
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Get overall engagement metrics"""
    try:
        # Calculate engagement metrics
        # In production, aggregate from various sources
        return {
            "overall_engagement": 78,
            "happiness_score": 8.2,
            "recognition_count": 124,
            "attrition_risk": "Low",
            "pulse_participation": 85,
            "wellness_average": 7.5
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ============================================
# PHOTO GALLERY & GAMES
# ============================================

@router.post("/gallery/upload")
async def upload_gallery_photo(
    photo: UploadFile = File(...),
    album_id: int = None,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Upload photo to gallery album - Admin/HR/Manager only"""
    # Check if user has permission to upload
    if current_user.role not in ['admin', 'hr', 'manager']:
        raise HTTPException(
            status_code=403, 
            detail="Only Admin, HR, and Managers can upload photos to gallery"
        )
    
    try:
        # Save photo file
        upload_dir = "backend/uploads/gallery"
        os.makedirs(upload_dir, exist_ok=True)
        
        file_path = os.path.join(upload_dir, f"{album_id}_{photo.filename}")
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(photo.file, buffer)
        
        return {
            "message": "Photo uploaded successfully",
            "file_path": file_path,
            "album_id": album_id,
            "uploaded_by": current_user.email
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/gallery/create-album")
async def create_gallery_album(
    title: str,
    description: str = None,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Create new photo album - Admin/HR/Manager only"""
    if current_user.role not in ['admin', 'hr', 'manager']:
        raise HTTPException(
            status_code=403, 
            detail="Only Admin, HR, and Managers can create albums"
        )
    
    try:
        # In production, save to database
        return {
            "message": "Album created successfully",
            "title": title,
            "description": description,
            "created_by": current_user.email,
            "created_at": datetime.utcnow().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/gallery/albums")
async def get_gallery_albums(
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Get all photo albums"""
    try:
        # In production, fetch from database
        albums = [
            {"id": 1, "title": "Team Outing - Goa", "date": "2024-11-15", "photos": 24},
            {"id": 2, "title": "Diwali Celebration", "date": "2024-11-01", "photos": 18},
            {"id": 3, "title": "Annual Day 2024", "date": "2024-10-20", "photos": 45},
        ]
        return albums
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/games/score")
async def submit_game_score(
    game_type: str,
    score: int,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Submit game score"""
    try:
        # Store game score
        # In production, create a GameScore model
        return {
            "message": "Score submitted successfully",
            "game_type": game_type,
            "score": score,
            "user_id": current_user.id
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/games/leaderboard")
async def get_game_leaderboard(
    game_type: str = None,
    db: Session = Depends(database.get_db)
):
    """Get game leaderboard"""
    try:
        # In production, fetch from database
        leaderboard = [
            {"name": "Rahul S.", "score": 850, "rank": 1},
            {"name": "Priya M.", "score": 720, "rank": 2},
            {"name": "Amit K.", "score": 680, "rank": 3},
        ]
        return leaderboard
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/notifications")
async def get_notifications(
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Get user notifications"""
    try:
        # In production, fetch from database
        notifications = [
            {
                "id": 1,
                "type": "recognition",
                "message": "You received a recognition!",
                "time": "2 min ago",
                "unread": True
            }
        ]
        return notifications
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.patch("/notifications/{notification_id}/read")
async def mark_notification_read(
    notification_id: int,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Mark notification as read"""
    try:
        return {"message": "Notification marked as read"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
