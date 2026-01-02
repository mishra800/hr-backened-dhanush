-- Payroll System Migration Script
-- This script adds comprehensive payroll functionality to the existing HR system

-- Update existing payroll table with new columns
ALTER TABLE payroll ADD COLUMN IF NOT EXISTS hra REAL DEFAULT 0.0;
ALTER TABLE payroll ADD COLUMN IF NOT EXISTS transport_allowance REAL DEFAULT 0.0;
ALTER TABLE payroll ADD COLUMN IF NOT EXISTS medical_allowance REAL DEFAULT 0.0;
ALTER TABLE payroll ADD COLUMN IF NOT EXISTS special_allowance REAL DEFAULT 0.0;
ALTER TABLE payroll ADD COLUMN IF NOT EXISTS bonus REAL DEFAULT 0.0;
ALTER TABLE payroll ADD COLUMN IF NOT EXISTS overtime_amount REAL DEFAULT 0.0;
ALTER TABLE payroll ADD COLUMN IF NOT EXISTS other_allowances REAL DEFAULT 0.0;

ALTER TABLE payroll ADD COLUMN IF NOT EXISTS esi REAL DEFAULT 0.0;
ALTER TABLE payroll ADD COLUMN IF NOT EXISTS professional_tax REAL DEFAULT 0.0;
ALTER TABLE payroll ADD COLUMN IF NOT EXISTS income_tax REAL DEFAULT 0.0;
ALTER TABLE payroll ADD COLUMN IF NOT EXISTS loan_deduction REAL DEFAULT 0.0;
ALTER TABLE payroll ADD COLUMN IF NOT EXISTS other_deductions REAL DEFAULT 0.0;

ALTER TABLE payroll ADD COLUMN IF NOT EXISTS total_working_days INTEGER DEFAULT 0;
ALTER TABLE payroll ADD COLUMN IF NOT EXISTS actual_working_days INTEGER DEFAULT 0;
ALTER TABLE payroll ADD COLUMN IF NOT EXISTS leave_days INTEGER DEFAULT 0;
ALTER TABLE payroll ADD COLUMN IF NOT EXISTS overtime_hours REAL DEFAULT 0.0;

ALTER TABLE payroll ADD COLUMN IF NOT EXISTS gross_salary REAL DEFAULT 0.0;
ALTER TABLE payroll ADD COLUMN IF NOT EXISTS total_deductions REAL DEFAULT 0.0;

ALTER TABLE payroll ADD COLUMN IF NOT EXISTS calculated_by INTEGER REFERENCES users(id);
ALTER TABLE payroll ADD COLUMN IF NOT EXISTS approved_by INTEGER REFERENCES users(id);
ALTER TABLE payroll ADD COLUMN IF NOT EXISTS payment_date TIMESTAMP;
ALTER TABLE payroll ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE payroll ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE payroll ADD COLUMN IF NOT EXISTS calculation_notes TEXT;
ALTER TABLE payroll ADD COLUMN IF NOT EXISTS manual_adjustments JSON DEFAULT '{}';

-- Update existing salary_structures table
ALTER TABLE salary_structures ADD COLUMN IF NOT EXISTS transport_allowance REAL DEFAULT 0.0;
ALTER TABLE salary_structures ADD COLUMN IF NOT EXISTS medical_allowance REAL DEFAULT 0.0;
ALTER TABLE salary_structures ADD COLUMN IF NOT EXISTS special_allowance REAL DEFAULT 0.0;
ALTER TABLE salary_structures ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE salary_structures ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Update existing salary_revisions table
ALTER TABLE salary_revisions ADD COLUMN IF NOT EXISTS reason TEXT;
ALTER TABLE salary_revisions ADD COLUMN IF NOT EXISTS revision_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE salary_revisions ADD COLUMN IF NOT EXISTS effective_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE salary_revisions ADD COLUMN IF NOT EXISTS approved_by INTEGER REFERENCES users(id);
ALTER TABLE salary_revisions ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Create new payroll configuration table
CREATE TABLE IF NOT EXISTS payroll_configurations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    config_key TEXT UNIQUE NOT NULL,
    config_value JSON NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create tax slabs table
CREATE TABLE IF NOT EXISTS tax_slabs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    financial_year TEXT NOT NULL,
    min_income REAL NOT NULL,
    max_income REAL,
    tax_rate REAL NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create deduction rules table
CREATE TABLE IF NOT EXISTS deduction_rules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    rule_name TEXT UNIQUE NOT NULL,
    rule_type TEXT NOT NULL,
    rule_config JSON NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create payroll batches table
