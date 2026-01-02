"""
Talent Intelligence System - Enhanced Models
6-Step Workflow with Advanced Features
"""
from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, DateTime, Date, Float, Text, Time, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import JSONB
from .database import Base
from datetime import datetime

# ============================================
# EXISTING MODELS (Enhanced)
# ============================================

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    is_active = Column(Boolean, default=True)
    role = Column(String, default="employee") # super_admin, recruiter, interviewer, agency, hiring_manager, employee, candidate

class Job(Base):
    __tablename__ = "jobs"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True)
    description = Column(Text)
    department = Column(String)
    location = Column(String)
    posted_date = Column(DateTime, default=datetime.utcnow)
    is_active = Column(Boolean, default=True)
    
    # Workflow Fields
    workflow_mode = Column(String, default="flexible") # mandatory, flexible, smart
    current_step = Column(Integer, default=0) # 0-6 (new 6-step workflow)
    requisition_status = Column(String, default="approved") # draft, pending, approved, published
    
    # New Fields for Talent Intelligence
    application_link_code = Column(String, unique=True, index=True)
    qr_code_url = Column(Text)
    allow_linkedin_apply = Column(Boolean, default=False)
    allow_bulk_upload = Column(Boolean, default=True)
    blind_hiring_enabled = Column(Boolean, default=False)
    required_skills = Column(JSONB, default=[])
    min_experience_years = Column(Integer)
    max_experience_years = Column(Integer)
    salary_range_min = Column(Float)
    salary_range_max = Column(Float)
    remote_allowed = Column(Boolean, default=False)
    hiring_manager_id = Column(Integer, ForeignKey("users.id"))
    
    hiring_manager = relationship("User", foreign_keys=[hiring_manager_id])

class Application(Base):
    __tablename__ = "applications"

    id = Column(Integer, primary_key=True, index=True)
    job_id = Column(Integer, ForeignKey("jobs.id"))
    candidate_name = Column(String)
    candidate_email = Column(String, index=True)
    resume_url = Column(String)
    status = Column(String, default="applied") # applied, screening, evaluation, selection, offer, onboarding, hired, rejected
    applied_date = Column(DateTime, default=datetime.utcnow)
    ai_fit_score = Column(Float, default=0.0)
    
    # New Fields for Enhanced Tracking
    source = Column(String, default="direct") # direct, agency, linkedin, bulk_upload, talent_pool, referral
    tags = Column(JSONB, default=[])
    is_starred = Column(Boolean, default=False)
    blind_hiring_enabled = Column(Boolean, default=False)
    identity_revealed_at = Column(DateTime)
    revealed_by = Column(Integer, ForeignKey("users.id"))
    
    # Candidate Details (from enhanced parser)
    phone = Column(String)
    linkedin_profile_url = Column(Text)
    years_of_experience = Column(Integer)
    current_company = Column(String)
    current_position = Column(String)
    expected_salary = Column(Float)
    notice_period_days = Column(Integer)
    skills = Column(JSONB, default=[])
    education = Column(JSONB, default=[])
    certifications = Column(JSONB, default=[])
    
    # Stage Tracking
    stage_changed_at = Column(DateTime)
    stage_changed_by = Column(Integer, ForeignKey("users.id"))
    
    job = relationship("Job")
    revealer = relationship("User", foreign_keys=[revealed_by])
    stage_changer = relationship("User", foreign_keys=[stage_changed_by])

# ============================================
# NEW MODELS - TALENT POOL
# ============================================

class TalentPool(Base):
    __tablename__ = "talent_pool"
    
    id = Column(Integer, primary_key=True, index=True)
    candidate_name = Column(String, nullable=False)
    candidate_email = Column(String, unique=True, nullable=False, index=True)
    phone = Column(String)
    resume_url = Column(Text)
    skills = Column(JSONB, default=[])
    experience_years = Column(Integer)
    tags = Column(JSONB, default=[]) # ["Silver Medalist", "Future Java Dev", "Leadership Potential"]
    source = Column(String) # rejected_application, proactive_sourcing, referral
    original_application_id = Column(Integer, ForeignKey("applications.id"))
    ai_fit_score = Column(Float, default=0.0)
    added_date = Column(DateTime, default=datetime.utcnow)
    last_contacted = Column(DateTime)
    status = Column(String, default="active") # active, contacted, hired_elsewhere, not_interested
    notes = Column(Text)
    created_by = Column(Integer, ForeignKey("users.id"))
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    original_application = relationship("Application", foreign_keys=[original_application_id])
    creator = relationship("User", foreign_keys=[created_by])

