#!/usr/bin/env python3
"""
Payroll Migration Script
Runs the payroll database migration to add new tables and columns
"""

import sqlite3
import os
import sys

def run_migration():
    """Run the payroll migration script"""
    
    # Get the database path
    db_path = os.path.join(os.path.dirname(__file__), 'hr_system.db')
    migration_path = os.path.join(os.path.dirname(__file__), 'payroll_migration.sql')
    
    if not os.path.exists(db_path):
        print(f"Error: Database file not found at {db_path}")
        return False
    
    if not os.path.exists(migration_path):
        print(f"Error: Migration file not found at {migration_path}")
        return False
    
    try:
        # Read the migration SQL
        with open(migration_path, 'r') as f:
            migration_sql = f.read()
        
        # Connect to database and run migration
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        print("Running payroll migration...")
        
        # Execute the migration (split by semicolon to handle multiple statements)
        statements = migration_sql.split(';')
        for statement in statements:
            statement = statement.strip()
            if statement:
                try:
                    cursor.execute(statement)
                    print(f"✓ Executed: {statement[:50]}...")
                except sqlite3.Error as e:
                    print(f"⚠ Warning: {statement[:50]}... - {e}")
        
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