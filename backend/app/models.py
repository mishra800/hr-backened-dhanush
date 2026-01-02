from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, DateTime, Date, Float, Text, JSON
from sqlalchemy.orm import relationship
from .database import Base
from datetime import datetime

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    is_active = Column(Boolean, default=True)
    role = Column(String, default="employee") # admin, hr, employee, candidate

class Job(Base):
    __tablename__ = "jobs"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True)
    description = Column(Text)
    department = Column(String)
    location = Column(String)
    posted_date = Column(DateTime, default=datetime.utcnow)
    is_active = Column(Boolean, default=True)
    
    # Advanced Workflow Fields
    workflow_mode = Column(String, default="flexible") # mandatory, flexible, smart
    current_step = Column(Integer, default=0) # 0-6 (new 6-step workflow)
    requisition_status = Column(String, default="approved") # draft, pending_approval, approved, active
    # Note: No external job posting - candidates apply via unique link
    
    # New fields for Talent Intelligence System
    application_link_code = Column(String, unique=True, index=True)
    qr_code_url = Column(Text)
    allow_linkedin_apply = Column(Boolean, default=False)
    allow_bulk_upload = Column(Boolean, default=True)
    blind_hiring_enabled = Column(Boolean, default=False)
    required_skills = Column(JSON, default=[])
    min_experience_years = Column(Integer)
    max_experience_years = Column(Integer)
    salary_range_min = Column(Float)
    salary_range_max = Column(Float)
    remote_allowed = Column(Boolean, default=False)
    hiring_manager_id = Column(Integer, ForeignKey("users.id"))

class Application(Base):
    __tablename__ = "applications"

    id = Column(Integer, primary_key=True, index=True)
    job_id = Column(Integer, ForeignKey("jobs.id"))
    candidate_name = Column(String)
    candidate_email = Column(String)
    resume_url = Column(String)
    status = Column(String, default="applied") # applied, screening, evaluation, selection, offer, onboarding, hired, rejected
    applied_date = Column(DateTime, default=datetime.utcnow)
    ai_fit_score = Column(Float, default=0.0)
    
    # Extended fields for Talent Intelligence System (migrated)
    source = Column(String, default="careers_website") # direct, agency, linkedin, bulk_upload, talent_pool, referral
    tags = Column(JSON, default=[])
    is_starred = Column(Boolean, default=False)
    blind_hiring_enabled = Column(Boolean, default=False)
    identity_revealed_at = Column(DateTime)
    revealed_by = Column(Integer, ForeignKey("users.id"))
    phone = Column(String)
    linkedin_profile_url = Column(Text)
    years_of_experience = Column(Integer)
    current_company = Column(String)
    current_position = Column(String)
    expected_salary = Column(Float)
    notice_period_days = Column(Integer)
    skills = Column(JSON, default=[])
    education = Column(JSON, default=[])
    certifications = Column(JSON, default=[])
    stage_changed_at = Column(DateTime)
    stage_changed_by = Column(Integer, ForeignKey("users.id"))
    
    job = relationship("Job")

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

class AIInterview(Base):
    __tablename__ = "ai_interviews"

    id = Column(Integer, primary_key=True, index=True)
    application_id = Column(Integer, ForeignKey("applications.id"))
    status = Column(String, default="pending") # pending, in_progress, completed
    overall_score = Column(Float, default=0.0)
    emotional_tone = Column(String, nullable=True) # e.g., "Confident", "Nervous"
    created_at = Column(DateTime, default=datetime.utcnow)

    application = relationship("Application")
    logs = relationship("AIInterviewLog", back_populates="interview")

class AIInterviewLog(Base):
    __tablename__ = "ai_interview_logs"

    id = Column(Integer, primary_key=True, index=True)
    interview_id = Column(Integer, ForeignKey("ai_interviews.id"))
    question = Column(Text)
    candidate_response = Column(Text)
    ai_evaluation = Column(Text) # JSON or text summary of the specific answer
    score = Column(Float) # 0-10 for this specific answer
    sentiment = Column(String) # Positive, Neutral, Negative
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
    profile_image_url = Column(String, nullable=True)  # For face recognition
    wfh_status = Column(String, default="office")  # office, wfh
    
    # Onboarding Fields
    is_immediate_joiner = Column(Boolean, default=False)
    onboarding_status = Column(String, default="initiated")  # initiated, manager_prep, it_setup, compliance, induction, completed
    it_setup_status = Column(String, default="pending")  # pending, ready
    
    user = relationship("User")
    documents = relationship("EmployeeDocument", back_populates="employee")

class EmployeeDocument(Base):
    __tablename__ = "employee_documents"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employees.id"))
    document_type = Column(String) # PAN, Aadhaar, Offer Letter, etc.
    document_url = Column(String)
    uploaded_at = Column(DateTime, default=datetime.utcnow)
    is_verified = Column(Boolean, default=False) # AI Verification status
    ocr_confidence = Column(Float, default=0.0)
    rejection_reason = Column(String, nullable=True)
    verified_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    verified_at = Column(DateTime, nullable=True)

    employee = relationship("Employee", back_populates="documents")
    verifier = relationship("User")

