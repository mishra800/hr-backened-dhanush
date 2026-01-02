#!/usr/bin/env python3
"""
Database Health Check Script
Verifies database connection and schema integrity
"""

import psycopg2
import os
from dotenv import load_dotenv
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

# Load environment variables
load_dotenv()

def check_postgresql_connection():
    """Check PostgreSQL connection and basic functionality"""
    
    db_params = {
        'host': 'localhost',
        'database': 'hr_management_system',
        'user': 'postgres',
        'password': 'abhishek',
        'port': '5432'
    }
    
    try:
        print("🔍 Checking PostgreSQL connection...")
        
        # Test basic connection
        conn = psycopg2.connect(**db_params)
        cursor = conn.cursor()
        
        # Test basic query
        cursor.execute("SELECT version();")
        version = cursor.fetchone()[0]
        print(f"✅ PostgreSQL connection successful")
        print(f"   Version: {version}")
        
        # Check database size
        cursor.execute("""
            SELECT pg_size_pretty(pg_database_size('hr_management_system'));
        """)
        db_size = cursor.fetchone()[0]
        print(f"   Database size: {db_size}")
        
        # Check active connections
        cursor.execute("""
            SELECT count(*) FROM pg_stat_activity 
            WHERE datname = 'hr_management_system';
        """)
        active_connections = cursor.fetchone()[0]
        print(f"   Active connections: {active_connections}")
        
        cursor.close()
        conn.close()
        return True
        
    except psycopg2.Error as e:
        print(f"❌ PostgreSQL connection failed: {e}")
        return False
    except Exception as e:
        print(f"❌ General error: {e}")
        return False

def check_table_integrity():
    """Check table structure and data integrity"""
    
    try:
        print("\n🔍 Checking table integrity...")
        
        # Create SQLAlchemy engine
        DATABASE_URL = "postgresql://postgres:abhishek@localhost:5432/hr_management_system"
        engine = create_engine(DATABASE_URL)
        SessionLocal = sessionmaker(bind=engine)
        
        db = SessionLocal()
        
        # Check critical tables
        critical_tables = [
            'users',
            'employees', 
            'employee_documents',
            'payroll',
            'leave_requests',
            'leave_balances',
            'holidays'
        ]
        
        for table in critical_tables:
            try:
                result = db.execute(text(f"SELECT COUNT(*) FROM {table}"))
                count = result.scalar()
                print(f"✅ Table '{table}': {count} records")
            except Exception as e:
                print(f"❌ Table '{table}': Error - {e}")
        
        # Check for NULL values in critical fields
        print("\n🔍 Checking for data quality issues...")
        
        # Check employees with NULL positions (should be fixed now)
        result = db.execute(text("SELECT COUNT(*) FROM employees WHERE position IS NULL"))
        null_positions = result.scalar()
        if null_positions > 0:
            print(f"⚠️ Found {null_positions} employees with NULL positions")
        else:
            print("✅ No NULL positions found")
        
        # Check employees with NULL joining dates
        result = db.execute(text("SELECT COUNT(*) FROM employees WHERE date_of_joining IS NULL"))
        null_dates = result.scalar()
        if null_dates > 0:
            print(f"⚠️ Found {null_dates} employees with NULL joining dates")
        else:
            print("✅ No NULL joining dates found")
        
        # Check for orphaned records
        result = db.execute(text("""
            SELECT COUNT(*) FROM employees e 
            LEFT JOIN users u ON e.user_id = u.id 
            WHERE u.id IS NULL
        """))
        orphaned_employees = result.scalar()
        if orphaned_employees > 0:
            print(f"⚠️ Found {orphaned_employees} orphaned employee records")
        else:
            print("✅ No orphaned employee records found")
        
        db.close()
        return True
        
    except Exception as e:
        print(f"❌ Table integrity check failed: {e}")
        return False

def check_schema_completeness():
    """Check if all required columns exist"""
    
    try:
        print("\n🔍 Checking schema completeness...")
        
        db_params = {
            'host': 'localhost',
            'database': 'hr_management_system',
            'user': 'postgres',
            'password': 'abhishek',
            'port': '5432'
        }
        
        conn = psycopg2.connect(**db_params)
        cursor = conn.cursor()
        
        # Check employee_documents table
        cursor.execute("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'employee_documents' 
            AND table_schema = 'public'
            ORDER BY ordinal_position;
        """)
        
        doc_columns = [row[0] for row in cursor.fetchall()]
        required_doc_columns = [
            'id', 'employee_id', 'document_type', 'document_url', 
            'uploaded_at', 'is_verified', 'ocr_confidence', 
            'rejection_reason', 'verified_by', 'verified_at'
        ]
        
        missing_doc_columns = set(required_doc_columns) - set(doc_columns)
        if missing_doc_columns:
            print(f"❌ Missing employee_documents columns: {missing_doc_columns}")
        else:
            print("✅ employee_documents table schema complete")
        
        # Check payroll table
        cursor.execute("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'payroll' 
            AND table_schema = 'public'
            ORDER BY ordinal_position;
        """)
        
        payroll_columns = [row[0] for row in cursor.fetchall()]
        required_payroll_columns = [
            'id', 'employee_id', 'month', 'basic_salary', 'hra',
            'transport_allowance', 'medical_allowance', 'special_allowance',
            'bonus', 'overtime_amount', 'other_allowances', 'pf', 'esi',
            'professional_tax', 'income_tax', 'loan_deduction', 'other_deductions',
            'total_working_days', 'actual_working_days', 'leave_days',
            'overtime_hours', 'gross_salary', 'total_deductions', 'net_salary',
            'status', 'calculated_by', 'approved_by', 'payment_date',
            'created_at', 'updated_at', 'calculation_notes', 'manual_adjustments'
        ]
        
        missing_payroll_columns = set(required_payroll_columns) - set(payroll_columns)
        if missing_payroll_columns:
            print(f"❌ Missing payroll columns: {missing_payroll_columns}")
        else:
            print("✅ payroll table schema complete")
        
        cursor.close()
        conn.close()
        return True
        
    except Exception as e:
        print(f"❌ Schema completeness check failed: {e}")
        return False

def run_health_check():
    """Run complete database health check"""
    
    print("🏥 Starting Database Health Check...")
    print("=" * 50)
    
    checks = [
        ("PostgreSQL Connection", check_postgresql_connection),
        ("Table Integrity", check_table_integrity),
        ("Schema Completeness", check_schema_completeness)
    ]
    
    results = []
    
    for check_name, check_func in checks:
        try:
            result = check_func()
            results.append((check_name, result))
        except Exception as e:
            print(f"❌ {check_name} failed with exception: {e}")
            results.append((check_name, False))
    
    print("\n" + "=" * 50)
    print("📊 Health Check Summary:")
    
    all_passed = True
    for check_name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"   {check_name}: {status}")
        if not result:
            all_passed = False
    
    if all_passed:
        print("\n🎉 All health checks passed! Database is ready.")
    else:
        print("\n⚠️ Some health checks failed. Please review the errors above.")
    
    return all_passed

if __name__ == "__main__":
    run_health_check()