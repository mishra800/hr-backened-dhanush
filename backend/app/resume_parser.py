import re
import os
from typing import Dict, List, Tuple
import PyPDF2
import docx
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np
from textblob import TextBlob

class ResumeParser:
    """AI-powered resume parser and scorer"""
    
    # Common skills database
    TECHNICAL_SKILLS = [
        'python', 'java', 'javascript', 'typescript', 'react', 'angular', 'vue',
        'node.js', 'express', 'django', 'flask', 'fastapi', 'spring', 'hibernate',
        'sql', 'mysql', 'postgresql', 'mongodb', 'redis', 'elasticsearch',
        'aws', 'azure', 'gcp', 'docker', 'kubernetes', 'jenkins', 'git',
        'html', 'css', 'sass', 'tailwind', 'bootstrap', 'webpack', 'vite',
        'rest api', 'graphql', 'microservices', 'agile', 'scrum', 'ci/cd',
        'machine learning', 'deep learning', 'tensorflow', 'pytorch', 'scikit-learn',
        'data analysis', 'pandas', 'numpy', 'matplotlib', 'tableau', 'power bi',
        'c++', 'c#', '.net', 'ruby', 'rails', 'php', 'laravel', 'go', 'rust',
        'android', 'ios', 'swift', 'kotlin', 'flutter', 'react native'
    ]
    
    SOFT_SKILLS = [
        'leadership', 'communication', 'teamwork', 'problem solving',
        'critical thinking', 'time management', 'adaptability', 'creativity',
        'collaboration', 'project management', 'analytical', 'strategic'
    ]
    
    EDUCATION_KEYWORDS = [
        'bachelor', 'master', 'phd', 'mba', 'degree', 'university',
        'college', 'institute', 'b.tech', 'm.tech', 'b.e', 'm.e',
        'computer science', 'engineering', 'information technology'
    ]
    
    def extract_text_from_pdf(self, file_path: str) -> str:
        """Extract text from PDF file"""
        try:
            text = ""
            with open(file_path, 'rb') as file:
                pdf_reader = PyPDF2.PdfReader(file)
                for page in pdf_reader.pages:
                    text += page.extract_text()
            return text
        except Exception as e:
            print(f"Error reading PDF: {e}")
            return ""
    
    def extract_text_from_docx(self, file_path: str) -> str:
        """Extract text from DOCX file"""
        try:
            doc = docx.Document(file_path)
            text = "\n".join([paragraph.text for paragraph in doc.paragraphs])
            return text
        except Exception as e:
            print(f"Error reading DOCX: {e}")
            return ""
    
    def extract_text(self, file_path: str) -> str:
        """Extract text from resume file"""
        if not os.path.exists(file_path):
            return ""
        
        ext = os.path.splitext(file_path)[1].lower()
        if ext == '.pdf':
            return self.extract_text_from_pdf(file_path)
        elif ext in ['.docx', '.doc']:
            return self.extract_text_from_docx(file_path)
        else:
            # Try reading as plain text
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    return f.read()
            except:
                return ""
    
    def extract_email(self, text: str) -> str:
        """Extract email from text"""
        email_pattern = r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'
        emails = re.findall(email_pattern, text)
        return emails[0] if emails else ""
    
    def extract_phone(self, text: str) -> str:
        """Extract phone number from text"""
        phone_pattern = r'[\+\(]?[1-9][0-9 .\-\(\)]{8,}[0-9]'
        phones = re.findall(phone_pattern, text)
        return phones[0] if phones else ""
    
    def extract_skills(self, text: str) -> Dict[str, List[str]]:
        """Extract technical and soft skills from text"""
        text_lower = text.lower()
        
        technical_skills_found = [
            skill for skill in self.TECHNICAL_SKILLS 
            if skill in text_lower
        ]
        
        soft_skills_found = [
            skill for skill in self.SOFT_SKILLS 
            if skill in text_lower
        ]
        
        return {
            'technical': list(set(technical_skills_found)),
            'soft': list(set(soft_skills_found))
        }
    
    def extract_experience_years(self, text: str) -> float:
        """Extract years of experience from text"""
        # Look for patterns like "5 years", "5+ years", "5-7 years"
        patterns = [
            r'(\d+)\+?\s*(?:years?|yrs?)\s*(?:of)?\s*(?:experience)?',
            r'experience[:\s]+(\d+)\+?\s*(?:years?|yrs?)',
        ]
        
        years = []
        for pattern in patterns:
            matches = re.findall(pattern, text.lower())
            years.extend([int(m) for m in matches])
        
        return max(years) if years else 0
    
    def extract_education(self, text: str) -> List[str]:
        """Extract education qualifications"""
        text_lower = text.lower()
        education_found = [
            keyword for keyword in self.EDUCATION_KEYWORDS 
            if keyword in text_lower
        ]
        return list(set(education_found))
    
    def calculate_keyword_match(self, resume_text: str, job_description: str) -> float:
        """Calculate keyword match score using TF-IDF and cosine similarity"""
        try:
            # Create TF-IDF vectors
            vectorizer = TfidfVectorizer(
                stop_words='english',
                max_features=100,
                ngram_range=(1, 2)
            )
            
            # Fit and transform both texts
            tfidf_matrix = vectorizer.fit_transform([resume_text, job_description])
            
            # Calculate cosine similarity
            similarity = cosine_similarity(tfidf_matrix[0:1], tfidf_matrix[1:2])[0][0]
            
            # Convert numpy float to Python float
            return float(similarity * 100)  # Convert to percentage
        except Exception as e:
            print(f"Error calculating keyword match: {e}")
            return 0.0
    
    def calculate_skills_match(self, resume_skills: List[str], job_description: str) -> float:
        """Calculate skills match percentage"""
        if not resume_skills:
            return 0.0
        
        job_desc_lower = job_description.lower()
        matched_skills = [skill for skill in resume_skills if skill in job_desc_lower]
        
        # Extract required skills from job description
        required_skills = [skill for skill in self.TECHNICAL_SKILLS if skill in job_desc_lower]
        
        if not required_skills:
            return 50.0  # Default if no specific skills mentioned
        
        match_percentage = (len(matched_skills) / len(required_skills)) * 100
        return min(match_percentage, 100.0)
    
    def calculate_experience_match(self, resume_years: float, job_description: str) -> float:
        """Calculate experience match score"""
        # Extract required years from job description
        required_years_pattern = r'(\d+)\+?\s*(?:years?|yrs?)'
        matches = re.findall(required_years_pattern, job_description.lower())
        
        if not matches:
            return 70.0  # Default if no experience mentioned
        
        required_years = int(matches[0])
        
        if resume_years >= required_years:
            return 100.0
        elif resume_years >= required_years * 0.7:
            return 80.0
        elif resume_years >= required_years * 0.5:
            return 60.0
        else:
            return 40.0
    
    def calculate_education_match(self, resume_education: List[str], job_description: str) -> float:
        """Calculate education match score"""
        if not resume_education:
            return 50.0
        
        job_desc_lower = job_description.lower()
        
        # Check for degree requirements
        has_degree = any(edu in ['bachelor', 'master', 'phd', 'mba'] for edu in resume_education)
        degree_required = any(keyword in job_desc_lower for keyword in ['bachelor', 'master', 'degree', 'phd'])
        
        if degree_required and has_degree:
            return 100.0
        elif has_degree:
            return 90.0
        elif not degree_required:
            return 80.0
        else:
            return 50.0
    
    def analyze_resume_quality(self, text: str) -> float:
        """Analyze overall resume quality"""
        score = 0.0
        
        # Length check (ideal: 400-2000 words)
        word_count = len(text.split())
        if 400 <= word_count <= 2000:
            score += 25
        elif 200 <= word_count < 400 or 2000 < word_count <= 3000:
            score += 15
        else:
            score += 5
        
        # Has contact info
        if self.extract_email(text):
            score += 15
        if self.extract_phone(text):
            score += 10
        
        # Has quantifiable achievements (numbers)
        numbers = re.findall(r'\d+%|\d+\+|increased|decreased|improved', text.lower())
        if len(numbers) >= 3:
            score += 20
        elif len(numbers) >= 1:
            score += 10
        
        # Grammar and readability
        try:
            blob = TextBlob(text[:1000])  # Check first 1000 chars
            if blob.sentiment.polarity > -0.5:  # Not too negative
                score += 15
        except:
            score += 5
        
        # Has section headers
        headers = ['experience', 'education', 'skills', 'projects', 'summary']
        header_count = sum(1 for header in headers if header in text.lower())
        score += min(header_count * 3, 15)
        
        return min(score, 100.0)
    
    def calculate_ai_fit_score(self, resume_path: str, job_description: str) -> Tuple[float, Dict]:
        """
        Calculate comprehensive AI fit score
        Returns: (overall_score, detailed_breakdown)
        """
        # Extract resume text
        resume_text = self.extract_text(resume_path)
        
        if not resume_text:
            return 0.0, {"error": "Could not extract text from resume"}
        
        # Extract features
        skills = self.extract_skills(resume_text)
        experience_years = self.extract_experience_years(resume_text)
        education = self.extract_education(resume_text)
        
        # Calculate individual scores
        keyword_score = self.calculate_keyword_match(resume_text, job_description)
        skills_score = self.calculate_skills_match(skills['technical'], job_description)
        experience_score = self.calculate_experience_match(experience_years, job_description)
        education_score = self.calculate_education_match(education, job_description)
        quality_score = self.analyze_resume_quality(resume_text)
        
        # Weighted average
        weights = {
            'keyword_match': 0.30,
            'skills_match': 0.25,
            'experience_match': 0.20,
            'education_match': 0.15,
            'quality': 0.10
        }
        
        overall_score = (
            keyword_score * weights['keyword_match'] +
            skills_score * weights['skills_match'] +
            experience_score * weights['experience_match'] +
            education_score * weights['education_match'] +
            quality_score * weights['quality']
        )
        
        breakdown = {
            'overall_score': float(round(overall_score, 1)),
            'keyword_match': float(round(keyword_score, 1)),
            'skills_match': float(round(skills_score, 1)),
            'experience_match': float(round(experience_score, 1)),
            'education_match': float(round(education_score, 1)),
            'quality_score': float(round(quality_score, 1)),
            'extracted_data': {
                'technical_skills': skills['technical'][:10],  # Top 10
                'soft_skills': skills['soft'][:5],
                'experience_years': float(experience_years),
                'education': education,
                'email': self.extract_email(resume_text),
                'phone': self.extract_phone(resume_text)
            }
        }
        
        return float(round(overall_score, 1)), breakdown


# Convenience function for bulk upload
def parse_resume(file_path: str) -> Dict:
    """
    Simple resume parsing function for bulk upload
    Returns basic candidate information
    """
    parser = ResumeParser()
    text = parser.extract_text(file_path)
    
    if not text:
        return {"error": "Could not extract text from resume"}
    
    skills = parser.extract_skills(text)
    
    return {
        "name": "Unknown",  # Name extraction is complex, can be enhanced
        "email": parser.extract_email(text),
        "phone": parser.extract_phone(text),
        "skills": skills['technical'] + skills['soft'],
        "experience_years": parser.extract_experience_years(text),
        "education": parser.extract_education(text),
        "certifications": []  # Can be enhanced
    }