class OfferLetter(Base):
    __tablename__ = "offer_letters"
    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employees.id"))
    content = Column(Text)
    is_signed = Column(Boolean, default=False)
    signed_at = Column(DateTime, nullable=True)
    
    employee = relationship("Employee")

class InductionModule(Base):
    __tablename__ = "induction_modules"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String)
    video_url = Column(String)
    description = Column(String)


class LeaveRequest(Base):

    __tablename__ = "leave_requests"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employees.id"))
    start_date = Column(DateTime)
    end_date = Column(DateTime)
    reason = Column(Text)
    status = Column(String, default="pending") # pending, approved, rejected
    created_at = Column(DateTime, default=datetime.utcnow)

    employee = relationship("Employee")

class Payroll(Base):
    __tablename__ = "payroll"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employees.id"))
    month = Column(String) # e.g., "2023-11"
    
    # Earnings
    basic_salary = Column(Float)
    hra = Column(Float, default=0.0)
    transport_allowance = Column(Float, default=0.0)
    medical_allowance = Column(Float, default=0.0)
    special_allowance = Column(Float, default=0.0)
    bonus = Column(Float, default=0.0)
    overtime_amount = Column(Float, default=0.0)
    other_allowances = Column(Float, default=0.0)
    
    # Deductions
    pf = Column(Float, default=0.0)
    esi = Column(Float, default=0.0)
    professional_tax = Column(Float, default=0.0)
    income_tax = Column(Float, default=0.0)
    loan_deduction = Column(Float, default=0.0)
    other_deductions = Column(Float, default=0.0)
    
    # Working details
    total_working_days = Column(Integer, default=0)
    actual_working_days = Column(Integer, default=0)
    leave_days = Column(Integer, default=0)
    overtime_hours = Column(Float, default=0.0)
    
    # Calculated amounts
    gross_salary = Column(Float)
    total_deductions = Column(Float)
    net_salary = Column(Float)
    
    # Status and metadata
    status = Column(String, default="draft") # draft, calculated, approved, paid
    calculated_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    approved_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    payment_date = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Audit fields
    calculation_notes = Column(Text, nullable=True)
    manual_adjustments = Column(JSON, default={})

    employee = relationship("Employee")
    calculated_by_user = relationship("User", foreign_keys=[calculated_by])
    approved_by_user = relationship("User", foreign_keys=[approved_by])

class SalaryStructure(Base):
    __tablename__ = "salary_structures"
    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employees.id"))
    basic_salary = Column(Float)
    hra = Column(Float)
    transport_allowance = Column(Float, default=0.0)
    medical_allowance = Column(Float, default=0.0)
    special_allowance = Column(Float, default=0.0)
    other_allowances = Column(Float)
    effective_date = Column(DateTime, default=datetime.utcnow)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    employee = relationship("Employee")

class SalaryRevision(Base):
    __tablename__ = "salary_revisions"
    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employees.id"))
    previous_ctc = Column(Float)
    new_ctc = Column(Float)
    reason = Column(String, nullable=True)
    revision_date = Column(DateTime, default=datetime.utcnow)
    effective_date = Column(DateTime, default=datetime.utcnow)
    approved_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    employee = relationship("Employee")
    approved_by_user = relationship("User", foreign_keys=[approved_by])

# Payroll Configuration Tables
class PayrollConfiguration(Base):
    __tablename__ = "payroll_configurations"
    
    id = Column(Integer, primary_key=True, index=True)
    config_key = Column(String, unique=True, index=True)
    config_value = Column(JSON)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class TaxSlab(Base):
    __tablename__ = "tax_slabs"
    
    id = Column(Integer, primary_key=True, index=True)
    financial_year = Column(String)  # e.g., "2023-24"
    min_income = Column(Float)
    max_income = Column(Float, nullable=True)  # NULL for highest slab
    tax_rate = Column(Float)  # Percentage
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class DeductionRule(Base):
    __tablename__ = "deduction_rules"
    
    id = Column(Integer, primary_key=True, index=True)
    rule_name = Column(String, unique=True)
    rule_type = Column(String)  # 'percentage', 'fixed', 'slab'
    rule_config = Column(JSON)  # Configuration for the rule
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class PayrollBatch(Base):
    __tablename__ = "payroll_batches"
    
    id = Column(Integer, primary_key=True, index=True)
    batch_name = Column(String)
    month = Column(String)  # YYYY-MM format
    status = Column(String, default="draft")  # draft, processing, completed, failed
    total_employees = Column(Integer, default=0)
    processed_employees = Column(Integer, default=0)
    failed_employees = Column(Integer, default=0)
    created_by = Column(Integer, ForeignKey("users.id"))
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    created_by_user = relationship("User", foreign_keys=[created_by])

class PayslipDistribution(Base):
    __tablename__ = "payslip_distributions"
    
    id = Column(Integer, primary_key=True, index=True)
    payroll_id = Column(Integer, ForeignKey("payroll.id"))
    employee_id = Column(Integer, ForeignKey("employees.id"))
    distribution_method = Column(String)  # 'email', 'download', 'print'
    recipient_email = Column(String, nullable=True)
    status = Column(String, default="pending")  # pending, sent, failed
    sent_at = Column(DateTime, nullable=True)
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    revision_date = Column(DateTime, default=datetime.utcnow)
    reason = Column(String)
    
    payroll = relationship("Payroll")
    employee = relationship("Employee")

