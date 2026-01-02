from typing import Optional, List, Dict, Any
from datetime import datetime, date
from pydantic import BaseModel, ConfigDict

# --- Auth Schemas ---

class UserBase(BaseModel):
    email: str
    role: str = "employee"

class UserCreate(UserBase):
    password: str

class UserOut(UserBase):
    id: int
    is_active: bool

    model_config = ConfigDict(from_attributes=True)

class UserUpdate(BaseModel):
    email: Optional[str] = None
    full_name: Optional[str] = None
    phone: Optional[str] = None
    department: Optional[str] = None
    position: Optional[str] = None

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None

# --- Recruitment Schemas ---

class JobBase(BaseModel):
    title: str
    description: str
    department: str
    location: str
    workflow_mode: str = "flexible"
    requisition_status: str = "approved"

class JobCreate(JobBase):
    pass

class JobOut(JobBase):
    id: int
    posted_date: datetime
    is_active: bool
    current_step: int
    sourcing_config: Optional[str] = "{}"
    application_link_code: Optional[str] = None
    qr_code_url: Optional[str] = None
    allow_linkedin_apply: Optional[bool] = False
    allow_bulk_upload: Optional[bool] = True
    blind_hiring_enabled: Optional[bool] = False
    required_skills: Optional[List] = []
    min_experience_years: Optional[int] = None
    max_experience_years: Optional[int] = None
    salary_range_min: Optional[float] = None
    salary_range_max: Optional[float] = None
    remote_allowed: Optional[bool] = False
    hiring_manager_id: Optional[int] = None

    model_config = ConfigDict(from_attributes=True)

class ApplicationBase(BaseModel):
    candidate_name: str
    candidate_email: str
    resume_url: str

class ApplicationCreate(ApplicationBase):
    pass


class SourcedCandidateCreate(BaseModel):
    name: str
    email: str
    source: str
    match_score: float
    profile_url: str

class ApplicationOut(ApplicationBase):
    id: int
    job_id: int
    status: str
    applied_date: datetime
    ai_fit_score: float

    model_config = ConfigDict(from_attributes=True)

class InterviewBase(BaseModel):
    scheduled_time: datetime
    meeting_link: Optional[str] = None

class InterviewCreate(InterviewBase):
    application_id: int
    interviewer_id: int

class InterviewOut(InterviewBase):
    id: int
    application_id: int
    interviewer_id: int
    status: str

    model_config = ConfigDict(from_attributes=True)

class JDOptimizeRequest(BaseModel):
    description: str

# --- AI Interview Schemas ---

class AIInterviewCreate(BaseModel):
    application_id: int

class AIInterviewLogBase(BaseModel):
    question: str
    candidate_response: str

class AIInterviewLogOut(AIInterviewLogBase):
    id: int
    ai_evaluation: str
    score: float
    sentiment: str
    timestamp: datetime

    model_config = ConfigDict(from_attributes=True)

class AIInterviewOut(BaseModel):
    id: int
    application_id: int
    status: str
    overall_score: float
    emotional_tone: Optional[str]
    logs: List[AIInterviewLogOut] = []

    model_config = ConfigDict(from_attributes=True)

class AIResponseRequest(BaseModel):
    interview_id: int
    candidate_response: str

# --- Attendance Schemas ---

class ShiftBase(BaseModel):
    name: str
    start_time: str
    end_time: str

class ShiftCreate(ShiftBase):
    pass

class ShiftOut(ShiftBase):
    id: int

    model_config = ConfigDict(from_attributes=True)

# --- WFH Request Schemas ---

class WFHRequestBase(BaseModel):
    request_date: datetime
    reason: str

class WFHRequestCreate(WFHRequestBase):
    pass

class WFHRequestOut(WFHRequestBase):
    id: int
    employee_id: int
    status: str
    manager_id: Optional[int]
    manager_comments: Optional[str]
    created_at: datetime
    reviewed_at: Optional[datetime]

    model_config = ConfigDict(from_attributes=True)

class WFHRequestApproval(BaseModel):
    status: str  # approved, rejected
    comments: Optional[str] = None

# --- Attendance Schemas ---

class AttendanceBase(BaseModel):
    status: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    photo_base64: Optional[str] = None  # Base64 encoded photo
    verification_method: str = "photo"
    work_mode: str = "office"

class AttendanceCreate(AttendanceBase):
    pass

