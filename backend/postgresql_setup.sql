-- ============================================
-- AI HR Management System - PostgreSQL Database Setup
-- ============================================
-- Run this script in PgAdmin to create all tables
-- ============================================

-- Create Database (Run this separately first)
-- CREATE DATABASE hr_management_system;

-- Connect to the database and run the following:

-- ============================================
-- 1. USERS TABLE
-- ============================================
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    hashed_password VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    role VARCHAR(50) DEFAULT 'employee' -- admin, hr, employee, candidate
);

CREATE INDEX idx_users_email ON users(email);

-- ============================================
-- 2. JOBS TABLE
-- ============================================
CREATE TABLE jobs (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    department VARCHAR(100),
    location VARCHAR(255),
    posted_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    workflow_mode VARCHAR(50) DEFAULT 'flexible', -- mandatory, flexible, smart
    current_step INTEGER DEFAULT 0, -- 0-11
    requisition_status VARCHAR(50) DEFAULT 'approved', -- draft, pending, approved, published
    sourcing_config TEXT DEFAULT '{}'
);

CREATE INDEX idx_jobs_title ON jobs(title);

-- ============================================
-- 3. APPLICATIONS TABLE
-- ============================================
CREATE TABLE applications (
    id SERIAL PRIMARY KEY,
    job_id INTEGER REFERENCES jobs(id) ON DELETE CASCADE,
    candidate_name VARCHAR(255) NOT NULL,
    candidate_email VARCHAR(255) NOT NULL,
    resume_url VARCHAR(500),
    status VARCHAR(50) DEFAULT 'applied', -- applied, screening, interview, offer, hired, rejected
    applied_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ai_fit_score FLOAT DEFAULT 0.0
);

CREATE INDEX idx_applications_job_id ON applications(job_id);
CREATE INDEX idx_applications_status ON applications(status);

-- ============================================
-- 4. EMPLOYEES TABLE
-- ============================================
CREATE TABLE employees (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    department VARCHAR(100),
    position VARCHAR(100),
    date_of_joining TIMESTAMP,
    pan_number VARCHAR(20),
    aadhaar_number VARCHAR(20),
    profile_summary TEXT,
    wfh_status VARCHAR(20) DEFAULT 'office', -- office, wfh
    is_immediate_joiner BOOLEAN DEFAULT FALSE,
    onboarding_status VARCHAR(50) DEFAULT 'initiated', -- initiated, manager_prep, it_setup, compliance, induction, completed
    it_setup_status VARCHAR(50) DEFAULT 'pending' -- pending, ready
);

CREATE INDEX idx_employees_user_id ON employees(user_id);
CREATE INDEX idx_employees_department ON employees(department);

-- ============================================
-- 5. INTERVIEWS TABLE
-- ============================================
CREATE TABLE interviews (
    id SERIAL PRIMARY KEY,
    application_id INTEGER REFERENCES applications(id) ON DELETE CASCADE,
    interviewer_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    scheduled_time TIMESTAMP NOT NULL,
    meeting_link VARCHAR(500),
    status VARCHAR(50) DEFAULT 'scheduled' -- scheduled, completed, cancelled
);

CREATE INDEX idx_interviews_application_id ON interviews(application_id);