class PerformanceReview(Base):
    __tablename__ = "performance_reviews"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employees.id"))
    reviewer_id = Column(Integer, ForeignKey("users.id"))
    rating = Column(Float)
    comments = Column(Text)
    review_date = Column(DateTime, default=datetime.utcnow)
    
    # Advanced Performance Fields
    review_type = Column(String, default="manager") # self, peer, manager, 360
    sentiment_score = Column(Float, default=0.0) # -1.0 to 1.0
    sentiment_label = Column(String, nullable=True) # Positive, Neutral, Negative
    themes = Column(Text, default="[]") # JSON list of themes
    ai_feedback_summary = Column(Text, nullable=True)
    
    # Predictive Scoring Inputs (Snapshot)
    kpi_score = Column(Float, default=0.0)
    project_score = Column(Float, default=0.0)
    peer_score = Column(Float, default=0.0)
    final_predicted_score = Column(Float, default=0.0)

    employee = relationship("Employee")
    reviewer = relationship("User")

class Survey(Base):
    __tablename__ = "surveys"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String)
    description = Column(Text)
    status = Column(String, default="active") # active, closed
    created_at = Column(DateTime, default=datetime.utcnow)

class SurveyResponse(Base):
    __tablename__ = "survey_responses"

    id = Column(Integer, primary_key=True, index=True)
    survey_id = Column(Integer, ForeignKey("surveys.id"))
    employee_id = Column(Integer, ForeignKey("employees.id"))
    response_data = Column(Text) # JSON string or simple text
    submitted_at = Column(DateTime, default=datetime.utcnow)
    
    # Engagement Analysis
    sentiment_score = Column(Float, default=0.0)
    stress_level = Column(Integer, default=0) # 0-10
    engagement_score = Column(Integer, default=0) # 0-10

    survey = relationship("Survey")
    employee = relationship("Employee")

class Course(Base):
    __tablename__ = "courses"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String)
    instructor = Column(String)
    duration = Column(String)
    description = Column(Text)

class Enrollment(Base):
    __tablename__ = "enrollments"

    id = Column(Integer, primary_key=True, index=True)
    course_id = Column(Integer, ForeignKey("courses.id"))
    employee_id = Column(Integer, ForeignKey("employees.id"))
    progress = Column(Integer, default=0) # 0-100
    enrolled_at = Column(DateTime, default=datetime.utcnow)

    course = relationship("Course")
    employee = relationship("Employee")

class OnboardingTask(Base):
    __tablename__ = "onboarding_tasks"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employees.id"))
    task_name = Column(String)
    description = Column(String)
    is_completed = Column(Boolean, default=False)
    completed_at = Column(DateTime, nullable=True)

    employee = relationship("Employee")

class Shift(Base):
    __tablename__ = "shifts"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String) # Morning, Evening
    start_time = Column(String) # "09:00"
    end_time = Column(String) # "18:00"

class WFHRequest(Base):
    __tablename__ = "wfh_requests"
    
    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employees.id"))
    request_date = Column(DateTime)  # Date for which WFH is requested
    reason = Column(Text)
    status = Column(String, default="pending")  # pending, approved, rejected
    manager_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    manager_comments = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    reviewed_at = Column(DateTime, nullable=True)
    
    employee = relationship("Employee", foreign_keys=[employee_id])
    manager = relationship("User", foreign_keys=[manager_id])

class Attendance(Base):
    __tablename__ = "attendance"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employees.id"))
    date = Column(DateTime, default=datetime.utcnow)
    status = Column(String) # present, absent, leave, late
    check_in = Column(DateTime, nullable=True)
    check_out = Column(DateTime, nullable=True)
    
    # Location & Photo
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    photo_url = Column(String, nullable=True)  # Stored attendance photo
    location_address = Column(String, nullable=True)  # Readable address
    
    # Verification
    verification_method = Column(String, default="photo") # photo, manual, face_recognition
    is_fraud_suspected = Column(Boolean, default=False)
    flagged_reason = Column(String, nullable=True)
    face_match_confidence = Column(Float, nullable=True)  # Face recognition confidence %
    
    # Work Mode
    work_mode = Column(String, default="office") # office, wfh
    wfh_request_id = Column(Integer, ForeignKey("wfh_requests.id"), nullable=True)
    
    # Manager Review
    requires_approval = Column(Boolean, default=False)  # Late check-in
    approved_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    approval_status = Column(String, default="auto_approved")  # auto_approved, pending, approved, rejected
    
    shift_id = Column(Integer, ForeignKey("shifts.id"), nullable=True)

    employee = relationship("Employee")
    shift = relationship("Shift")
    wfh_request = relationship("WFHRequest", foreign_keys=[wfh_request_id])
    approver = relationship("User", foreign_keys=[approved_by])

class LeaveBalance(Base):
    __tablename__ = "leave_balances"
    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employees.id"))
    leave_type = Column(String) # Sick, Casual, Earned
    balance = Column(Integer, default=0)
    
    employee = relationship("Employee")

class Holiday(Base):
    __tablename__ = "holidays"
    id = Column(Integer, primary_key=True, index=True)
    date = Column(Date)
    name = Column(String)
    description = Column(String, nullable=True)
    type = Column(String, default="public") # public, optional
    is_optional = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