class AttendanceOut(BaseModel):
    id: int
    employee_id: int
    date: datetime
    status: str
    check_in: Optional[datetime]
    check_out: Optional[datetime]
    latitude: Optional[float]
    longitude: Optional[float]
    photo_url: Optional[str]
    location_address: Optional[str]
    verification_method: str
    is_fraud_suspected: bool
    flagged_reason: Optional[str]
    work_mode: str
    wfh_request_id: Optional[int]
    requires_approval: bool
    approval_status: str
    shift_id: Optional[int]
    shift: Optional[ShiftOut]

    model_config = ConfigDict(from_attributes=True)

# --- Leave Schemas ---

class LeaveRequestBase(BaseModel):
    start_date: datetime
    end_date: datetime
    reason: str

class LeaveRequestCreate(LeaveRequestBase):
    pass

class LeaveRequestOut(LeaveRequestBase):
    id: int
    employee_id: int
    status: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class LeaveRequestWithEmployee(LeaveRequestOut):
    employee: Optional['EmployeeOut'] = None

    model_config = ConfigDict(from_attributes=True)

# --- Payroll Schemas ---

class PayrollBase(BaseModel):
    month: str
    basic_salary: float = 0.0
    hra: float = 0.0
    transport_allowance: float = 0.0
    medical_allowance: float = 0.0
    special_allowance: float = 0.0
    bonus: float = 0.0
    overtime_amount: float = 0.0
    other_allowances: float = 0.0
    pf: float = 0.0
    esi: float = 0.0
    professional_tax: float = 0.0
    income_tax: float = 0.0
    loan_deduction: float = 0.0
    other_deductions: float = 0.0
    total_working_days: int = 0
    actual_working_days: int = 0
    leave_days: int = 0
    overtime_hours: float = 0.0
    gross_salary: float = 0.0
    total_deductions: float = 0.0
    net_salary: float = 0.0
    status: str = "draft"

class PayrollCreate(PayrollBase):
    employee_id: int

class PayrollOut(PayrollBase):
    id: int
    employee_id: int
    calculated_by: Optional[int] = None
    approved_by: Optional[int] = None
    payment_date: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    calculation_notes: Optional[str] = None
    manual_adjustments: Optional[Dict[str, Any]] = {}

    model_config = ConfigDict(from_attributes=True)

class SalaryStructureBase(BaseModel):
    basic_salary: float
    hra: float
    transport_allowance: float = 0.0
    medical_allowance: float = 0.0
    special_allowance: float = 0.0
    other_allowances: float = 0.0

class SalaryStructureCreate(SalaryStructureBase):
    employee_id: int
    effective_date: Optional[datetime] = None

class SalaryStructureOut(SalaryStructureBase):
    id: int
    employee_id: int
    effective_date: datetime
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

class SalaryRevisionBase(BaseModel):
    previous_ctc: float
    new_ctc: float
    reason: Optional[str] = None
    effective_date: Optional[datetime] = None

class SalaryRevisionCreate(SalaryRevisionBase):
    employee_id: int

class SalaryRevisionOut(SalaryRevisionBase):
    id: int
    employee_id: int
    revision_date: datetime
    approved_by: Optional[int] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class PayslipData(BaseModel):
    payroll_id: int
    employee: Dict[str, Any]
    payroll_period: Dict[str, Any]
    earnings: Dict[str, float]
    deductions: Dict[str, float]
    summary: Dict[str, float]
    status: str
    generated_on: str
    manual_adjustments: Optional[Dict[str, Any]] = {}

class PayrollSummary(BaseModel):
    month: str
    total_employees: int
    total_gross_salary: float
    total_deductions: float
    total_net_salary: float
    status_breakdown: Dict[str, int]
    component_breakdown: Dict[str, float]

class PayrollConfiguration(BaseModel):
    config_key: str
    config_value: Dict[str, Any]
    description: Optional[str] = None

class TaxSlabOut(BaseModel):
    id: int
    financial_year: str
    min_income: float
    max_income: Optional[float]
    tax_rate: float
    is_active: bool

    model_config = ConfigDict(from_attributes=True)

class DeductionRuleOut(BaseModel):
    id: int
    rule_name: str
    rule_type: str
    rule_config: Dict[str, Any]
    is_active: bool

    model_config = ConfigDict(from_attributes=True)

