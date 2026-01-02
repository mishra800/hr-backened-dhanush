from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app import database, models, ai_utils
from datetime import datetime, timedelta

router = APIRouter(
    prefix="/analysis",
    tags=["analysis"]
)

@router.get("/insights")
def get_insights(db: Session = Depends(database.get_db)):
    # 1. Top Performers (Real Data)
    top_reviews = db.query(models.PerformanceReview).filter(models.PerformanceReview.rating >= 4.5).limit(5).all()
    top_performers = []
    for review in top_reviews:
        if review.employee:
            top_performers.append(f"{review.employee.first_name} {review.employee.last_name}")
    
    if not top_performers:
        top_performers = ["No data available"]

    # 2. Employee Sentiment (AI Analysis of Reviews & Feedback)
    reviews = db.query(models.PerformanceReview).all()
    feedbacks = db.query(models.Feedback).all()
    
    total_sentiment = 0
    count = 0
    
    # Analyze reviews
    for review in reviews:
        if review.comments:
            sentiment = ai_utils.analyze_sentiment(review.comments)
            total_sentiment += sentiment["score"]
            count += 1
            
    # Analyze feedbacks
    for feedback in feedbacks:
        if feedback.content:
            sentiment = ai_utils.analyze_sentiment(feedback.content)
            total_sentiment += sentiment["score"]
            count += 1
            
    avg_sentiment_score = total_sentiment / count if count > 0 else 0
    
    if avg_sentiment_score > 0.3:
        sentiment_label = "Positive"
    elif avg_sentiment_score < -0.1:
        sentiment_label = "Negative"
    else:
        sentiment_label = "Neutral"

    # 3. Attrition Risk (AI Prediction)
    employees = db.query(models.Employee).all()
    high_risk_count = 0
    total_employees = len(employees)
    
    for emp in employees:
        # Gather data for prediction
        # Get latest review
        latest_review = db.query(models.PerformanceReview).filter(models.PerformanceReview.employee_id == emp.id).order_by(models.PerformanceReview.review_date.desc()).first()
        last_rating = latest_review.rating if latest_review else 3.0 # Default neutral
        
        # Calculate tenure
        tenure_days = (datetime.utcnow() - emp.date_of_joining).days if emp.date_of_joining else 0
        tenure_years = tenure_days / 365.0
        
        # Mocking some missing data points for the heuristic
        emp_data = {
            "tenure_years": tenure_years,
            "last_rating": last_rating,
            "salary_hike_percent": 0, # Placeholder
            "engagement_score": 7, # Placeholder
            "overtime_hours": 5 # Placeholder
        }
        
        risk = ai_utils.predict_attrition_risk(emp_data)
        if risk == "High":
            high_risk_count += 1
            
    attrition_risk_label = "Low"
    if total_employees > 0:
        risk_ratio = high_risk_count / total_employees
        if risk_ratio > 0.3:
            attrition_risk_label = "High"
        elif risk_ratio > 0.1:
            attrition_risk_label = "Medium"

    # 4. Hiring Velocity (Simple Metric)
    # Count applications in last 30 days
    thirty_days_ago = datetime.utcnow() - timedelta(days=30)
    recent_apps = db.query(models.Application).filter(models.Application.applied_date >= thirty_days_ago).count()
    
    hiring_velocity = "Low"
    if recent_apps > 20:
        hiring_velocity = "High"
    elif recent_apps > 5:
        hiring_velocity = "Medium"

    return {
        "attrition_risk": attrition_risk_label,
        "hiring_velocity": hiring_velocity,
        "employee_sentiment": sentiment_label,
        "top_performers": list(set(top_performers)),
        "skill_gaps": ["Python", "Cloud Architecture", "AI/ML", "Leadership"] # Mock for now as skill data is complex
    }


@router.get("/workforce-planning")
def get_workforce_planning(db: Session = Depends(database.get_db)):
    # Mock AI Prediction for Workforce Planning
    # In a real system, this would analyze project pipelines, historical hiring, and attrition trends
    
    return {
        "skill_shortages": [
            {"skill": "React Native", "shortage_count": 5, "urgency": "High"},
            {"skill": "DevOps (AWS)", "shortage_count": 3, "urgency": "Medium"},
            {"skill": "Data Engineering", "shortage_count": 2, "urgency": "Medium"}
        ],
        "future_hiring_needs": [
            {"role": "Senior Frontend Engineer", "count": 8, "quarter": "Q3 2025"},
            {"role": "Product Manager", "count": 2, "quarter": "Q4 2025"},
            {"role": "QA Automation Engineer", "count": 4, "quarter": "Q3 2025"}
        ],
        "bench_surplus": [
            {"role": "Junior Java Developer", "count": 12, "risk": "High Bench Time"},
            {"role": "Manual Tester", "count": 5, "risk": "Medium Bench Time"}
        ],
        "market_trends": {
            "hottest_skill": "Generative AI",
            "avg_time_to_hire": "18 Days",
            "salary_inflation": "12% YoY"
        }
    }
