#!/usr/bin/env python3
"""
Update Leave Data Script
Updates holiday dates to current year and adds sample data
"""

import sqlite3
import os
from datetime import datetime, date

def update_leave_data():
    """Update leave data with current year holidays"""
    
    db_path = os.path.join(os.path.dirname(__file__), 'hr_system.db')
    
    if not os.path.exists(db_path):
        print(f"❌ Database file not found at {db_path}")
        return False
    
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Update holidays to current year (2025)
        current_year = 2025
        
        # Clear old holidays
        cursor.execute("DELETE FROM holidays")
        
        # Insert current year holidays
        holidays = [
            (f"{current_year}-01-01", "New Year's Day", "public", False),
            (f"{current_year}-01-26", "Republic Day", "public", False),
            (f"{current_year}-03-14", "Holi", "public", False),
            (f"{current_year}-04-14", "Good Friday", "public", False),
            (f"{current_year}-08-15", "Independence Day", "public", False),
            (f"{current_year}-10-02", "Gandhi Jayanti", "public", False),
            (f"{current_year}-10-24", "Dussehra", "public", False),
            (f"{current_year}-11-12", "Diwali", "public", False),
            (f"{current_year}-12-25", "Christmas Day", "public", False),
        ]
        
        for holiday_date, name, holiday_type, is_optional in holidays:
            cursor.execute(
                "INSERT INTO holidays (date, name, type, is_optional, created_at) VALUES (?, ?, ?, ?, ?)",
                (holiday_date, name, holiday_type, is_optional, datetime.now().isoformat())
            )
        
        print(f"✅ Added {len(holidays)} holidays for {current_year}")
        
        # Check if we have employee data
        cursor.execute("SELECT COUNT(*) FROM employees")
        employee_count = cursor.fetchone()[0]
        print(f"Employee count: {employee_count}")
        
        if employee_count == 0:
            print("⚠️ No employees found. Leave balances may not work properly.")
        else:
            # Ensure leave balances exist for all employees
            cursor.execute("SELECT id FROM employees")
            employee_ids = [row[0] for row in cursor.fetchall()]
            
            for emp_id in employee_ids:
                # Check if balances exist
                cursor.execute("SELECT COUNT(*) FROM leave_balances WHERE employee_id = ?", (emp_id,))
                balance_count = cursor.fetchone()[0]
                
                if balance_count == 0:
                    # Create default balances
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
        
        print("✅ Leave data update completed successfully!")
        return True
        
    except Exception as e:
        print(f"❌ Error updating leave data: {e}")
        return False

if __name__ == "__main__":
    update_leave_data()