# ============================================
# NEW MODELS - AGENCY PORTAL
# ============================================

class Agency(Base):
    __tablename__ = "agencies"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    contact_person = Column(String)
    email = Column(String, unique=True, nullable=False)
    phone = Column(String)
    commission_percentage = Column(Float, default=10.0)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class AgencySubmission(Base):
    __tablename__ = "agency_submissions"
    
    id = Column(Integer, primary_key=True, index=True)
    agency_id = Column(Integer, ForeignKey("agencies.id"))
    application_id = Column(Integer, ForeignKey("applications.id"))
    job_id = Column(Integer, ForeignKey("jobs.id"))
    submitted_date = Column(DateTime, default=datetime.utcnow)
    commission_amount = Column(Float)
    commission_paid = Column(Boolean, default=False)
    payment_date = Column(DateTime)
    notes = Column(Text)
    
    agency = relationship("Agency")
    application = relationship("Application")
    job = relationship("Job")

# ============================================
# NEW MODELS - AUTOMATED SCHEDULER
# ============================================

class InterviewerAvailability(Base):
    __tablename__ = "interviewer_availability"
    
    id = Column(Integer, primary_key=True, index=True)
    interviewer_id = Column(Integer, ForeignKey("users.id"))
    day_of_week = Column(Integer) # 0=Monday, 6=Sunday
    start_time = Column(Time, nullable=False)
    end_time = Column(Time, nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    interviewer = relationship("User")

class Interview(Base):
    __tablename__ = "interviews"

    id = Column(Integer, primary_key=True, index=True)
    application_id = Column(Integer, ForeignKey("applications.id"))
    interviewer_id = Column(Integer, ForeignKey("users.id"))
    scheduled_time = Column(DateTime)
    meeting_link = Column(String, nullable=True)
    status = Column(String, default="scheduled") # scheduled, completed, cancelled
    
    application = relationship("Application")
    interviewer = relationship("User")

class InterviewSlot(Base):
    __tablename__ = "interview_slots"
    
    id = Column(Integer, primary_key=True, index=True)
    interview_id = Column(Integer, ForeignKey("interviews.id"))
    slot_start = Column(DateTime, nullable=False)
    slot_end = Column(DateTime, nullable=False)
    is_booked = Column(Boolean, default=False)
    booked_by_application_id = Column(Integer, ForeignKey("applications.id"))
    meeting_link = Column(Text)
    meeting_platform = Column(String, default="zoom") # zoom, teams, meet
    calendar_event_id = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    interview = relationship("Interview")
    application = relationship("Application", foreign_keys=[booked_by_application_id])

# ============================================
# NEW MODELS - COLLABORATION
# ============================================

class ApplicationComment(Base):
    __tablename__ = "application_comments"
    
    id = Column(Integer, primary_key=True, index=True)
    application_id = Column(Integer, ForeignKey("applications.id"))
    user_id = Column(Integer, ForeignKey("users.id"))
    comment = Column(Text, nullable=False)
    is_internal = Column(Boolean, default=True) # internal notes vs candidate-visible
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    application = relationship("Application")
    user = relationship("User")

class ApplicationStageHistory(Base):
    __tablename__ = "application_stage_history"
    
    id = Column(Integer, primary_key=True, index=True)
    application_id = Column(Integer, ForeignKey("applications.id"))
    from_stage = Column(String)
    to_stage = Column(String, nullable=False)
    changed_by = Column(Integer, ForeignKey("users.id"))
    notes = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    application = relationship("Application")
    changer = relationship("User")

# ============================================
# NEW MODELS - BULK UPLOAD
# ============================================

class BulkUpload(Base):
    __tablename__ = "bulk_uploads"
    
    id = Column(Integer, primary_key=True, index=True)
    job_id = Column(Integer, ForeignKey("jobs.id"))
    uploaded_by = Column(Integer, ForeignKey("users.id"))
    total_files = Column(Integer, default=0)
    successful_parses = Column(Integer, default=0)
    failed_parses = Column(Integer, default=0)
    status = Column(String, default="processing") # processing, completed, failed
    error_log = Column(JSONB, default=[])
    created_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime)
    
    job = relationship("Job")
    uploader = relationship("User")