class AttendanceCorrection(Base):
    __tablename__ = "attendance_corrections"
    id = Column(Integer, primary_key=True, index=True)
    attendance_id = Column(Integer, ForeignKey("attendance.id"))
    employee_id = Column(Integer, ForeignKey("employees.id"))
    requested_check_in = Column(DateTime, nullable=True)
    requested_check_out = Column(DateTime, nullable=True)
    reason = Column(Text)
    status = Column(String, default="pending") # pending, approved, rejected
    manager_comments = Column(Text, nullable=True)
    reviewed_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    reviewed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    attendance = relationship("Attendance")
    employee = relationship("Employee")
    reviewer = relationship("User", foreign_keys=[reviewed_by])

class Goal(Base):
    __tablename__ = "goals"
    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employees.id"))
    title = Column(String)
    description = Column(Text)
    status = Column(String, default="pending") # pending, in_progress, completed
    due_date = Column(DateTime)
    
    employee = relationship("Employee")

class Feedback(Base):
    __tablename__ = "feedbacks"
    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employees.id")) # Receiver
    reviewer_id = Column(Integer, ForeignKey("users.id")) # Giver
    content = Column(Text)
    type = Column(String) # 360, Manager, Peer
    created_at = Column(DateTime, default=datetime.utcnow)

    employee = relationship("Employee")
    reviewer = relationship("User")

class Skill(Base):
    __tablename__ = "skills"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True)

class EmployeeSkill(Base):
    __tablename__ = "employee_skills"
    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employees.id"))
    skill_id = Column(Integer, ForeignKey("skills.id"))
    proficiency = Column(Integer) # 1-10
    
    employee = relationship("Employee")
    skill = relationship("Skill")

class Asset(Base):
    __tablename__ = "assets"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    type = Column(String) # Laptop, Mobile, Monitor, Keyboard, Mouse, Headset
    serial_number = Column(String, unique=True)
    assigned_to = Column(Integer, ForeignKey("employees.id"), nullable=True)
    status = Column(String, default="available") # available, assigned, maintenance, damaged, retired
    purchase_date = Column(DateTime, nullable=True)
    warranty_expiry = Column(DateTime, nullable=True)
    specifications = Column(JSON, nullable=True)
    location = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    employee = relationship("Employee")

class AssetRequest(Base):
    __tablename__ = "asset_requests"
    
    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employees.id"))
    request_type = Column(String, nullable=False)  # new_employee, replacement, additional, complaint
    priority = Column(String, default="normal")  # urgent, high, normal, low
    status = Column(String, default="pending")  # pending, approved, assigned, completed, rejected
    
    # Request details
    requested_assets = Column(JSON, default=[])  # List of asset types needed
    reason = Column(Text, nullable=True)
    business_justification = Column(Text, nullable=True)
    
    # Approval workflow
    requested_by = Column(Integer, ForeignKey("users.id"))
    approved_by_manager = Column(Integer, ForeignKey("users.id"), nullable=True)
    approved_by_hr = Column(Integer, ForeignKey("users.id"), nullable=True)
    assigned_to_assets_team = Column(Integer, ForeignKey("users.id"), nullable=True)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    manager_approved_at = Column(DateTime, nullable=True)
    hr_approved_at = Column(DateTime, nullable=True)
    assets_assigned_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    
    # Notes
    manager_notes = Column(Text, nullable=True)
    hr_notes = Column(Text, nullable=True)
    assets_team_notes = Column(Text, nullable=True)
    
    employee = relationship("Employee")
    requester = relationship("User", foreign_keys=[requested_by])
    manager_approver = relationship("User", foreign_keys=[approved_by_manager])
    hr_approver = relationship("User", foreign_keys=[approved_by_hr])
    assets_team_member = relationship("User", foreign_keys=[assigned_to_assets_team])

class AssetComplaint(Base):
    __tablename__ = "asset_complaints"
    
    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employees.id"))
    asset_id = Column(Integer, ForeignKey("assets.id"), nullable=True)
    complaint_type = Column(String, nullable=False)  # hardware_issue, software_issue, damage, theft, other
    priority = Column(String, default="normal")  # urgent, high, normal, low
    status = Column(String, default="open")  # open, in_progress, resolved, closed
    
    # Complaint details
    title = Column(String, nullable=False)
    description = Column(Text, nullable=False)
    impact_level = Column(String, default="medium")  # critical, high, medium, low
    
    # Assignment
    assigned_to = Column(Integer, ForeignKey("users.id"), nullable=True)
    
    # Resolution
    resolution_notes = Column(Text, nullable=True)
    resolution_action = Column(String, nullable=True)  # repaired, replaced, software_fix, user_training
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    assigned_at = Column(DateTime, nullable=True)
    resolved_at = Column(DateTime, nullable=True)
    closed_at = Column(DateTime, nullable=True)
    
    employee = relationship("Employee")
    asset = relationship("Asset")
    assigned_technician = relationship("User", foreign_keys=[assigned_to])

