#!/usr/bin/env python3
"""
Fix PostgreSQL Schema Script
Adds missing columns and fixes database schema issues
"""

import psycopg2
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def fix_postgresql_schema():
    """Fix PostgreSQL database schema issues"""
    
    # Database connection parameters
    db_params = {
        'host': 'localhost',
        'database': 'hr_management_system',
        'user': 'postgres',
        'password': 'abhishek',
        'port': '5432'
    }
    
    try:
        # Connect to PostgreSQL
        conn = psycopg2.connect(**db_params)
        cursor = conn.cursor()
        
        print("🔧 Fixing PostgreSQL schema issues...")
        
        # Check if employee_documents table exists
        cursor.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'employee_documents'
            );
        """)
        
        table_exists = cursor.fetchone()[0]
        
        if not table_exists:
            print("❌ employee_documents table does not exist")
            print("Creating employee_documents table...")
            
            cursor.execute("""
                CREATE TABLE employee_documents (
                    id SERIAL PRIMARY KEY,
                    employee_id INTEGER REFERENCES employees(id),
                    document_type VARCHAR(255),
                    document_url VARCHAR(500),
                    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    is_verified BOOLEAN DEFAULT FALSE,
                    ocr_confidence FLOAT DEFAULT 0.0,
                    rejection_reason VARCHAR(500),
                    verified_by INTEGER REFERENCES users(id),
                    verified_at TIMESTAMP
                );
            """)
            print("✅ Created employee_documents table")
        else:
            print("✅ employee_documents table exists")
            
            # Check for missing columns
            cursor.execute("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'employee_documents' 
                AND table_schema = 'public';
            """)
            
            existing_columns = [row[0] for row in cursor.fetchall()]
            print(f"Existing columns: {existing_columns}")
            
            required_columns = {
                'verified_by': 'INTEGER REFERENCES users(id)',
                'verified_at': 'TIMESTAMP',
                'ocr_confidence': 'FLOAT DEFAULT 0.0',
                'rejection_reason': 'VARCHAR(500)',
                'is_verified': 'BOOLEAN DEFAULT FALSE'
            }
            
            for column_name, column_def in required_columns.items():
                if column_name not in existing_columns:
                    try:
                        cursor.execute(f"""
                            ALTER TABLE employee_documents 
                            ADD COLUMN {column_name} {column_def};
                        """)
                        print(f"✅ Added column {column_name}")
                    except psycopg2.Error as e:
                        print(f"⚠️ Error adding column {column_name}: {e}")
        
        # Check payroll table for missing columns
        cursor.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'payroll'
            );
        """)
        
        payroll_exists = cursor.fetchone()[0]
        
        if payroll_exists:
            # Get existing payroll columns
            cursor.execute("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'payroll' 
                AND table_schema = 'public';
            """)
            
            payroll_columns = [row[0] for row in cursor.fetchall()]
            
            # Add missing payroll columns
            payroll_required_columns = {
                'hra': 'REAL DEFAULT 0.0',
                'transport_allowance': 'REAL DEFAULT 0.0',
                'medical_allowance': 'REAL DEFAULT 0.0',
                'special_allowance': 'REAL DEFAULT 0.0',
                'bonus': 'REAL DEFAULT 0.0',
                'overtime_amount': 'REAL DEFAULT 0.0',
                'other_allowances': 'REAL DEFAULT 0.0',
                'esi': 'REAL DEFAULT 0.0',
                'professional_tax': 'REAL DEFAULT 0.0',
                'income_tax': 'REAL DEFAULT 0.0',
                'loan_deduction': 'REAL DEFAULT 0.0',
                'other_deductions': 'REAL DEFAULT 0.0',
                'total_working_days': 'INTEGER DEFAULT 0',
                'actual_working_days': 'INTEGER DEFAULT 0',
                'leave_days': 'INTEGER DEFAULT 0',
                'overtime_hours': 'REAL DEFAULT 0.0',
                'gross_salary': 'REAL DEFAULT 0.0',
                'total_deductions': 'REAL DEFAULT 0.0',
                'calculated_by': 'INTEGER REFERENCES users(id)',
                'approved_by': 'INTEGER REFERENCES users(id)',
                'payment_date': 'TIMESTAMP',
                'created_at': 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP',
                'updated_at': 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP',
                'calculation_notes': 'TEXT',
                'manual_adjustments': 'JSONB DEFAULT \'{}\'::jsonb'
            }
            
            for column_name, column_def in payroll_required_columns.items():
                if column_name not in payroll_columns:
                    try:
                        cursor.execute(f"""
                            ALTER TABLE payroll 
                            ADD COLUMN {column_name} {column_def};
                        """)
                        print(f"✅ Added payroll column {column_name}")
                    except psycopg2.Error as e:
                        print(f"⚠️ Error adding payroll column {column_name}: {e}")
        
        # Fix any NULL values that might cause issues
        try:
            cursor.execute("""
                UPDATE employees 
                SET position = 'Not Specified' 
                WHERE position IS NULL;
            """)
            
            cursor.execute("""
                UPDATE employees 
                SET date_of_joining = CURRENT_TIMESTAMP 
                WHERE date_of_joining IS NULL;
            """)
            
            print("✅ Fixed NULL values in employees table")
        except psycopg2.Error as e:
            print(f"⚠️ Error fixing NULL values: {e}")
        
        # Commit all changes
        conn.commit()
        cursor.close()
        conn.close()
        
        print("✅ PostgreSQL schema fix completed successfully!")
        return True
        
    except psycopg2.Error as e:
        print(f"❌ PostgreSQL error: {e}")
        return False
    except Exception as e:
        print(f"❌ General error: {e}")
        return False

def reset_failed_transactions():
    """Reset any failed transactions"""
    
    db_params = {
        'host': 'localhost',
        'database': 'hr_management_system',
        'user': 'postgres',
        'password': 'abhishek',
        'port': '5432'
    }
    
    try:
        conn = psycopg2.connect(**db_params)
        conn.autocommit = True  # Enable autocommit to avoid transaction blocks
        cursor = conn.cursor()
        
        # Kill any long-running queries
        cursor.execute("""
            SELECT pg_terminate_backend(pid)
            FROM pg_stat_activity
            WHERE state = 'idle in transaction'
            AND query_start < NOW() - INTERVAL '5 minutes';
        """)
        
        print("✅ Reset failed transactions")
        
        cursor.close()
        conn.close()
        return True
        
    except psycopg2.Error as e:
        print(f"⚠️ Error resetting transactions: {e}")
        return False

if __name__ == "__main__":
    print("🔧 Starting PostgreSQL schema fix...")
    
    # First, reset any failed transactions
    reset_failed_transactions()
    
    # Then fix the schema
    success = fix_postgresql_schema()
    
    if success:
        print("\n✅ All fixes completed successfully!")
        print("You can now restart your backend server.")
    else:
        print("\n❌ Some fixes failed. Please check the errors above.")