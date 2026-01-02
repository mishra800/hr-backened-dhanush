#!/usr/bin/env python3
"""
Fix Leave Tables Script
Adds missing columns and updates data
"""

import sqlite3
import os
from datetime import datetime

def fix_leave_tables():
    """Fix leave tables structure and data"""
    
    db_path = os.path.join(os.path.dirname(__file__), 'hr_system.db')
    
    if not os.path.exists(db_path):
        print(f"❌ Database file not found at {db_path}")
        return False
    
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Check current holidays table structure
        cursor.execute("PRAGMA table_info(holidays)")
        columns = [col[1] for col in cursor.fetchall()]
        print(f"Current holidays columns: {columns}")
        
        # Add missing columns if they don't exist
        if 'description' not in columns:
            try:
                cursor.execute("ALTER TABLE holidays ADD COLUMN description TEXT")
                print("✅ Added description column to holidays")
            except sqlite3.Error as e:
                print(f"⚠️ Description column might already exist: {e}")
        
        if 'is_optional' not in columns:
            try:
                cursor.execute("ALTER TABLE holidays ADD COLUMN is_optional BOOLEAN DEFAULT FALSE")
                print("✅ Added is_optional column to holidays")
            except sqlite3.Error as e:
                print(f"⚠️ is_optional column might already exist: {e}")
        
        if 'created_at' not in columns:
            try:
                cursor.execute("ALTER TABLE holidays ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP")
                print("✅ Added created_at column to holidays")
            except sqlite3.Error as e:
                print(f"⚠️ created_at column might already exist: {e}")
        
        # Update holidays with current year data
        current_year = 2025
        
        # Clear old holidays and insert new ones
        cursor.execute("DELETE FROM holidays")
        
        holidays = [
            (f"{current_year}-01-01", "New Year's Day", "public"),
            (f"{current_year}-01-26", "Republic Day", "public"),
            (f"{current_year}-03-14", "Holi", "public"),
            (f"{current_year}-04-14", "Good Friday", "public"),
            (f"{current_year}-08-15", "Independence Day", "public"),
            (f"{current_year}-10-02", "Gandhi Jayanti", "public"),
            (f"{current_year}-10-24", "Dussehra", "public"),
            (f"{current_year}-11-12", "Diwali", "public"),
            (f"{current_year}-12-25", "Christmas Day", "public"),
        ]
        
        for holiday_date, name, holiday_type in holidays:
            cursor.execute(
                "INSERT INTO holidays (date, name, type) VALUES (?, ?, ?)",
                (holiday_date, name, holiday_type)
            )
        
        print(f"✅ Added {len(holidays)} holidays for {current_year}")
        
        # Check leave_requests table structure
        cursor.execute("PRAGMA table_info(leave_requests)")
        leave_columns = [col[1] for col in cursor.fetchall()]
        print(f"Leave requests columns: {leave_columns}")
        
        # Ensure we have some test employees
        cursor.execute("SELECT COUNT(*) FROM employees")
        employee_count = cursor.fetchone()[0]
        
        if employee_count == 0:
            print("⚠️ No employees found. Creating test employee...")
            # This would need to be handled by the main application
            print("Please ensure you have employees in the system for leave functionality to work.")
        else:
            print(f"✅ Found {employee_count} employees")
            
            # Ensure leave balances exist
            cursor.execute("SELECT id FROM employees LIMIT 5")
            employee_ids = [row[0] for row in cursor.fetchall()]
            
            for emp_id in employee_ids:
                cursor.execute("SELECT COUNT(*) FROM leave_balances WHERE employee_id = ?", (emp_id,))
                balance_count = cursor.fetchone()[0]
                
                if balance_count == 0:
                    leave_types = [
                        ("Sick Leave", 10),
                        ("Casual Leave", 12),
                        ("Earned Leave", 15),
                        ("Personal Leave", 5)
                    ]
                    
                    for leave_type, balance in leave_types:
                        cursor.execute(
                            "INSERT INTO leave_balances (employee_id, leave_type, balance) VALUES (?, ?, ?)",
                            (emp_id, leave_type, balance)
                        )
                    
                    print(f"✅ Created leave balances for employee {emp_id}")
        
        conn.commit()
        conn.close()
        
        print("✅ Leave tables fix completed successfully!")
        return True
        
    except Exception as e:
        print(f"❌ Error fixing leave tables: {e}")
        return False

if __name__ == "__main__":
    fix_leave_tables()