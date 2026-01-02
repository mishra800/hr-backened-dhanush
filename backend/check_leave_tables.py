#!/usr/bin/env python3
"""
Check Leave Tables Script
Verifies if leave-related tables exist and have proper structure
"""

import sqlite3
import os

def check_leave_tables():
    """Check if leave tables exist and their structure"""
    
    db_path = os.path.join(os.path.dirname(__file__), 'hr_system.db')
    
    if not os.path.exists(db_path):
        print(f"❌ Database file not found at {db_path}")
        return False
    
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Check if tables exist
        tables_to_check = ['leave_requests', 'leave_balances', 'holidays']
        
        for table in tables_to_check:
            cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name=?", (table,))
            result = cursor.fetchone()
            
            if result:
                print(f"✅ Table '{table}' exists")
                
                # Get table schema
                cursor.execute(f"PRAGMA table_info({table})")
                columns = cursor.fetchall()
                print(f"   Columns: {[col[1] for col in columns]}")
                
                # Get row count
                cursor.execute(f"SELECT COUNT(*) FROM {table}")
                count = cursor.fetchone()[0]
                print(f"   Row count: {count}")
                
            else:
                print(f"❌ Table '{table}' does not exist")
        
        # Check for sample data
        print("\n--- Sample Data Check ---")
        
        # Check leave_requests
        cursor.execute("SELECT COUNT(*) FROM leave_requests")
        leave_count = cursor.fetchone()[0]
        print(f"Leave requests: {leave_count}")
        
        if leave_count > 0:
            cursor.execute("SELECT id, employee_id, status, start_date, end_date FROM leave_requests LIMIT 3")
            leaves = cursor.fetchall()
            for leave in leaves:
                print(f"  - ID: {leave[0]}, Employee: {leave[1]}, Status: {leave[2]}, Dates: {leave[3]} to {leave[4]}")
        
        # Check leave_balances
        cursor.execute("SELECT COUNT(*) FROM leave_balances")
        balance_count = cursor.fetchone()[0]
        print(f"Leave balances: {balance_count}")
        
        if balance_count > 0:
            cursor.execute("SELECT employee_id, leave_type, balance FROM leave_balances LIMIT 5")
            balances = cursor.fetchall()
            for balance in balances:
                print(f"  - Employee: {balance[0]}, Type: {balance[1]}, Balance: {balance[2]}")
        
        # Check holidays
        cursor.execute("SELECT COUNT(*) FROM holidays")
        holiday_count = cursor.fetchone()[0]
        print(f"Holidays: {holiday_count}")
        
        if holiday_count > 0:
            cursor.execute("SELECT name, date, type FROM holidays LIMIT 5")
            holidays = cursor.fetchall()
            for holiday in holidays:
                print(f"  - {holiday[0]}: {holiday[1]} ({holiday[2]})")
        
        conn.close()
        
        print("\n✅ Leave tables check completed successfully!")
        return True
        
    except Exception as e:
        print(f"❌ Error checking leave tables: {e}")
        return False

if __name__ == "__main__":
    check_leave_tables()