class AssetAssignment(Base):
    __tablename__ = "asset_assignments"
    
    id = Column(Integer, primary_key=True, index=True)
    asset_id = Column(Integer, ForeignKey("assets.id"))
    employee_id = Column(Integer, ForeignKey("employees.id"))
    request_id = Column(Integer, ForeignKey("asset_requests.id"), nullable=True)
    
    # Assignment details
    assigned_by = Column(Integer, ForeignKey("users.id"))
    assignment_date = Column(DateTime, default=datetime.utcnow)
    return_date = Column(DateTime, nullable=True)
    condition_at_assignment = Column(String, default="good")  # excellent, good, fair, poor
    condition_at_return = Column(String, nullable=True)
    
    # Delivery tracking with photo documentation
    delivery_status = Column(String, default="pending")  # pending, in_transit, delivered, returned
    delivery_notes = Column(Text, nullable=True)
    employee_acknowledgment = Column(Boolean, default=False)
    acknowledgment_date = Column(DateTime, nullable=True)
    
    # Photo documentation
    delivery_photo_url = Column(String, nullable=True)  # Photo taken during delivery
    employee_photo_url = Column(String, nullable=True)  # Photo with employee receiving assets
    setup_completion_photo_url = Column(String, nullable=True)  # Photo of completed setup
    
    # Infrastructure setup tracking
    laptop_provided = Column(Boolean, default=False)
    email_setup_completed = Column(Boolean, default=False)
    wifi_access_configured = Column(Boolean, default=False)
    id_card_provided = Column(Boolean, default=False)
    biometric_enrolled = Column(Boolean, default=False)
    
    # Setup completion tracking
    setup_completed_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    setup_completed_at = Column(DateTime, nullable=True)
    setup_notes = Column(Text, nullable=True)
    
    asset = relationship("Asset")
    employee = relationship("Employee")
    request = relationship("AssetRequest")
    assigner = relationship("User", foreign_keys=[assigned_by])
    setup_completer = relationship("User", foreign_keys=[setup_completed_by])

class InfrastructureRequest(Base):
    __tablename__ = "infrastructure_requests"
    
    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employees.id"))
    requested_by = Column(Integer, ForeignKey("users.id"))  # HR/Admin who requested
    assigned_to = Column(Integer, ForeignKey("users.id"), nullable=True)  # Assets team member
    
    # Request details
    request_type = Column(String, default="new_employee_setup")  # new_employee_setup, additional_setup
    priority = Column(String, default="normal")  # urgent, high, normal, low
    status = Column(String, default="pending")  # pending, assigned, in_progress, completed
    
    # Infrastructure items needed
    laptop_required = Column(Boolean, default=True)
    email_setup_required = Column(Boolean, default=True)
    wifi_setup_required = Column(Boolean, default=True)
    id_card_required = Column(Boolean, default=True)
    biometric_setup_required = Column(Boolean, default=True)
    additional_requirements = Column(Text, nullable=True)
    
    # Completion tracking with photos
    laptop_provided = Column(Boolean, default=False)
    laptop_photo_url = Column(String, nullable=True)
    laptop_serial_number = Column(String, nullable=True)
    
    email_setup_completed = Column(Boolean, default=False)
    email_setup_photo_url = Column(String, nullable=True)
    email_address_created = Column(String, nullable=True)
    
    wifi_setup_completed = Column(Boolean, default=False)
    wifi_setup_photo_url = Column(String, nullable=True)
    
    id_card_provided = Column(Boolean, default=False)
    id_card_photo_url = Column(String, nullable=True)
    id_card_number = Column(String, nullable=True)
    
    biometric_setup_completed = Column(Boolean, default=False)
    biometric_setup_photo_url = Column(String, nullable=True)
    
    # Overall completion photo
    completion_photo_url = Column(String, nullable=True)
    employee_handover_photo_url = Column(String, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    assigned_at = Column(DateTime, nullable=True)
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    
    # Notes
    request_notes = Column(Text, nullable=True)
    completion_notes = Column(Text, nullable=True)
    
    employee = relationship("Employee")
    requester = relationship("User", foreign_keys=[requested_by])
    assignee = relationship("User", foreign_keys=[assigned_to])

class AssetAcknowledgment(Base):
    __tablename__ = "asset_acknowledgments"
    
    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employees.id"))
    infrastructure_request_id = Column(Integer, ForeignKey("infrastructure_requests.id"), nullable=True)
    
    # Employee Details
    employee_name = Column(String, nullable=False)
    employee_id_number = Column(String, nullable=False)
    department = Column(String, nullable=False)
    date_of_joining = Column(DateTime, nullable=False)
    
    # Received Items Acknowledgment
    laptop_received = Column(Boolean, default=False)
    laptop_serial_number = Column(String, nullable=True)
    laptop_model = Column(String, nullable=True)
    laptop_condition = Column(String, nullable=True)
    
    email_received = Column(Boolean, default=False)
    email_address = Column(String, nullable=True)
    email_password_received = Column(Boolean, default=False)
    
    wifi_access_received = Column(Boolean, default=False)
    wifi_credentials_received = Column(Boolean, default=False)
    
    id_card_received = Column(Boolean, default=False)
    id_card_number = Column(String, nullable=True)
    
    biometric_setup_completed = Column(Boolean, default=False)
    biometric_type = Column(String, nullable=True)  # fingerprint, face_recognition
    
    # Additional Items
    monitor_received = Column(Boolean, default=False)
    monitor_serial_number = Column(String, nullable=True)
    
    keyboard_received = Column(Boolean, default=False)
    mouse_received = Column(Boolean, default=False)
    
    headset_received = Column(Boolean, default=False)
    mobile_received = Column(Boolean, default=False)
    mobile_number = Column(String, nullable=True)
    
    # Login Credentials Confirmation
    system_login_working = Column(Boolean, default=False)
    email_login_working = Column(Boolean, default=False)
    vpn_access_working = Column(Boolean, default=False)
    
    # Employee Acknowledgment
    employee_signature = Column(String, nullable=True)  # Digital signature or confirmation
    acknowledgment_date = Column(DateTime, default=datetime.utcnow)
    employee_comments = Column(Text, nullable=True)
    
    # Issues Reported
    issues_reported = Column(Text, nullable=True)
    additional_requirements = Column(Text, nullable=True)
    
    # Admin Review
    reviewed_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    admin_comments = Column(Text, nullable=True)
    review_status = Column(String, default="pending")  # pending, approved, needs_action
    reviewed_at = Column(DateTime, nullable=True)
    
    # Status
    status = Column(String, default="submitted")  # submitted, under_review, completed
    created_at = Column(DateTime, default=datetime.utcnow)
    
    employee = relationship("Employee")
    infrastructure_request = relationship("InfrastructureRequest")
    reviewer = relationship("User", foreign_keys=[reviewed_by])

class AccessRequest(Base):
    __tablename__ = "access_requests"
    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employees.id"))
    system_name = Column(String) # Jira, Slack, AWS
    status = Column(String, default="pending") # pending, approved, rejected
    requested_at = Column(DateTime, default=datetime.utcnow)

    employee = relationship("Employee")

class Announcement(Base):
    __tablename__ = "announcements"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String)
    content = Column(Text)
    posted_by = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime, default=datetime.utcnow)

    author = relationship("User")

