#!/usr/bin/env python3
"""
System Optimizer Script
Optimizes database performance, cleans up data, and improves system efficiency
"""

import psycopg2
import os
from datetime import datetime, timedelta
from dotenv import load_dotenv

load_dotenv()

class SystemOptimizer:
    def __init__(self):
        self.db_params = {
            'host': 'localhost',
            'database': 'hr_management_system',
            'user': 'postgres',
            'password': 'abhishek',
            'port': '5432'
        }

    def optimize_database(self):
        """Optimize database performance"""
        print("🚀 Optimizing Database Performance...")
        
        try:
            conn = psycopg2.connect(**self.db_params)
            conn.autocommit = True
            cursor = conn.cursor()
            
            # Update table statistics
            print("   📊 Updating table statistics...")
            cursor.execute("ANALYZE;")
            print("   ✅ Table statistics updated")
            
            # Vacuum database
            print("   🧹 Vacuuming database...")
            cursor.execute("VACUUM;")
            print("   ✅ Database vacuumed")
            
            # Reindex tables
            print("   🔄 Reindexing tables...")
            tables = ['users', 'employees', 'payroll', 'leave_requests', 'attendance']
            for table in tables:
                try:
                    cursor.execute(f"REINDEX TABLE {table};")
                    print(f"   ✅ Reindexed {table}")
                except psycopg2.Error as e:
                    print(f"   ⚠️ Could not reindex {table}: {e}")
            
            cursor.close()
            conn.close()
            
            return True
            
        except Exception as e:
            print(f"   ❌ Database optimization failed: {e}")
            return False

    def create_missing_indexes(self):
        """Create missing database indexes for better performance"""
        print("\n🔍 Creating Missing Indexes...")
        
        try:
            conn = psycopg2.connect(**self.db_params)
            cursor = conn.cursor()
            
            indexes = [
                ("idx_employees_user_id", "CREATE INDEX IF NOT EXISTS idx_employees_user_id ON employees(user_id);"),
                ("idx_employees_department", "CREATE INDEX IF NOT EXISTS idx_employees_department ON employees(department);"),
                ("idx_payroll_employee_month", "CREATE INDEX IF NOT EXISTS idx_payroll_employee_month ON payroll(employee_id, month);"),
                ("idx_payroll_status", "CREATE INDEX IF NOT EXISTS idx_payroll_status ON payroll(status);"),
                ("idx_leave_requests_employee", "CREATE INDEX IF NOT EXISTS idx_leave_requests_employee ON leave_requests(employee_id);"),
                ("idx_leave_requests_status", "CREATE INDEX IF NOT EXISTS idx_leave_requests_status ON leave_requests(status);"),
                ("idx_leave_requests_dates", "CREATE INDEX IF NOT EXISTS idx_leave_requests_dates ON leave_requests(start_date, end_date);"),
                ("idx_attendance_employee_date", "CREATE INDEX IF NOT EXISTS idx_attendance_employee_date ON attendance(employee_id, date);"),
                ("idx_attendance_date", "CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(date);"),
                ("idx_employee_documents_employee", "CREATE INDEX IF NOT EXISTS idx_employee_documents_employee ON employee_documents(employee_id);"),
                ("idx_employee_documents_type", "CREATE INDEX IF NOT EXISTS idx_employee_documents_type ON employee_documents(document_type);"),
                ("idx_users_email", "CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);"),
                ("idx_users_role", "CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);")
            ]
            
            created_count = 0
            for index_name, index_sql in indexes:
                try:
                    cursor.execute(index_sql)
                    print(f"   ✅ Created index: {index_name}")
                    created_count += 1
                except psycopg2.Error as e:
                    if "already exists" in str(e):
                        print(f"   ℹ️ Index already exists: {index_name}")
                    else:
                        print(f"   ⚠️ Failed to create {index_name}: {e}")
            
            conn.commit()
            cursor.close()
            conn.close()
            
            print(f"   📈 Created {created_count} new indexes")
            return True
            
        except Exception as e:
            print(f"   ❌ Index creation failed: {e}")
            return False

    def cleanup_old_data(self):
        """Clean up old and unnecessary data"""
        print("\n🧹 Cleaning Up Old Data...")
        
        try:
            conn = psycopg2.connect(**self.db_params)
            cursor = conn.cursor()
            
            # Clean up old attendance records (older than 2 years)
            cutoff_date = datetime.now() - timedelta(days=730)
            cursor.execute("DELETE FROM attendance WHERE date < %s;", (cutoff_date,))
            deleted_attendance = cursor.rowcount
            print(f"   🗑️ Deleted {deleted_attendance} old attendance records")
            
            # Clean up old notifications (older than 30 days)
            notification_cutoff = datetime.now() - timedelta(days=30)
            cursor.execute("DELETE FROM notifications WHERE created_at < %s;", (notification_cutoff,))
            deleted_notifications = cursor.rowcount
            print(f"   🗑️ Deleted {deleted_notifications} old notifications")
            
            # Clean up rejected leave requests (older than 1 year)
            leave_cutoff = datetime.now() - timedelta(days=365)
            cursor.execute("DELETE FROM leave_requests WHERE status = 'rejected' AND created_at < %s;", (leave_cutoff,))
            deleted_leaves = cursor.rowcount
            print(f"   🗑️ Deleted {deleted_leaves} old rejected leave requests")
            
            # Update statistics after cleanup
            cursor.execute("ANALYZE;")
            
            conn.commit()
            cursor.close()
            conn.close()
            
            total_deleted = deleted_attendance + deleted_notifications + deleted_leaves
            print(f"   ✅ Total records cleaned up: {total_deleted}")
            
            return True
            
        except Exception as e:
            print(f"   ❌ Data cleanup failed: {e}")
            return False

    def optimize_payroll_data(self):
        """Optimize payroll data structure and calculations"""
        print("\n💰 Optimizing Payroll Data...")
        
        try:
            conn = psycopg2.connect(**self.db_params)
            cursor = conn.cursor()
            
            # Update gross_salary for records where it's not calculated
            cursor.execute("""
                UPDATE payroll 
                SET gross_salary = COALESCE(basic_salary, 0) + COALESCE(hra, 0) + 
                                  COALESCE(transport_allowance, 0) + COALESCE(medical_allowance, 0) + 
                                  COALESCE(special_allowance, 0) + COALESCE(bonus, 0) + 
                                  COALESCE(overtime_amount, 0) + COALESCE(other_allowances, 0)
                WHERE gross_salary IS NULL OR gross_salary = 0;
            """)
            updated_gross = cursor.rowcount
            print(f"   ✅ Updated gross salary for {updated_gross} records")
            
            # Update total_deductions for records where it's not calculated
            cursor.execute("""
                UPDATE payroll 
                SET total_deductions = COALESCE(pf, 0) + COALESCE(esi, 0) + 
                                      COALESCE(professional_tax, 0) + COALESCE(income_tax, 0) + 
                                      COALESCE(loan_deduction, 0) + COALESCE(other_deductions, 0)
                WHERE total_deductions IS NULL OR total_deductions = 0;
            """)
            updated_deductions = cursor.rowcount
            print(f"   ✅ Updated total deductions for {updated_deductions} records")
            
            # Update net_salary for records where it's not calculated
            cursor.execute("""
                UPDATE payroll 
                SET net_salary = COALESCE(gross_salary, 0) - COALESCE(total_deductions, 0)
                WHERE net_salary IS NULL OR net_salary = 0;
            """)
            updated_net = cursor.rowcount
            print(f"   ✅ Updated net salary for {updated_net} records")
            
            conn.commit()
            cursor.close()
            conn.close()
            
            return True
            
        except Exception as e:
            print(f"   ❌ Payroll optimization failed: {e}")
            return False

    def optimize_leave_data(self):
        """Optimize leave management data"""
        print("\n🏖️ Optimizing Leave Data...")
        
        try:
            conn = psycopg2.connect(**self.db_params)
            cursor = conn.cursor()
            
            # Ensure all employees have leave balances
            cursor.execute("""
                INSERT INTO leave_balances (employee_id, leave_type, balance)
                SELECT e.id, 'Sick Leave', 10
                FROM employees e
                WHERE NOT EXISTS (
                    SELECT 1 FROM leave_balances lb 
                    WHERE lb.employee_id = e.id AND lb.leave_type = 'Sick Leave'
                );
            """)
            sick_added = cursor.rowcount
            
            cursor.execute("""
                INSERT INTO leave_balances (employee_id, leave_type, balance)
                SELECT e.id, 'Casual Leave', 12
                FROM employees e
                WHERE NOT EXISTS (
                    SELECT 1 FROM leave_balances lb 
                    WHERE lb.employee_id = e.id AND lb.leave_type = 'Casual Leave'
                );
            """)
            casual_added = cursor.rowcount
            
            cursor.execute("""
                INSERT INTO leave_balances (employee_id, leave_type, balance)
                SELECT e.id, 'Earned Leave', 15
                FROM employees e
                WHERE NOT EXISTS (
                    SELECT 1 FROM leave_balances lb 
                    WHERE lb.employee_id = e.id AND lb.leave_type = 'Earned Leave'
                );
            """)
            earned_added = cursor.rowcount
            
            print(f"   ✅ Added leave balances: {sick_added} sick, {casual_added} casual, {earned_added} earned")
            
            # Update holidays to current year if they're outdated
            current_year = datetime.now().year
            cursor.execute("SELECT COUNT(*) FROM holidays WHERE EXTRACT(YEAR FROM date) = %s;", (current_year,))
            current_year_holidays = cursor.fetchone()[0]
            
            if current_year_holidays == 0:
                holidays = [
                    (f"{current_year}-01-01", "New Year's Day", "public"),
                    (f"{current_year}-01-26", "Republic Day", "public"),
                    (f"{current_year}-08-15", "Independence Day", "public"),
                    (f"{current_year}-10-02", "Gandhi Jayanti", "public"),
                    (f"{current_year}-12-25", "Christmas Day", "public"),
                ]
                
                for holiday_date, name, holiday_type in holidays:
                    cursor.execute(
                        "INSERT INTO holidays (date, name, type) VALUES (%s, %s, %s) ON CONFLICT DO NOTHING;",
                        (holiday_date, name, holiday_type)
                    )
                
                print(f"   ✅ Added {len(holidays)} holidays for {current_year}")
            
            conn.commit()
            cursor.close()
            conn.close()
            
            return True
            
        except Exception as e:
            print(f"   ❌ Leave optimization failed: {e}")
            return False

    def generate_performance_report(self):
        """Generate performance optimization report"""
        print("\n📊 Performance Report:")
        
        try:
            conn = psycopg2.connect(**self.db_params)
            cursor = conn.cursor()
            
            # Database size
            cursor.execute("SELECT pg_size_pretty(pg_database_size('hr_management_system'));")
            db_size = cursor.fetchone()[0]
            print(f"   Database Size: {db_size}")
            
            # Table sizes and row counts
            cursor.execute("""
                SELECT 
                    schemaname,
                    tablename,
                    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
                    n_tup_ins as inserts,
                    n_tup_upd as updates,
                    n_tup_del as deletes
                FROM pg_tables t
                LEFT JOIN pg_stat_user_tables s ON t.tablename = s.relname
                WHERE schemaname = 'public' 
                ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
            """)
            
            print("   Table Statistics:")
            for row in cursor.fetchall():
                print(f"     {row[1]}: {row[2]} (I:{row[3] or 0}, U:{row[4] or 0}, D:{row[5] or 0})")
            
            # Index usage
            cursor.execute("""
                SELECT 
                    schemaname,
                    tablename,
                    indexname,
                    idx_scan as scans,
                    idx_tup_read as tuples_read,
                    idx_tup_fetch as tuples_fetched
                FROM pg_stat_user_indexes 
                WHERE schemaname = 'public'
                ORDER BY idx_scan DESC
                LIMIT 10;
            """)
            
            print("   Top Index Usage:")
            for row in cursor.fetchall():
                print(f"     {row[2]}: {row[3]} scans, {row[4]} reads")
            
            cursor.close()
            conn.close()
            
            return True
            
        except Exception as e:
            print(f"   ❌ Performance report failed: {e}")
            return False

    def run_full_optimization(self):
        """Run complete system optimization"""
        print("🔧 Starting Full System Optimization")
        print("=" * 50)
        
        optimizations = [
            ("Database Performance", self.optimize_database),
            ("Missing Indexes", self.create_missing_indexes),
            ("Data Cleanup", self.cleanup_old_data),
            ("Payroll Data", self.optimize_payroll_data),
            ("Leave Data", self.optimize_leave_data),
            ("Performance Report", self.generate_performance_report)
        ]
        
        results = []
        
        for name, func in optimizations:
            try:
                result = func()
                results.append((name, result))
            except Exception as e:
                print(f"❌ {name} failed: {e}")
                results.append((name, False))
        
        print("\n" + "=" * 50)
        print("📋 Optimization Summary:")
        
        success_count = 0
        for name, result in results:
            status = "✅ SUCCESS" if result else "❌ FAILED"
            print(f"   {name}: {status}")
            if result:
                success_count += 1
        
        print(f"\n🎯 Overall Success Rate: {success_count}/{len(results)} ({success_count/len(results)*100:.1f}%)")
        
        if success_count == len(results):
            print("🎉 All optimizations completed successfully!")
        else:
            print("⚠️ Some optimizations failed. Please review the errors above.")
        
        return success_count == len(results)

def main():
    optimizer = SystemOptimizer()
    optimizer.run_full_optimization()

if __name__ == "__main__":
    main()