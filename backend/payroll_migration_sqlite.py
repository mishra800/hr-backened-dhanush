#!/usr/bin/env python3
"""
SQLite-compatible Payroll Migration Script
Adds new columns and tables for comprehensive payroll functionality
"""

import sqlite3
import os
import sys

def column_exists(cursor, table_name, column_name):
    """Check if a column exists in a table"""
    cursor.execute(f"PRAGMA table_info({table_name})")
    columns = [row[1] for row in cursor.fetchall()]
    return column_name in columns

def table_exists(cursor, table_name):
    """Check if a table exists"""
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name=?", (table_name,))
    return cursor.fetchone() is not None

def run_migration():
    """Run the payroll migration script"""
    
    # Get the database path
    db_path = os.path.join(os.path.dirname(__file__), 'hr_system.db')
    
    if not os.path.exists(db_path):
        print(f"Error: Database file not found at {db_path}")
        return False
    
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        print("Running SQLite-compatible payroll migration...")
        
        # Add new columns to payroll table if they don't exist
        payroll_columns = [
            ('hra', 'REAL DEFAULT 0.0'),
            ('transport_allowance', 'REAL DEFAULT 0.0'),
            ('medical_allowance', 'REAL DEFAULT 0.0'),
            ('special_allowance', 'REAL DEFAULT 0.0'),
            ('bonus', 'REAL DEFAULT 0.0'),
            ('overtime_amount', 'REAL DEFAULT 0.0'),
            ('other_allowances', 'REAL DEFAULT 0.0'),
            ('esi', 'REAL DEFAULT 0.0'),
            ('professional_tax', 'REAL DEFAULT 0.0'),
            ('income_tax', 'REAL DEFAULT 0.0'),
            ('loan_deduction', 'REAL DEFAULT 0.0'),
            ('other_deductions', 'REAL DEFAULT 0.0'),
            ('total_working_days', 'INTEGER DEFAULT 0'),
            ('actual_working_days', 'INTEGER DEFAULT 0'),
            ('leave_days', 'INTEGER DEFAULT 0'),
            ('overtime_hours', 'REAL DEFAULT 0.0'),
            ('gross_salary', 'REAL DEFAULT 0.0'),
            ('total_deductions', 'REAL DEFAULT 0.0'),
            ('calculated_by', 'INTEGER'),
            ('approved_by', 'INTEGER'),
            ('payment_date', 'TIMESTAMP'),
            ('created_at', 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP'),
            ('updated_at', 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP'),
            ('calculation_notes', 'TEXT'),
            ('manual_adjustments', 'TEXT DEFAULT "{}"')
        ]
        
        for column_name, column_def in payroll_columns:
            if not column_exists(cursor, 'payroll', column_name):
                try:
                    cursor.execute(f"ALTER TABLE payroll ADD COLUMN {column_name} {column_def}")
                    print(f"✓ Added column {column_name} to payroll table")
                except sqlite3.Error as e:
                    print(f"⚠ Warning adding {column_name}: {e}")
        
        # Add new columns to salary_structures table
        salary_structure_columns = [
            ('transport_allowance', 'REAL DEFAULT 0.0'),
            ('medical_allowance', 'REAL DEFAULT 0.0'),
            ('special_allowance', 'REAL DEFAULT 0.0'),
            ('created_at', 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP'),
            ('updated_at', 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP')
        ]
        
        for column_name, column_def in salary_structure_columns:
            if not column_exists(cursor, 'salary_structures', column_name):
                try:
                    cursor.execute(f"ALTER TABLE salary_structures ADD COLUMN {column_name} {column_def}")
                    print(f"✓ Added column {column_name} to salary_structures table")
                except sqlite3.Error as e:
                    print(f"⚠ Warning adding {column_name}: {e}")
        
        # Add new columns to salary_revisions table
        salary_revision_columns = [
            ('reason', 'TEXT'),
            ('revision_date', 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP'),
            ('effective_date', 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP'),
            ('approved_by', 'INTEGER'),
            ('created_at', 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP')
        ]
        
        for column_name, column_def in salary_revision_columns:
            if not column_exists(cursor, 'salary_revisions', column_name):
                try:
                    cursor.execute(f"ALTER TABLE salary_revisions ADD COLUMN {column_name} {column_def}")
                    print(f"✓ Added column {column_name} to salary_revisions table")
                except sqlite3.Error as e:
                    print(f"⚠ Warning adding {column_name}: {e}")
        
        # Create new tables
        new_tables = {
            'payroll_configurations': '''
                CREATE TABLE payroll_configurations (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    config_key TEXT UNIQUE NOT NULL,
                    config_value TEXT NOT NULL,
                    description TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            ''',
            'tax_slabs': '''
                CREATE TABLE tax_slabs (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    financial_year TEXT NOT NULL,
                    min_income REAL NOT NULL,
                    max_income REAL,
                    tax_rate REAL NOT NULL,
                    is_active BOOLEAN DEFAULT TRUE,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            ''',
            'deduction_rules': '''
                CREATE TABLE deduction_rules (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    rule_name TEXT UNIQUE NOT NULL,
                    rule_type TEXT NOT NULL,
                    rule_config TEXT NOT NULL,
                    is_active BOOLEAN DEFAULT TRUE,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            ''',
            'payroll_batches': '''
                CREATE TABLE payroll_batches (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    batch_name TEXT NOT NULL,
                    month TEXT NOT NULL,
                    status TEXT DEFAULT 'draft',
                    total_employees INTEGER DEFAULT 0,
                    processed_employees INTEGER DEFAULT 0,
                    failed_employees INTEGER DEFAULT 0,
                    created_by INTEGER,
                    started_at TIMESTAMP,
                    completed_at TIMESTAMP,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            ''',
            'payslip_distributions': '''
                CREATE TABLE payslip_distributions (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    payroll_id INTEGER,
                    distribution_method TEXT NOT NULL,
                    recipient_email TEXT,
                    status TEXT DEFAULT 'pending',
                    sent_at TIMESTAMP,
                    error_message TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            '''
        }
        
        for table_name, create_sql in new_tables.items():
            if not table_exists(cursor, table_name):
                try:
                    cursor.execute(create_sql)
                    print(f"✓ Created table {table_name}")
                except sqlite3.Error as e:
                    print(f"⚠ Warning creating {table_name}: {e}")
        
        # Insert default configurations
        default_configs = [
            ('pf_rate', '{"rate": 0.12, "ceiling": 15000}', 'Provident Fund rate and salary ceiling'),
            ('esi_rate', '{"rate": 0.0075, "ceiling": 25000}', 'ESI rate and salary ceiling'),
            ('professional_tax_slabs', '{"slabs": [{"min": 0, "max": 15000, "tax": 0}, {"min": 15001, "max": 20000, "tax": 150}, {"min": 20001, "max": null, "tax": 200}]}', 'Professional tax slabs'),
            ('standard_deduction', '{"amount": 50000}', 'Standard deduction for income tax'),
            ('working_days_per_month', '{"days": 22}', 'Standard working days per month'),
            ('overtime_multiplier', '{"multiplier": 1.5}', 'Overtime rate multiplier')
        ]
        
        for config_key, config_value, description in default_configs:
            try:
                cursor.execute(
                    "INSERT OR IGNORE INTO payroll_configurations (config_key, config_value, description) VALUES (?, ?, ?)",
                    (config_key, config_value, description)
                )
                print(f"✓ Added configuration: {config_key}")
            except sqlite3.Error as e:
                print(f"⚠ Warning adding config {config_key}: {e}")
        
        # Insert default tax slabs
        tax_slabs = [
            ('2023-24', 0, 250000, 0.0),
            ('2023-24', 250001, 500000, 0.05),
            ('2023-24', 500001, 1000000, 0.20),
            ('2023-24', 1000001, None, 0.30)
        ]
        
        for financial_year, min_income, max_income, tax_rate in tax_slabs:
            try:
                cursor.execute(
                    "INSERT OR IGNORE INTO tax_slabs (financial_year, min_income, max_income, tax_rate) VALUES (?, ?, ?, ?)",
                    (financial_year, min_income, max_income, tax_rate)
                )
                print(f"✓ Added tax slab: {min_income}-{max_income} @ {tax_rate*100}%")
            except sqlite3.Error as e:
                print(f"⚠ Warning adding tax slab: {e}")
        
        # Insert default deduction rules
        deduction_rules = [
            ('provident_fund', 'percentage', '{"rate": 0.12, "base": "basic_salary", "ceiling": 15000}'),
            ('esi', 'percentage', '{"rate": 0.0075, "base": "gross_salary", "ceiling": 25000}'),
            ('professional_tax_karnataka', 'slab', '{"slabs": [{"min": 0, "max": 15000, "tax": 0}, {"min": 15001, "max": 20000, "tax": 150}, {"min": 20001, "max": null, "tax": 200}]}')
        ]
        
        for rule_name, rule_type, rule_config in deduction_rules:
            try:
                cursor.execute(
                    "INSERT OR IGNORE INTO deduction_rules (rule_name, rule_type, rule_config) VALUES (?, ?, ?)",
                    (rule_name, rule_type, rule_config)
                )
                print(f"✓ Added deduction rule: {rule_name}")
            except sqlite3.Error as e:
                print(f"⚠ Warning adding deduction rule: {e}")
        
        # Create indexes
        indexes = [
            "CREATE INDEX IF NOT EXISTS idx_payroll_employee_month ON payroll(employee_id, month)",
            "CREATE INDEX IF NOT EXISTS idx_payroll_status ON payroll(status)",
            "CREATE INDEX IF NOT EXISTS idx_payroll_month ON payroll(month)",
            "CREATE INDEX IF NOT EXISTS idx_salary_structures_employee ON salary_structures(employee_id)",
            "CREATE INDEX IF NOT EXISTS idx_salary_revisions_employee ON salary_revisions(employee_id)",
            "CREATE INDEX IF NOT EXISTS idx_tax_slabs_year ON tax_slabs(financial_year)",
            "CREATE INDEX IF NOT EXISTS idx_payroll_batches_month ON payroll_batches(month)",
            "CREATE INDEX IF NOT EXISTS idx_payslip_distributions_payroll ON payslip_distributions(payroll_id)"
        ]
        
        for index_sql in indexes:
            try:
                cursor.execute(index_sql)
                print(f"✓ Created index")
            except sqlite3.Error as e:
                print(f"⚠ Warning creating index: {e}")
        
        # Update existing payroll records
        try:
            # Set default values for new columns
            cursor.execute("""
                UPDATE payroll SET 
                    gross_salary = COALESCE(basic_salary, 0) + COALESCE(allowances, 0),
                    total_deductions = COALESCE(pf, 0) + COALESCE(tax, 0) + COALESCE(deductions, 0),
                    created_at = CURRENT_TIMESTAMP,
                    updated_at = CURRENT_TIMESTAMP,
                    total_working_days = 22,
                    actual_working_days = 22
                WHERE gross_salary IS NULL OR gross_salary = 0
            """)
            print("✓ Updated existing payroll records with default values")
        except sqlite3.Error as e:
            print(f"⚠ Warning updating payroll records: {e}")
        
        conn.commit()
        conn.close()
        
        print("✅ Payroll migration completed successfully!")
        return True
        
    except Exception as e:
        print(f"❌ Error running migration: {e}")
        return False

if __name__ == "__main__":
    success = run_migration()
    sys.exit(0 if success else 1)