class AnnouncementAcknowledgment(Base):
    __tablename__ = "announcement_acknowledgments"
    id = Column(Integer, primary_key=True, index=True)
    announcement_id = Column(Integer, ForeignKey("announcements.id"))
    employee_id = Column(Integer, ForeignKey("employees.id"))
    acknowledged_at = Column(DateTime, default=datetime.utcnow)


# ============================================
# NEW MODELS - TALENT INTELLIGENCE SYSTEM
# ============================================

class TalentPool(Base):
    __tablename__ = "talent_pool"
    
    id = Column(Integer, primary_key=True, index=True)
    candidate_name = Column(String, nullable=False)
    candidate_email = Column(String, unique=True, nullable=False, index=True)
    phone = Column(String)
    resume_url = Column(Text)
    skills = Column(JSON, default=[])
    experience_years = Column(Integer)
    tags = Column(JSON, default=[])
    source = Column(String)
    original_application_id = Column(Integer, ForeignKey("applications.id"))
    ai_fit_score = Column(Float, default=0.0)
    added_date = Column(DateTime, default=datetime.utcnow)
    last_contacted = Column(DateTime)
    status = Column(String, default="active")
    notes = Column(Text)
    created_by = Column(Integer, ForeignKey("users.id"))
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

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

class InterviewerAvailability(Base):
    __tablename__ = "interviewer_availability"
    
    id = Column(Integer, primary_key=True, index=True)
    interviewer_id = Column(Integer, ForeignKey("users.id"))
    day_of_week = Column(Integer)
    start_time = Column(String)
    end_time = Column(String)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
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
    meeting_platform = Column(String, default="zoom")
    calendar_event_id = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    interview = relationship("Interview")

class ApplicationComment(Base):
    __tablename__ = "application_comments"
    
    id = Column(Integer, primary_key=True, index=True)
    application_id = Column(Integer, ForeignKey("applications.id"))
    user_id = Column(Integer, ForeignKey("users.id"))
    comment = Column(Text, nullable=False)
    is_internal = Column(Boolean, default=True)
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

class BulkUpload(Base):
    __tablename__ = "bulk_uploads"
    
    id = Column(Integer, primary_key=True, index=True)
    job_id = Column(Integer, ForeignKey("jobs.id"))
    uploaded_by = Column(Integer, ForeignKey("users.id"))
    total_files = Column(Integer, default=0)
    successful_parses = Column(Integer, default=0)
    failed_parses = Column(Integer, default=0)
    status = Column(String, default="processing")
    error_log = Column(JSON, default=[])
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
    parse_status = Column(String, default="pending")
    parse_error = Column(Text)
    parsed_data = Column(JSON)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    bulk_upload = relationship("BulkUpload")
    application = relationship("Application")

class Permission(Base):
    __tablename__ = "permissions"
    
    id = Column(Integer, primary_key=True, index=True)
    role = Column(String, nullable=False)
    resource = Column(String, nullable=False)
    action = Column(String, nullable=False)

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
    type = Column(String)
    subject = Column(String)
    message = Column(Text)
    status = Column(String, default="sent")
    error_message = Column(Text)
    sent_at = Column(DateTime, default=datetime.utcnow)
    
    user = relationship("User")