class BulkUploadFile(Base):
    __tablename__ = "bulk_upload_files"
    
    id = Column(Integer, primary_key=True, index=True)
    bulk_upload_id = Column(Integer, ForeignKey("bulk_uploads.id"))
    filename = Column(String)
    file_url = Column(Text)
    application_id = Column(Integer, ForeignKey("applications.id"))
    parse_status = Column(String, default="pending") # pending, success, failed
    parse_error = Column(Text)
    parsed_data = Column(JSONB)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    bulk_upload = relationship("BulkUpload")
    application = relationship("Application")

# ============================================
# NEW MODELS - RBAC
# ============================================

class Permission(Base):
    __tablename__ = "permissions"
    
    id = Column(Integer, primary_key=True, index=True)
    role = Column(String, nullable=False)
    resource = Column(String, nullable=False)
    action = Column(String, nullable=False) # create, read, update, delete, approve

# ============================================
# NEW MODELS - AUDIT LOGS
# ============================================

class AuditLog(Base):
    __tablename__ = "audit_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    action = Column(String, nullable=False)
    resource_type = Column(String, nullable=False)
    resource_id = Column(Integer, nullable=False)
    old_value = Column(Text)
    new_value = Column(Text)
    ip_address = Column(String)
    user_agent = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    user = relationship("User")

# ============================================
# NEW MODELS - NOTIFICATIONS
# ============================================

class NotificationPreference(Base):
    __tablename__ = "notification_preferences"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True)
    email_enabled = Column(Boolean, default=True)
    sms_enabled = Column(Boolean, default=False)
    whatsapp_enabled = Column(Boolean, default=False)
    phone_number = Column(String)
    whatsapp_number = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    user = relationship("User")

class NotificationLog(Base):
    __tablename__ = "notification_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    type = Column(String) # email, sms, whatsapp
    subject = Column(String)
    message = Column(Text)
    status = Column(String, default="sent") # sent, failed, pending
    error_message = Column(Text)
    sent_at = Column(DateTime, default=datetime.utcnow)
    
    user = relationship("User")

# ============================================
# NEW MODELS - LINKEDIN INTEGRATION
# ============================================

class LinkedInProfile(Base):
    __tablename__ = "linkedin_profiles"
    
    id = Column(Integer, primary_key=True, index=True)
    application_id = Column(Integer, ForeignKey("applications.id"))
    linkedin_id = Column(String, unique=True)
    profile_url = Column(Text)
    profile_data = Column(JSONB) # Full LinkedIn profile JSON
    imported_at = Column(DateTime, default=datetime.utcnow)
    
    application = relationship("Application")

# ============================================
# NEW MODELS - INTERVIEW FEEDBACK
# ============================================

class InterviewFeedbackTemplate(Base):
    __tablename__ = "interview_feedback_templates"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    questions = Column(JSONB, nullable=False) # Array of questions
    created_by = Column(Integer, ForeignKey("users.id"))
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    creator = relationship("User")

class InterviewFeedback(Base):
    __tablename__ = "interview_feedback"
    
    id = Column(Integer, primary_key=True, index=True)
    interview_id = Column(Integer, ForeignKey("interviews.id"))
    template_id = Column(Integer, ForeignKey("interview_feedback_templates.id"))
    responses = Column(JSONB, nullable=False) # Question-answer pairs
    overall_rating = Column(Integer) # 1-5
    recommendation = Column(String) # strong_hire, hire, maybe, no_hire
    notes = Column(Text)
    submitted_by = Column(Integer, ForeignKey("users.id"))
    submitted_at = Column(DateTime, default=datetime.utcnow)
    
    interview = relationship("Interview")
    template = relationship("InterviewFeedbackTemplate")
    submitter = relationship("User")