-- ============================================
-- 6. AI INTERVIEWS TABLE
-- ============================================
CREATE TABLE ai_interviews (
    id SERIAL PRIMARY KEY,
    application_id INTEGER REFERENCES applications(id) ON DELETE CASCADE,
    status VARCHAR(50) DEFAULT 'pending', -- pending, in_progress, completed
    overall_score FLOAT DEFAULT 0.0,
    emotional_tone VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_ai_interviews_application_id ON ai_interviews(application_id);

-- ============================================
-- 7. AI INTERVIEW LOGS TABLE
-- ============================================
CREATE TABLE ai_interview_logs (
    id SERIAL PRIMARY KEY,
    interview_id INTEGER REFERENCES ai_interviews(id) ON DELETE CASCADE,
    question TEXT,
    candidate_response TEXT,
    ai_evaluation TEXT,
    score FLOAT,
    sentiment VARCHAR(50),
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_ai_interview_logs_interview_id ON ai_interview_logs(interview_id);

-- ============================================
-- 8. EMPLOYEE DOCUMENTS TABLE
-- ============================================
CREATE TABLE employee_documents (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER REFERENCES employees(id) ON DELETE CASCADE,
    document_type VARCHAR(100) NOT NULL, -- PAN, Aadhaar, Offer Letter, etc.
    document_url VARCHAR(500) NOT NULL,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_verified BOOLEAN DEFAULT FALSE,
    ocr_confidence FLOAT DEFAULT 0.0,
    rejection_reason VARCHAR(500)
);

CREATE INDEX idx_employee_documents_employee_id ON employee_documents(employee_id);

-- ============================================
-- 9. OFFER LETTERS TABLE
-- ============================================
CREATE TABLE offer_letters (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER REFERENCES employees(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    is_signed BOOLEAN DEFAULT FALSE,
    signed_at TIMESTAMP
);

-- ============================================
-- 10. INDUCTION MODULES TABLE
-- ============================================
CREATE TABLE induction_modules (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    video_url VARCHAR(500),
    description TEXT
);

-- ============================================
-- 11. LEAVE REQUESTS TABLE
-- ============================================
CREATE TABLE leave_requests (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER REFERENCES employees(id) ON DELETE CASCADE,
    start_date TIMESTAMP NOT NULL,
    end_date TIMESTAMP NOT NULL,
    reason TEXT,
    status VARCHAR(50) DEFAULT 'pending', -- pending, approved, rejected
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_leave_requests_employee_id ON leave_requests(employee_id);
CREATE INDEX idx_leave_requests_status ON leave_requests(status);

-- ============================================
-- 12. PAYROLL TABLE
-- ============================================
CREATE TABLE payroll (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER REFERENCES employees(id) ON DELETE CASCADE,
    month VARCHAR(20) NOT NULL, -- e.g., "2023-11"
    basic_salary FLOAT NOT NULL,
    allowances FLOAT DEFAULT 0.0,
    deductions FLOAT DEFAULT 0.0,
    pf FLOAT DEFAULT 0.0,
    tax FLOAT DEFAULT 0.0,
    net_salary FLOAT NOT NULL,
    payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(50) DEFAULT 'processed' -- processed, paid
);

CREATE INDEX idx_payroll_employee_id ON payroll(employee_id);
CREATE INDEX idx_payroll_month ON payroll(month);

-- ============================================
-- 13. SALARY STRUCTURES TABLE
-- ============================================
CREATE TABLE salary_structures (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER REFERENCES employees(id) ON DELETE CASCADE,
    basic_salary FLOAT NOT NULL,
    hra FLOAT DEFAULT 0.0,
    other_allowances FLOAT DEFAULT 0.0,
    effective_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 14. SALARY REVISIONS TABLE
-- ============================================
CREATE TABLE salary_revisions (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER REFERENCES employees(id) ON DELETE CASCADE,
    previous_ctc FLOAT NOT NULL,
    new_ctc FLOAT NOT NULL,
    revision_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    reason VARCHAR(500)
);

-- ============================================
-- 15. PERFORMANCE REVIEWS TABLE
-- ============================================
CREATE TABLE performance_reviews (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER REFERENCES employees(id) ON DELETE CASCADE,
    reviewer_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    rating FLOAT NOT NULL,
    comments TEXT,
    review_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    review_type VARCHAR(50) DEFAULT 'manager', -- self, peer, manager, 360
    sentiment_score FLOAT DEFAULT 0.0,
    sentiment_label VARCHAR(50),
    themes TEXT DEFAULT '[]',
    ai_feedback_summary TEXT,
    kpi_score FLOAT DEFAULT 0.0,
    project_score FLOAT DEFAULT 0.0,
    peer_score FLOAT DEFAULT 0.0,
    final_predicted_score FLOAT DEFAULT 0.0
);

CREATE INDEX idx_performance_reviews_employee_id ON performance_reviews(employee_id);

-- ============================================
-- 16. SURVEYS TABLE
-- ============================================
CREATE TABLE surveys (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'active', -- active, closed
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 17. SURVEY RESPONSES TABLE
-- ============================================
CREATE TABLE survey_responses (
    id SERIAL PRIMARY KEY,
    survey_id INTEGER REFERENCES surveys(id) ON DELETE CASCADE,
    employee_id INTEGER REFERENCES employees(id) ON DELETE CASCADE,
    response_data TEXT,
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    sentiment_score FLOAT DEFAULT 0.0,
    stress_level INTEGER DEFAULT 0,
    engagement_score INTEGER DEFAULT 0
);

CREATE INDEX idx_survey_responses_survey_id ON survey_responses(survey_id);
CREATE INDEX idx_survey_responses_employee_id ON survey_responses(employee_id);

-- ============================================
-- 18. COURSES TABLE
-- ============================================
CREATE TABLE courses (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    instructor VARCHAR(255),
    duration VARCHAR(100),
    description TEXT
);

-- ============================================
-- 19. ENROLLMENTS TABLE
-- ============================================
CREATE TABLE enrollments (
    id SERIAL PRIMARY KEY,
    course_id INTEGER REFERENCES courses(id) ON DELETE CASCADE,
    employee_id INTEGER REFERENCES employees(id) ON DELETE CASCADE,
    progress INTEGER DEFAULT 0, -- 0-100
    enrolled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_enrollments_course_id ON enrollments(course_id);
CREATE INDEX idx_enrollments_employee_id ON enrollments(employee_id);

-- ============================================
-- 20. ONBOARDING TASKS TABLE
-- ============================================
CREATE TABLE onboarding_tasks (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER REFERENCES employees(id) ON DELETE CASCADE,
    task_name VARCHAR(255) NOT NULL,
    description TEXT,
    is_completed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMP
);

CREATE INDEX idx_onboarding_tasks_employee_id ON onboarding_tasks(employee_id);

-- ============================================
-- 21. SHIFTS TABLE
-- ============================================
CREATE TABLE shifts (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    start_time VARCHAR(10) NOT NULL, -- "09:00"
    end_time VARCHAR(10) NOT NULL -- "18:00"
);

-- ============================================
-- 22. ATTENDANCE TABLE
-- ============================================
CREATE TABLE attendance (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER REFERENCES employees(id) ON DELETE CASCADE,
    date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(50) NOT NULL, -- present, absent, leave, late
    check_in TIMESTAMP,
    check_out TIMESTAMP,
    latitude FLOAT,
    longitude FLOAT,
    verification_method VARCHAR(50) DEFAULT 'manual', -- face, manual
    is_fraud_suspected BOOLEAN DEFAULT FALSE,
    work_mode VARCHAR(20) DEFAULT 'office', -- office, wfh
    face_confidence FLOAT DEFAULT 0.0,
    liveness_check_passed BOOLEAN DEFAULT FALSE,
    dress_code_passed BOOLEAN DEFAULT FALSE,
    shift_id INTEGER REFERENCES shifts(id) ON DELETE SET NULL
);

CREATE INDEX idx_attendance_employee_id ON attendance(employee_id);
CREATE INDEX idx_attendance_date ON attendance(date);

-- ============================================
-- 23. LEAVE BALANCES TABLE
-- ============================================
CREATE TABLE leave_balances (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER REFERENCES employees(id) ON DELETE CASCADE,
    leave_type VARCHAR(50) NOT NULL, -- Sick, Casual, Earned
    balance INTEGER DEFAULT 0
);

CREATE INDEX idx_leave_balances_employee_id ON leave_balances(employee_id);

-- ============================================
-- 24. HOLIDAYS TABLE
-- ============================================
CREATE TABLE holidays (
    id SERIAL PRIMARY KEY,
    date TIMESTAMP NOT NULL,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL -- Public, Optional
);

-- ============================================
-- 25. GOALS TABLE
-- ============================================
CREATE TABLE goals (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER REFERENCES employees(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'pending', -- pending, in_progress, completed
    due_date TIMESTAMP
);

CREATE INDEX idx_goals_employee_id ON goals(employee_id);

-- ============================================
-- 26. FEEDBACKS TABLE
-- ============================================
CREATE TABLE feedbacks (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER REFERENCES employees(id) ON DELETE CASCADE,
    reviewer_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    content TEXT NOT NULL,
    type VARCHAR(50) NOT NULL, -- 360, Manager, Peer
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_feedbacks_employee_id ON feedbacks(employee_id);

-- ============================================
-- 27. SKILLS TABLE
-- ============================================
CREATE TABLE skills (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) UNIQUE NOT NULL
);

-- ============================================
-- 28. EMPLOYEE SKILLS TABLE
-- ============================================
CREATE TABLE employee_skills (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER REFERENCES employees(id) ON DELETE CASCADE,
    skill_id INTEGER REFERENCES skills(id) ON DELETE CASCADE,
    proficiency INTEGER NOT NULL -- 1-10
);

CREATE INDEX idx_employee_skills_employee_id ON employee_skills(employee_id);

-- ============================================
-- 29. ASSETS TABLE
-- ============================================
CREATE TABLE assets (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(100) NOT NULL, -- Laptop, Mobile, Monitor
    serial_number VARCHAR(255) UNIQUE NOT NULL,
    assigned_to INTEGER REFERENCES employees(id) ON DELETE SET NULL,
    status VARCHAR(50) DEFAULT 'available' -- available, assigned, maintenance
);

-- ============================================
-- 30. ACCESS REQUESTS TABLE
-- ============================================
CREATE TABLE access_requests (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER REFERENCES employees(id) ON DELETE CASCADE,
    system_name VARCHAR(255) NOT NULL, -- Jira, Slack, AWS
    status VARCHAR(50) DEFAULT 'pending', -- pending, approved, rejected
    requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_access_requests_employee_id ON access_requests(employee_id);

-- ============================================
-- 31. ANNOUNCEMENTS TABLE
-- ============================================
CREATE TABLE announcements (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    posted_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 32. ANNOUNCEMENT ACKNOWLEDGMENTS TABLE
-- ============================================
CREATE TABLE announcement_acknowledgments (
    id SERIAL PRIMARY KEY,
    announcement_id INTEGER REFERENCES announcements(id) ON DELETE CASCADE,
    employee_id INTEGER REFERENCES employees(id) ON DELETE CASCADE,
    acknowledged_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_announcement_acks_announcement_id ON announcement_acknowledgments(announcement_id);
CREATE INDEX idx_announcement_acks_employee_id ON announcement_acknowledgments(employee_id);

-- ============================================
-- SEED DATA (Optional - Default Admin User)
-- ============================================
-- Password: admin123 (hashed with bcrypt)
INSERT INTO users (email, hashed_password, role) 
VALUES ('admin@company.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYqVr/1jriu', 'admin');

-- ============================================
-- VERIFICATION QUERIES
-- ============================================
-- Run these to verify your setup:
-- SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';
-- SELECT COUNT(*) FROM users;