CREATE TABLE IF NOT EXISTS payroll_batches (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    batch_name TEXT NOT NULL,
    month TEXT NOT NULL,
    status TEXT DEFAULT 'draft',
    total_employees INTEGER DEFAULT 0,
    processed_employees INTEGER DEFAULT 0,
    failed_employees INTEGER DEFAULT 0,
    created_by INTEGER REFERENCES users(id),
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create payslip distribution table
CREATE TABLE IF NOT EXISTS payslip_distributions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    payroll_id INTEGER REFERENCES payroll(id),
    distribution_method TEXT NOT NULL,
    recipient_email TEXT,
    status TEXT DEFAULT 'pending',
    sent_at TIMESTAMP,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default payroll configurations
INSERT OR IGNORE INTO payroll_configurations (config_key, config_value, description) VALUES
('pf_rate', '{"rate": 0.12, "ceiling": 15000}', 'Provident Fund rate and salary ceiling'),
('esi_rate', '{"rate": 0.0075, "ceiling": 25000}', 'ESI rate and salary ceiling'),
('professional_tax_slabs', '{"slabs": [{"min": 0, "max": 15000, "tax": 0}, {"min": 15001, "max": 20000, "tax": 150}, {"min": 20001, "max": null, "tax": 200}]}', 'Professional tax slabs'),
('standard_deduction', '{"amount": 50000}', 'Standard deduction for income tax'),
('working_days_per_month', '{"days": 22}', 'Standard working days per month'),
('overtime_multiplier', '{"multiplier": 1.5}', 'Overtime rate multiplier');

-- Insert default tax slabs for FY 2023-24
INSERT OR IGNORE INTO tax_slabs (financial_year, min_income, max_income, tax_rate) VALUES
('2023-24', 0, 250000, 0.0),
('2023-24', 250001, 500000, 0.05),
('2023-24', 500001, 1000000, 0.20),
('2023-24', 1000001, NULL, 0.30);

-- Insert default deduction rules
INSERT OR IGNORE INTO deduction_rules (rule_name, rule_type, rule_config) VALUES
('provident_fund', 'percentage', '{"rate": 0.12, "base": "basic_salary", "ceiling": 15000}'),
('esi', 'percentage', '{"rate": 0.0075, "base": "gross_salary", "ceiling": 25000}'),
('professional_tax_karnataka', 'slab', '{"slabs": [{"min": 0, "max": 15000, "tax": 0}, {"min": 15001, "max": 20000, "tax": 150}, {"min": 20001, "max": null, "tax": 200}]}');

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_payroll_employee_month ON payroll(employee_id, month);
CREATE INDEX IF NOT EXISTS idx_payroll_status ON payroll(status);
CREATE INDEX IF NOT EXISTS idx_payroll_month ON payroll(month);
CREATE INDEX IF NOT EXISTS idx_salary_structures_employee ON salary_structures(employee_id);
CREATE INDEX IF NOT EXISTS idx_salary_structures_effective_date ON salary_structures(effective_date);
CREATE INDEX IF NOT EXISTS idx_salary_revisions_employee ON salary_revisions(employee_id);
CREATE INDEX IF NOT EXISTS idx_tax_slabs_year ON tax_slabs(financial_year);
CREATE INDEX IF NOT EXISTS idx_payroll_batches_month ON payroll_batches(month);
CREATE INDEX IF NOT EXISTS idx_payslip_distributions_payroll ON payslip_distributions(payroll_id);

-- Update existing payroll records to set default values
UPDATE payroll SET 
    gross_salary = COALESCE(basic_salary, 0) + COALESCE(allowances, 0),
    total_deductions = COALESCE(pf, 0) + COALESCE(tax, 0) + COALESCE(deductions, 0),
    created_at = CURRENT_TIMESTAMP,
    updated_at = CURRENT_TIMESTAMP
WHERE gross_salary IS NULL OR gross_salary = 0;

-- Migrate existing allowances to new structure
UPDATE payroll SET 
    hra = CASE WHEN allowances > 0 THEN allowances * 0.6 ELSE 0 END,
    other_allowances = CASE WHEN allowances > 0 THEN allowances * 0.4 ELSE 0 END
WHERE hra IS NULL OR hra = 0;

-- Set default working days for existing records
UPDATE payroll SET 
    total_working_days = 22,
    actual_working_days = 22
WHERE total_working_days IS NULL OR total_working_days = 0;

COMMIT;