class InAppNotification(Base):
    __tablename__ = "in_app_notifications"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    title = Column(String)
    message = Column(Text)
    type = Column(String, default="info")  # info, warning, success, error, application, status_change
    action_url = Column(String)
    notification_data = Column(JSON)  # Store additional data as JSON (renamed from metadata)
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    read_at = Column(DateTime)
    
    user = relationship("User")

class LinkedInProfile(Base):
    __tablename__ = "linkedin_profiles"
    
    id = Column(Integer, primary_key=True, index=True)
    application_id = Column(Integer, ForeignKey("applications.id"))
    linkedin_id = Column(String, unique=True)
    profile_url = Column(Text)
    profile_data = Column(JSON)
    imported_at = Column(DateTime, default=datetime.utcnow)
    
    application = relationship("Application")

class InterviewFeedbackTemplate(Base):
    __tablename__ = "interview_feedback_templates"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    questions = Column(JSON, nullable=False)
    created_by = Column(Integer, ForeignKey("users.id"))
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    creator = relationship("User")

class InterviewFeedback(Base):
    __tablename__ = "interview_feedback"
    
    id = Column(Integer, primary_key=True, index=True)
    interview_id = Column(Integer, ForeignKey("interviews.id"))
    template_id = Column(Integer, ForeignKey("interview_feedback_templates.id"))
    responses = Column(JSON, nullable=False)
    overall_rating = Column(Integer)
    recommendation = Column(String)
    notes = Column(Text)
    submitted_by = Column(Integer, ForeignKey("users.id"))
    submitted_at = Column(DateTime, default=datetime.utcnow)
    
    interview = relationship("Interview")
    template = relationship("InterviewFeedbackTemplate")
    submitter = relationship("User")

class CandidateCommunication(Base):
    __tablename__ = "candidate_communications"
    
    id = Column(Integer, primary_key=True, index=True)
    application_id = Column(Integer, ForeignKey("applications.id"))
    type = Column(String)
    direction = Column(String)
    subject = Column(String)
    message = Column(Text)
    sent_by = Column(Integer, ForeignKey("users.id"))
    status = Column(String, default="sent")
    created_at = Column(DateTime, default=datetime.utcnow)
    
    application = relationship("Application")
    sender = relationship("User")

class ApplicationFormField(Base):
    __tablename__ = "application_form_fields"
    
    id = Column(Integer, primary_key=True, index=True)
    job_id = Column(Integer, ForeignKey("jobs.id"))
    field_name = Column(String, nullable=False)
    field_type = Column(String, nullable=False)
    field_label = Column(String, nullable=False)
    is_required = Column(Boolean, default=False)
    options = Column(JSON)
    display_order = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    job = relationship("Job")

class Referral(Base):
    __tablename__ = "referrals"
    
    id = Column(Integer, primary_key=True, index=True)
    referred_by_employee_id = Column(Integer, ForeignKey("employees.id"))
    application_id = Column(Integer, ForeignKey("applications.id"))
    referral_bonus_amount = Column(Float)
    bonus_paid = Column(Boolean, default=False)
    bonus_paid_date = Column(DateTime)
    status = Column(String, default="pending")
    created_at = Column(DateTime, default=datetime.utcnow)
    
    referrer = relationship("Employee")
    application = relationship("Application")


# ============================================
# ASSESSMENT & EXAM MODELS
# ============================================

class Assessment(Base):
    __tablename__ = "assessments"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    description = Column(Text)
    job_id = Column(Integer, ForeignKey("jobs.id"))
    duration_minutes = Column(Integer, default=60)
    passing_score = Column(Float, default=60.0)
    questions = Column(JSON)  # Array of questions
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    job = relationship("Job")

class CandidateAssessment(Base):
    __tablename__ = "candidate_assessments"
    
    id = Column(Integer, primary_key=True, index=True)
    application_id = Column(Integer, ForeignKey("applications.id"))
    assessment_id = Column(Integer, ForeignKey("assessments.id"))
    status = Column(String, default="pending")  # pending, in_progress, completed, expired
    score = Column(Float, default=0.0)
    answers = Column(JSON)  # Candidate's answers
    started_at = Column(DateTime)
    completed_at = Column(DateTime)
    deadline = Column(DateTime)
    time_taken_minutes = Column(Integer)
    
    application = relationship("Application")
    assessment = relationship("Assessment")

class ExamSession(Base):
    __tablename__ = "exam_sessions"
    
    id = Column(Integer, primary_key=True, index=True)
    application_id = Column(Integer, ForeignKey("applications.id"))
    candidate_assessment_id = Column(Integer, ForeignKey("candidate_assessments.id"))
    session_token = Column(String, unique=True)
    status = Column(String, default="active")  # active, completed, expired
    started_at = Column(DateTime, default=datetime.utcnow)
    expires_at = Column(DateTime)
    ip_address = Column(String)
    user_agent = Column(Text)
    
    application = relationship("Application")
    candidate_assessment = relationship("CandidateAssessment")
# Duplicate notification models removed - using the ones defined earlier
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class RealTimeNotification(Base):
    __tablename__ = "realtime_notifications"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    type = Column(String)  # application, interview, leave, etc.
    title = Column(String)
    message = Column(Text)
    data = Column(JSON, nullable=True)  # Additional data for the notification
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    expires_at = Column(DateTime, nullable=True)