class SalaryRevisionOut(BaseModel):
    id: int
    employee_id: int
    previous_ctc: float
    new_ctc: float
    revision_date: datetime
    reason: str

    model_config = ConfigDict(from_attributes=True)

# --- Employee Schemas ---

class EmployeeBase(BaseModel):
    first_name: str
    last_name: str
    department: str
    position: Optional[str] = None
    date_of_joining: Optional[datetime] = None
    pan_number: Optional[str] = None
    aadhaar_number: Optional[str] = None
    profile_summary: Optional[str] = None

class EmployeeCreate(EmployeeBase):
    user_id: int

class EmployeeUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    department: Optional[str] = None
    position: Optional[str] = None
    date_of_joining: Optional[datetime] = None
    pan_number: Optional[str] = None
    aadhaar_number: Optional[str] = None
    profile_summary: Optional[str] = None

class EmployeeDocumentOut(BaseModel):
    id: int
    document_type: str
    document_url: str
    uploaded_at: datetime
    is_verified: bool
    ocr_confidence: float
    rejection_reason: Optional[str]
    verified_by: Optional[int]
    verified_at: Optional[datetime]

    model_config = ConfigDict(from_attributes=True)

class EmployeeOut(EmployeeBase):
    id: int
    user_id: int
    is_immediate_joiner: bool
    onboarding_status: str
    it_setup_status: str
    documents: List[EmployeeDocumentOut] = []
    user: Optional[UserOut] = None
    
    model_config = ConfigDict(from_attributes=True)


# --- Performance Schemas ---

class PerformanceReviewBase(BaseModel):
    rating: float
    comments: str

class PerformanceReviewCreate(PerformanceReviewBase):
    employee_id: int

class PerformanceReviewOut(PerformanceReviewBase):
    id: int
    employee_id: int
    reviewer_id: int
    review_date: datetime
    review_type: str
    sentiment_score: float
    sentiment_label: Optional[str]
    themes: str
    ai_feedback_summary: Optional[str]
    kpi_score: float
    project_score: float
    peer_score: float
    final_predicted_score: float

    model_config = ConfigDict(from_attributes=True)

class PerformancePredictionRequest(BaseModel):
    employee_id: int
    kpi_completed: int
    total_kpis: int
    projects_completed: int
    project_success_rate: float
    peer_rating: float

class FeedbackGenerationRequest(BaseModel):
    employee_id: int
    role: str
    period: str
    technical_score: float
    communication_score: float
    teamwork_score: float
    leadership_score: float
    notes: Optional[str] = None

# --- Engagement Schemas ---

class SurveyBase(BaseModel):
    title: str
    description: str
    status: str = "active"

class SurveyCreate(SurveyBase):
    pass

class SurveyOut(SurveyBase):
    id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class SurveyResponseBase(BaseModel):
    response_data: str

class SurveyResponseCreate(SurveyResponseBase):
    pass

class SurveyResponseOut(SurveyResponseBase):
    id: int
    survey_id: int
    employee_id: int
    submitted_at: datetime
    sentiment_score: float
    stress_level: int
    engagement_score: int

    model_config = ConfigDict(from_attributes=True)

class EngagementAnalysisRequest(BaseModel):
    source: str
    text: str

class AttritionPredictionRequest(BaseModel):
    employee_id: int
    no_promotion_years: int
    below_market_salary: bool
    engagement_score: int
    job_search_activity: bool
    workload_hours: int
    team_conflicts: bool
    declined_projects: int
    satisfaction_score: int

# --- Learning Schemas ---

class CourseBase(BaseModel):
    title: str
    instructor: str
    duration: str
    description: str

class CourseCreate(CourseBase):
    pass

class CourseOut(CourseBase):
    id: int

    model_config = ConfigDict(from_attributes=True)

class EnrollmentBase(BaseModel):
    progress: int = 0

class EnrollmentCreate(EnrollmentBase):
    pass

class EnrollmentOut(EnrollmentBase):
    id: int
    course_id: int
    employee_id: int
    enrolled_at: datetime
    course: CourseOut

    model_config = ConfigDict(from_attributes=True)

class SkillGapRequest(BaseModel):
    employee_id: int
    current_role: str
    target_role: Optional[str] = None

class TrainingRecommendationRequest(BaseModel):
    employee_id: int
    current_skills: str
    career_goal: str

class LearningOutcomeRequest(BaseModel):
    employee_id: int
    target_skill: str

# --- Onboarding Schemas ---