# ============================================
# NEW MODELS - COMMUNICATION HISTORY
# ============================================

class CandidateCommunication(Base):
    __tablename__ = "candidate_communications"
    
    id = Column(Integer, primary_key=True, index=True)
    application_id = Column(Integer, ForeignKey("applications.id"))
    type = Column(String) # email, sms, whatsapp, call
    direction = Column(String) # inbound, outbound
    subject = Column(String)
    message = Column(Text)
    sent_by = Column(Integer, ForeignKey("users.id"))
    status = Column(String, default="sent")
    created_at = Column(DateTime, default=datetime.utcnow)
    
    application = relationship("Application")
    sender = relationship("User")

# ============================================
# NEW MODELS - CUSTOM APPLICATION FORMS
# ============================================

class ApplicationFormField(Base):
    __tablename__ = "application_form_fields"
    
    id = Column(Integer, primary_key=True, index=True)
    job_id = Column(Integer, ForeignKey("jobs.id"))
    field_name = Column(String, nullable=False)
    field_type = Column(String, nullable=False) # text, email, phone, file, select, checkbox
    field_label = Column(String, nullable=False)
    is_required = Column(Boolean, default=False)
    options = Column(JSONB) # For select/checkbox fields
    display_order = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    job = relationship("Job")

# ============================================
# NEW MODELS - REFERRALS
# ============================================

class Referral(Base):
    __tablename__ = "referrals"
    
    id = Column(Integer, primary_key=True, index=True)
    referred_by_employee_id = Column(Integer, ForeignKey("employees.id"))
    application_id = Column(Integer, ForeignKey("applications.id"))
    referral_bonus_amount = Column(Float)
    bonus_paid = Column(Boolean, default=False)
    bonus_paid_date = Column(DateTime)
    status = Column(String, default="pending") # pending, hired, rejected
    created_at = Column(DateTime, default=datetime.utcnow)
    
    referrer = relationship("Employee")
    application = relationship("Application")

# ============================================
# EXISTING MODELS (Keep as is)
# ============================================

class AIInterview(Base):
    __tablename__ = "ai_interviews"

    id = Column(Integer, primary_key=True, index=True)
    application_id = Column(Integer, ForeignKey("applications.id"))
    status = Column(String, default="pending")
    overall_score = Column(Float, default=0.0)
    emotional_tone = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    application = relationship("Application")
    logs = relationship("AIInterviewLog", back_populates="interview")

class AIInterviewLog(Base):
    __tablename__ = "ai_interview_logs"

    id = Column(Integer, primary_key=True, index=True)
    interview_id = Column(Integer, ForeignKey("ai_interviews.id"))
    question = Column(Text)
    candidate_response = Column(Text)
    ai_evaluation = Column(Text)
    score = Column(Float)
    sentiment = Column(String)
    timestamp = Column(DateTime, default=datetime.utcnow)

    interview = relationship("AIInterview", back_populates="logs")

class Employee(Base):
    __tablename__ = "employees"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    first_name = Column(String)
    last_name = Column(String)
    department = Column(String)
    position = Column(String)
    date_of_joining = Column(DateTime)
    pan_number = Column(String, nullable=True)
    aadhaar_number = Column(String, nullable=True)
    profile_summary = Column(Text, nullable=True)
    wfh_status = Column(String, default="office")
    is_immediate_joiner = Column(Boolean, default=False)
    onboarding_status = Column(String, default="initiated")
    it_setup_status = Column(String, default="pending")
    
    user = relationship("User")
    documents = relationship("EmployeeDocument", back_populates="employee")

class EmployeeDocument(Base):
    __tablename__ = "employee_documents"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employees.id"))
    document_type = Column(String)
    document_url = Column(String)
    uploaded_at = Column(DateTime, default=datetime.utcnow)
    is_verified = Column(Boolean, default=False)
    ocr_confidence = Column(Float, default=0.0)
    rejection_reason = Column(String, nullable=True)

    employee = relationship("Employee", back_populates="documents")

# ... (Keep all other existing models: OfferLetter, InductionModule, LeaveRequest, Payroll, etc.)