# ============================================
# IT INFRASTRUCTURE MODELS
# ============================================

class EmployeeEmail(Base):
    __tablename__ = "employee_emails"
    
    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employees.id"))
    email_address = Column(String, unique=True, nullable=False)
    password = Column(String, nullable=False)  # Encrypted
    status = Column(String, default="active")  # active, suspended, deleted
    created_at = Column(DateTime, default=datetime.utcnow)
    last_password_change = Column(DateTime, default=datetime.utcnow)
    
    employee = relationship("Employee")

class VPNCredential(Base):
    __tablename__ = "vpn_credentials"
    
    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employees.id"))
    username = Column(String, unique=True, nullable=False)
    password = Column(String, nullable=False)  # Encrypted
    server_config = Column(JSON)  # VPN server details
    status = Column(String, default="active")  # active, suspended, revoked
    created_at = Column(DateTime, default=datetime.utcnow)
    expires_at = Column(DateTime, nullable=True)
    last_connected = Column(DateTime, nullable=True)
    
    employee = relationship("Employee")

class AccessCard(Base):
    __tablename__ = "access_cards"
    
    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employees.id"))
    card_number = Column(String, unique=True, nullable=False)
    rfid_tag = Column(String, unique=True, nullable=False)
    access_level = Column(String, default="standard")  # standard, manager, admin, security
    building_access = Column(JSON, default=[])  # List of building IDs
    floor_access = Column(JSON, default=[])  # List of floor numbers
    status = Column(String, default="active")  # active, suspended, lost, returned
    issued_date = Column(DateTime, default=datetime.utcnow)
    expiry_date = Column(DateTime, nullable=True)
    physical_delivery_status = Column(String, default="pending")  # pending, printed, delivered
    
    employee = relationship("Employee")

class ITProvisioningLog(Base):
    __tablename__ = "it_provisioning_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employees.id"))
    resource_type = Column(String, nullable=False)  # email, vpn, access_card, asset
    resource_id = Column(Integer, nullable=True)  # ID of the created resource
    action = Column(String, nullable=False)  # created, updated, suspended, deleted
    status = Column(String, default="success")  # success, failed, pending
    details = Column(JSON, nullable=True)  # Additional details about the action
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    created_by = Column(Integer, ForeignKey("users.id"))
    
    employee = relationship("Employee")
    created_by_user = relationship("User")

# ============================================
# ONBOARDING APPROVAL WORKFLOW MODELS
# ============================================

class OnboardingApproval(Base):
    __tablename__ = "onboarding_approvals"
    
    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employees.id"))
    approval_stage = Column(String, nullable=False)  # compliance_review, it_provisioning, final_activation
    status = Column(String, default="pending")  # pending, approved, rejected, in_progress
    reviewed_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    review_notes = Column(Text, nullable=True)
    approved_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Compliance-specific fields (Phase 3: The Compliance Gate)
    form_data_locked = Column(Boolean, default=False)
    documents_verified = Column(Boolean, default=False)
    background_check_status = Column(String, default="pending")  # pending, passed, failed
    ocr_verification_complete = Column(Boolean, default=False)
    admin_review_complete = Column(Boolean, default=False)
    
    # Gatekeeper model: IT provisioning only after compliance approval
    it_ticket_id = Column(String, nullable=True)
    it_provisioning_status = Column(String, default="not_started")  # not_started, requested, in_progress, completed, failed
    compliance_approved_at = Column(DateTime, nullable=True)  # When compliance gate was passed
    
    employee = relationship("Employee")
    reviewer = relationship("User")

class ITProvisioningTicket(Base):
    __tablename__ = "it_provisioning_tickets"
    
    id = Column(Integer, primary_key=True, index=True)
    ticket_number = Column(String, unique=True, nullable=False)
    employee_id = Column(Integer, ForeignKey("employees.id"))
    approval_id = Column(Integer, ForeignKey("onboarding_approvals.id"))
    
    # Employee verified data (locked after approval)
    verified_full_name = Column(String, nullable=False)
    verified_email_prefix = Column(String, nullable=False)
    verified_department = Column(String, nullable=False)
    verified_position = Column(String, nullable=False)
    
    # IT provisioning details
    priority = Column(String, default="normal")  # urgent, high, normal, low
    requested_resources = Column(JSON, default={})  # email, vpn, access_card, hardware
    
    # Status tracking
    status = Column(String, default="open")  # open, in_progress, completed, cancelled
    assigned_to = Column(Integer, ForeignKey("users.id"), nullable=True)
    
    # Progress tracking
    email_created = Column(Boolean, default=False)
    vpn_created = Column(Boolean, default=False)
    access_card_created = Column(Boolean, default=False)
    hardware_assigned = Column(Boolean, default=False)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    assigned_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    
    # Notes and communication
    it_notes = Column(Text, nullable=True)
    employee_instructions = Column(Text, nullable=True)
    
    employee = relationship("Employee")
    approval = relationship("OnboardingApproval")
    assigned_it_admin = relationship("User")

class OnboardingStatusLog(Base):
    __tablename__ = "onboarding_status_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employees.id"))
    stage = Column(String, nullable=False)
    status = Column(String, nullable=False)
    message = Column(Text, nullable=True)
    changed_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    employee = relationship("Employee")
    user = relationship("User")