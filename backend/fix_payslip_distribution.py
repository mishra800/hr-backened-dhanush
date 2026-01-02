#!/usr/bin/env python3
"""
Fix PayslipDistribution table by adding missing employee_id foreign key column
"""

import os
import sys
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def fix_payslip_distribution_table():
    """Add employee_id column to payslip_distributions table"""
    
    # Get database URL
    database_url = os.getenv(
        "DATABASE_URL",
        "postgresql://postgres:abhishek@localhost:5432/hr_management_system"
    )
    
    try:
        engine = create_engine(database_url)
        
        with engine.connect() as conn:
            # Check if employee_id column exists
            result = conn.execute(text("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'payslip_distributions' 
                AND column_name = 'employee_id'
            """))
            
            if result.fetchone() is None:
                print("Adding employee_id column to payslip_distributions table...")
                
                # Add the employee_id column
                conn.execute(text("""
                    ALTER TABLE payslip_distributions 
                    ADD COLUMN employee_id INTEGER
                """))
                
                # Add foreign key constraint
                conn.execute(text("""
                    ALTER TABLE payslip_distributions 
                    ADD CONSTRAINT fk_payslip_distributions_employee_id 
                    FOREIGN KEY (employee_id) REFERENCES employees(id)
                """))
                
                # Update existing records to populate employee_id from payroll table
                conn.execute(text("""
                    UPDATE payslip_distributions 
                    SET employee_id = p.employee_id 
                    FROM payroll p 
                    WHERE payslip_distributions.payroll_id = p.id
                """))
                
                conn.commit()
                print("✅ Successfully added employee_id column and updated existing records")
            else:
                print("✅ employee_id column already exists in payslip_distributions table")
                
    except Exception as e:
        print(f"❌ Error fixing payslip_distributions table: {e}")
        return False
    
    return True

if __name__ == "__main__":
    print("🔧 Fixing PayslipDistribution table...")
    success = fix_payslip_distribution_table()
    
    if success:
        print("✅ Database fix completed successfully!")
        sys.exit(0)
    else:
        print("❌ Database fix failed!")
        sys.exit(1)