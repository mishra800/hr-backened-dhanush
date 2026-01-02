from textblob import TextBlob
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np

def analyze_sentiment(text: str):
    """
    Analyzes the sentiment of a given text.
    Returns a dictionary with score (-1.0 to 1.0) and label.
    """
    if not text:
        return {"score": 0.0, "label": "Neutral"}
    
    analysis = TextBlob(text)
    score = analysis.sentiment.polarity
    
    if score > 0.1:
        label = "Positive"
    elif score < -0.1:
        label = "Negative"
    else:
        label = "Neutral"
        
    return {"score": score, "label": label}

def predict_attrition_risk(employee_data: dict):
    """
    Predicts attrition risk based on employee data.
    This is a heuristic rule-based model simulating an ML classifier.
    
    Expected keys in employee_data:
    - tenure_years (float)
    - last_rating (float)
    - salary_hike_percent (float)
    - engagement_score (float, 0-10)
    - overtime_hours (float)
    """
    risk_score = 0
    
    # Factor 1: Performance vs Satisfaction (Low rating usually means unhappy or bad fit)
    if employee_data.get("last_rating", 5) < 3.0:
        risk_score += 3
        
    # Factor 2: Engagement
    if employee_data.get("engagement_score", 10) < 5:
        risk_score += 3
        
    # Factor 3: Tenure & Growth
    # High tenure with low recent hike is a risk
    if employee_data.get("tenure_years", 0) > 2 and employee_data.get("salary_hike_percent", 0) < 5:
        risk_score += 2
        
    # Factor 4: Overwork
    if employee_data.get("overtime_hours", 0) > 10: # hours per week avg
        risk_score += 2
        
    # Classification
    if risk_score >= 6:
        return "High"
    elif risk_score >= 3:
        return "Medium"
    else:
        return "Low"

def calculate_text_similarity(text1: str, text2: str):
    """
    Calculates cosine similarity between two texts (e.g., Job Desc vs Resume/Interview).
    Returns a score between 0 and 100.
    """
    if not text1 or not text2:
        return 0.0
        
    documents = [text1, text2]
    tfidf = TfidfVectorizer(stop_words='english')
    try:
        tfidf_matrix = tfidf.fit_transform(documents)
        similarity = cosine_similarity(tfidf_matrix[0:1], tfidf_matrix[1:2])[0][0]
        # Convert numpy float to Python float
        return float(round(similarity * 100, 2))
    except ValueError:
        return 0.0