class OnboardingTaskBase(BaseModel):
    task_name: str
    description: str
    is_completed: bool = False

class OnboardingTaskCreate(OnboardingTaskBase):
    pass

class OnboardingTaskOut(OnboardingTaskBase):
    id: int
    employee_id: int
    completed_at: Optional[datetime]

    model_config = ConfigDict(from_attributes=True)

class OfferLetterOut(BaseModel):
    id: int
    content: str
    is_signed: bool
    signed_at: Optional[datetime]

    model_config = ConfigDict(from_attributes=True)

class InductionModuleOut(BaseModel):
    id: int
    title: str
    video_url: str
    description: str

    model_config = ConfigDict(from_attributes=True)

# --- New Feature Schemas ---

class LeaveBalanceOut(BaseModel):
    id: int
    leave_type: str
    balance: int
    model_config = ConfigDict(from_attributes=True)

class HolidayOut(BaseModel):
    id: int
    date: date
    name: str
    type: str
    is_optional: bool = False
    model_config = ConfigDict(from_attributes=True)

class HolidayCreate(BaseModel):
    name: str
    date: date
    type: str = "public"
    is_optional: bool = False

class GoalBase(BaseModel):
    title: str
    description: str
    due_date: datetime

class GoalCreate(GoalBase):
    pass

class GoalOut(GoalBase):
    id: int
    employee_id: int
    status: str
    model_config = ConfigDict(from_attributes=True)

class FeedbackCreate(BaseModel):
    employee_id: int
    content: str
    type: str

class FeedbackOut(BaseModel):
    id: int
    reviewer_id: int
    content: str
    type: str
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

class SkillOut(BaseModel):
    id: int
    name: str
    model_config = ConfigDict(from_attributes=True)

class EmployeeSkillOut(BaseModel):
    id: int
    skill: SkillOut
    proficiency: int
    model_config = ConfigDict(from_attributes=True)

class AssetOut(BaseModel):
    id: int
    name: str
    type: str
    serial_number: str
    status: str
    assigned_to: Optional[int]
    model_config = ConfigDict(from_attributes=True)

class AccessRequestCreate(BaseModel):
    system_name: str

class AccessRequestOut(BaseModel):
    id: int
    system_name: str
    status: str
    requested_at: datetime
    model_config = ConfigDict(from_attributes=True)

class AnnouncementCreate(BaseModel):
    title: str
    content: str

class AnnouncementOut(BaseModel):
    id: int
    title: str
    content: str
    posted_by: int
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


# --- Engagement Schemas ---

class RecognitionCreate(BaseModel):
    recipient_id: int
    message: str
    badge: str

class FeedbackCreate(BaseModel):
    text: str
    category: str
    anonymous: bool = True

class PulseSurveyCreate(BaseModel):
    mood: str
    comment: Optional[str] = None

class WellnessCheckinCreate(BaseModel):
    score: int
    notes: Optional[str] = None


# --- YouTube Learning Hub Schemas ---

class YouTubeVideoCreate(BaseModel):
    url: str
    title: str
    description: Optional[str] = None
    category: Optional[str] = None
    difficulty: Optional[str] = "Beginner"  # Beginner, Intermediate, Advanced
    tags: Optional[List[str]] = []
    target_roles: Optional[List[str]] = []  # e.g., ["Software Engineer", "Data Analyst"]
    target_skills: Optional[List[str]] = []  # e.g., ["Python", "Cloud"]


# --- Face Recognition Schemas ---

class ProfileImageUpload(BaseModel):
    image: str  # Base64 encoded image

class AttendanceWithFaceRecognition(BaseModel):
    attendance_image: str  # Base64 encoded image
    location: Optional[str] = None

# --- Learning & Development Schemas ---

class TrainingRecommendationRequest(BaseModel):
    employee_id: int
    current_skills: str = ""
    career_goal: str

class LearningOutcomeRequest(BaseModel):
    employee_id: int
    target_skill: str

class SkillGapRequest(BaseModel):
    current_role: str
    target_role: Optional[str] = None

class YouTubeVideoCreate(BaseModel):
    url: str
    title: str
    description: str = ""
    category: str = ""
    difficulty: str = "Beginner"
    tags: List[str] = []
    target_roles: List[str] = []
    target_skills: List[str] = []

# --- IT Infrastructure Schemas ---

class EmployeeEmailOut(BaseModel):
    id: int
    employee_id: int
    email_address: str
    status: str
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

