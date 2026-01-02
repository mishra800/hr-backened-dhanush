-- ============================================
-- MIGRATION: Add missing columns to applications table
-- Run this script to update the applications table with new fields
-- ============================================

-- Add new columns to applications table
ALTER TABLE applications 
ADD COLUMN IF NOT EXISTS source VARCHAR(50) DEFAULT 'careers_website',
ADD COLUMN IF NOT EXISTS tags JSON DEFAULT '[]',
ADD COLUMN IF NOT EXISTS is_starred BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS blind_hiring_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS identity_revealed_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS revealed_by INTEGER REFERENCES users(id),
ADD COLUMN IF NOT EXISTS phone VARCHAR(20),
ADD COLUMN IF NOT EXISTS linkedin_profile_url TEXT,
ADD COLUMN IF NOT EXISTS years_of_experience INTEGER,
ADD COLUMN IF NOT EXISTS current_company VARCHAR(255),
ADD COLUMN IF NOT EXISTS current_position VARCHAR(255),
ADD COLUMN IF NOT EXISTS expected_salary FLOAT,
ADD COLUMN IF NOT EXISTS notice_period_days INTEGER,
ADD COLUMN IF NOT EXISTS skills JSON DEFAULT '[]',
ADD COLUMN IF NOT EXISTS education JSON DEFAULT '[]',
ADD COLUMN IF NOT EXISTS certifications JSON DEFAULT '[]',
ADD COLUMN IF NOT EXISTS stage_changed_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS stage_changed_by INTEGER REFERENCES users(id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_applications_source ON applications(source);
CREATE INDEX IF NOT EXISTS idx_applications_is_starred ON applications(is_starred);
CREATE INDEX IF NOT EXISTS idx_applications_phone ON applications(phone);
CREATE INDEX IF NOT EXISTS idx_applications_years_experience ON applications(years_of_experience);

-- Update existing records to have default values
UPDATE applications 
SET 
    source = 'careers_website',
    tags = '[]',
    is_starred = FALSE,
    blind_hiring_enabled = FALSE,
    skills = '[]',
    education = '[]',
    certifications = '[]'
WHERE source IS NULL;

-- Verify the migration
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'applications' 
ORDER BY ordinal_position;