class VPNCredentialOut(BaseModel):
    id: int
    employee_id: int
    username: str
    server_config: dict
    status: str
    created_at: datetime
    expires_at: Optional[datetime] = None
    model_config = ConfigDict(from_attributes=True)

class AccessCardOut(BaseModel):
    id: int
    employee_id: int
    card_number: str
    access_level: str
    building_access: List[str]
    floor_access: List[int]
    status: str
    issued_date: datetime
    expiry_date: Optional[datetime] = None
    physical_delivery_status: str
    model_config = ConfigDict(from_attributes=True)

class ITProvisioningLogOut(BaseModel):
    id: int
    employee_id: int
    resource_type: str
    resource_id: Optional[int] = None
    action: str
    status: str
    details: Optional[dict] = None
    error_message: Optional[str] = None
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

class ITProvisioningRequest(BaseModel):
    employee_id: int
    provision_email: bool = True
    provision_vpn: bool = True
    provision_access_card: bool = True
    assign_assets: bool = True
    access_level: str = "standard"
    building_access: List[str] = []
    floor_access: List[int] = []

class ITProvisioningResponse(BaseModel):
    success: bool
    message: str
    provisioned_resources: dict
    failed_resources: List[str] = []
    logs: List[ITProvisioningLogOut] = []

# ---
# Onboarding Approval Workflow Schemas ---

class OnboardingApprovalOut(BaseModel):
    id: int
    employee_id: int
    approval_stage: str
    status: str
    reviewed_by: Optional[int] = None
    review_notes: Optional[str] = None
    approved_at: Optional[datetime] = None
    form_data_locked: bool
    documents_verified: bool
    background_check_status: str
    ocr_verification_complete: bool
    admin_review_complete: bool
    it_provisioning_status: str
    compliance_approved_at: Optional[datetime] = None
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

class ComplianceReviewRequest(BaseModel):
    employee_id: int
    documents_verified: bool
    background_check_passed: bool
    ocr_verification_complete: bool = True
    review_notes: Optional[str] = None

class ApproveAndRequestITRequest(BaseModel):
    employee_id: int
    verified_full_name: str
    verified_email_prefix: str
    verified_department: str
    verified_position: str
    priority: str = "normal"
    review_notes: Optional[str] = None

class ITProvisioningTicketOut(BaseModel):
    id: int
    ticket_number: str
    employee_id: int
    verified_full_name: str
    verified_email_prefix: str
    status: str
    priority: str
    email_created: bool
    vpn_created: bool
    access_card_created: bool
    hardware_assigned: bool
    created_at: datetime
    assigned_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    it_notes: Optional[str] = None
    employee_instructions: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)

class OnboardingStatusResponse(BaseModel):
    current_phase: int
    phase_name: str
    status: str
    can_proceed: bool
    next_action: Optional[str] = None
    blocking_issues: List[str] = []
    progress_percentage: int
    compliance_gate_status: str  # "pending", "approved", "rejected"
    it_provisioning_status: str

# --- Attendance Correction Schemas ---

class AttendanceCorrectionCreate(BaseModel):
    attendance_id: int
    requested_check_in: Optional[datetime] = None
    requested_check_out: Optional[datetime] = None
    reason: str

class AttendanceCorrectionOut(BaseModel):
    id: int
    attendance_id: int
    employee_id: int
    requested_check_in: Optional[datetime]
    requested_check_out: Optional[datetime]
    reason: str
    status: str
    manager_comments: Optional[str]
    reviewed_by: Optional[int]
    reviewed_at: Optional[datetime]
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

class AttendanceCorrectionApproval(BaseModel):
    status: str  # approved, rejected
    comments: Optional[str] = None

# --- Leave Integration Schemas ---

class LeaveAttendanceCreate(BaseModel):
    leave_request_id: int

# --- Bulk Operations Schemas ---

class BulkAttendanceRecord(BaseModel):
    employee_id: int
    date: date
    status: str
    work_mode: Optional[str] = "office"

class BulkAttendanceCreate(BaseModel):
    attendance_records: List[BulkAttendanceRecord]

# --- Shift Management Schemas ---

class ShiftOut(BaseModel):
    id: int
    name: str
    start_time: str
    end_time: str
    model_config = ConfigDict(from_attributes=True)

class ShiftAssignmentCreate(BaseModel):
    employee_id: int
    shift_id: int