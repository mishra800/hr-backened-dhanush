#!/usr/bin/env python3
"""
System Monitor Script
Monitors the HR system health, performance, and provides real-time diagnostics
"""

import psutil
import psycopg2
import requests
import time
import json
from datetime import datetime
from dotenv import load_dotenv
import os

load_dotenv()

class SystemMonitor:
    def __init__(self):
        self.db_params = {
            'host': 'localhost',
            'database': 'hr_management_system',
            'user': 'postgres',
            'password': 'abhishek',
            'port': '5432'
        }
        self.backend_url = "http://localhost:8000"
        self.frontend_url = "http://localhost:5173"

    def check_system_resources(self):
        """Check system CPU, memory, and disk usage"""
        print("🖥️  System Resources:")
        
        # CPU Usage
        cpu_percent = psutil.cpu_percent(interval=1)
        print(f"   CPU Usage: {cpu_percent}%")
        
        # Memory Usage
        memory = psutil.virtual_memory()
        print(f"   Memory Usage: {memory.percent}% ({memory.used // (1024**3)}GB / {memory.total // (1024**3)}GB)")
        
        # Disk Usage
        disk = psutil.disk_usage('/')
        print(f"   Disk Usage: {disk.percent}% ({disk.used // (1024**3)}GB / {disk.total // (1024**3)}GB)")
        
        # Network
        network = psutil.net_io_counters()
        print(f"   Network: Sent {network.bytes_sent // (1024**2)}MB, Received {network.bytes_recv // (1024**2)}MB")
        
        return {
            'cpu': cpu_percent,
            'memory': memory.percent,
            'disk': disk.percent
        }

    def check_database_performance(self):
        """Check database performance metrics"""
        print("\n🗄️  Database Performance:")
        
        try:
            conn = psycopg2.connect(**self.db_params)
            cursor = conn.cursor()
            
            # Database size
            cursor.execute("SELECT pg_size_pretty(pg_database_size('hr_management_system'));")
            db_size = cursor.fetchone()[0]
            print(f"   Database Size: {db_size}")
            
            # Active connections
            cursor.execute("""
                SELECT count(*) as active_connections,
                       count(*) FILTER (WHERE state = 'active') as active_queries,
                       count(*) FILTER (WHERE state = 'idle') as idle_connections
                FROM pg_stat_activity 
                WHERE datname = 'hr_management_system';
            """)
            conn_stats = cursor.fetchone()
            print(f"   Connections: {conn_stats[0]} total, {conn_stats[1]} active, {conn_stats[2]} idle")
            
            # Table sizes
            cursor.execute("""
                SELECT schemaname,tablename,
                       pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
                FROM pg_tables 
                WHERE schemaname = 'public' 
                ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC 
                LIMIT 5;
            """)
            
            print("   Largest Tables:")
            for row in cursor.fetchall():
                print(f"     {row[1]}: {row[2]}")
            
            # Recent activity
            cursor.execute("""
                SELECT count(*) as queries_last_hour
                FROM pg_stat_activity 
                WHERE query_start > NOW() - INTERVAL '1 hour'
                AND datname = 'hr_management_system';
            """)
            recent_queries = cursor.fetchone()[0]
            print(f"   Queries (last hour): {recent_queries}")
            
            cursor.close()
            conn.close()
            
            return True
            
        except Exception as e:
            print(f"   ❌ Database check failed: {e}")
            return False

    def check_api_endpoints(self):
        """Check critical API endpoints"""
        print("\n🌐 API Endpoints Health:")
        
        endpoints = [
            ("/", "Root"),
            ("/docs", "API Documentation"),
            ("/health", "Health Check"),
            ("/users/me", "User Profile"),
            ("/leave/holidays", "Leave Holidays"),
            ("/attendance/dashboard", "Attendance Dashboard"),
            ("/payroll/summary/2025-01", "Payroll Summary")
        ]
        
        healthy_endpoints = 0
        
        for endpoint, name in endpoints:
            try:
                response = requests.get(f"{self.backend_url}{endpoint}", timeout=5)
                if response.status_code in [200, 401, 404]:  # 401 is expected for protected endpoints
                    status = "✅"
                    healthy_endpoints += 1
                else:
                    status = f"⚠️ ({response.status_code})"
                
                print(f"   {status} {name}: {endpoint}")
                
            except requests.exceptions.ConnectionError:
                print(f"   ❌ {name}: Connection refused (server not running?)")
            except requests.exceptions.Timeout:
                print(f"   ⏱️ {name}: Timeout")
            except Exception as e:
                print(f"   ❌ {name}: {str(e)}")
        
        print(f"   Summary: {healthy_endpoints}/{len(endpoints)} endpoints healthy")
        return healthy_endpoints / len(endpoints)

    def check_frontend_status(self):
        """Check frontend server status"""
        print("\n🎨 Frontend Status:")
        
        try:
            response = requests.get(self.frontend_url, timeout=5)
            if response.status_code == 200:
                print("   ✅ Frontend server is running")
                return True
            else:
                print(f"   ⚠️ Frontend returned status {response.status_code}")
                return False
        except requests.exceptions.ConnectionError:
            print("   ❌ Frontend server not accessible (not running?)")
            return False
        except Exception as e:
            print(f"   ❌ Frontend check failed: {e}")
            return False

    def check_data_integrity(self):
        """Check data integrity and consistency"""
        print("\n🔍 Data Integrity:")
        
        try:
            conn = psycopg2.connect(**self.db_params)
            cursor = conn.cursor()
            
            # Check for orphaned records
            checks = [
                ("Orphaned Employees", """
                    SELECT COUNT(*) FROM employees e 
                    LEFT JOIN users u ON e.user_id = u.id 
                    WHERE u.id IS NULL
                """),
                ("Orphaned Leave Requests", """
                    SELECT COUNT(*) FROM leave_requests lr 
                    LEFT JOIN employees e ON lr.employee_id = e.id 
                    WHERE e.id IS NULL
                """),
                ("Orphaned Payroll Records", """
                    SELECT COUNT(*) FROM payroll p 
                    LEFT JOIN employees e ON p.employee_id = e.id 
                    WHERE e.id IS NULL
                """),
                ("Users without Employees", """
                    SELECT COUNT(*) FROM users u 
                    LEFT JOIN employees e ON u.id = e.user_id 
                    WHERE e.id IS NULL AND u.role != 'candidate'
                """)
            ]
            
            issues_found = 0
            for check_name, query in checks:
                cursor.execute(query)
                count = cursor.fetchone()[0]
                if count > 0:
                    print(f"   ⚠️ {check_name}: {count} issues found")
                    issues_found += count
                else:
                    print(f"   ✅ {check_name}: No issues")
            
            cursor.close()
            conn.close()
            
            if issues_found == 0:
                print("   🎉 All data integrity checks passed!")
            
            return issues_found == 0
            
        except Exception as e:
            print(f"   ❌ Data integrity check failed: {e}")
            return False

    def generate_report(self):
        """Generate comprehensive system report"""
        print("=" * 60)
        print(f"🏥 HR System Health Report - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print("=" * 60)
        
        # System resources
        resources = self.check_system_resources()
        
        # Database performance
        db_healthy = self.check_database_performance()
        
        # API endpoints
        api_health = self.check_api_endpoints()
        
        # Frontend status
        frontend_healthy = self.check_frontend_status()
        
        # Data integrity
        data_healthy = self.check_data_integrity()
        
        # Overall health score
        print("\n📊 Overall Health Score:")
        
        scores = []
        
        # Resource score (lower is better for usage)
        resource_score = max(0, 100 - max(resources['cpu'], resources['memory'], resources['disk']))
        scores.append(resource_score)
        print(f"   System Resources: {resource_score:.1f}/100")
        
        # Database score
        db_score = 100 if db_healthy else 0
        scores.append(db_score)
        print(f"   Database Health: {db_score:.1f}/100")
        
        # API score
        api_score = api_health * 100
        scores.append(api_score)
        print(f"   API Endpoints: {api_score:.1f}/100")
        
        # Frontend score
        frontend_score = 100 if frontend_healthy else 0
        scores.append(frontend_score)
        print(f"   Frontend Status: {frontend_score:.1f}/100")
        
        # Data integrity score
        data_score = 100 if data_healthy else 0
        scores.append(data_score)
        print(f"   Data Integrity: {data_score:.1f}/100")
        
        # Overall score
        overall_score = sum(scores) / len(scores)
        print(f"\n🎯 Overall System Health: {overall_score:.1f}/100")
        
        if overall_score >= 90:
            print("   🟢 Excellent - System is running optimally")
        elif overall_score >= 75:
            print("   🟡 Good - System is running well with minor issues")
        elif overall_score >= 50:
            print("   🟠 Fair - System has some issues that need attention")
        else:
            print("   🔴 Poor - System has critical issues requiring immediate attention")
        
        print("\n" + "=" * 60)
        
        return {
            'timestamp': datetime.now().isoformat(),
            'overall_score': overall_score,
            'resource_score': resource_score,
            'database_healthy': db_healthy,
            'api_health': api_health,
            'frontend_healthy': frontend_healthy,
            'data_healthy': data_healthy
        }

    def continuous_monitoring(self, interval=300):
        """Run continuous monitoring with specified interval (seconds)"""
        print(f"🔄 Starting continuous monitoring (every {interval} seconds)")
        print("Press Ctrl+C to stop")
        
        try:
            while True:
                report = self.generate_report()
                
                # Log to file
                log_file = f"system_health_{datetime.now().strftime('%Y%m%d')}.log"
                with open(log_file, 'a') as f:
                    f.write(f"{json.dumps(report)}\n")
                
                print(f"\n⏰ Next check in {interval} seconds...")
                time.sleep(interval)
                
        except KeyboardInterrupt:
            print("\n🛑 Monitoring stopped by user")

def main():
    monitor = SystemMonitor()
    
    import sys
    if len(sys.argv) > 1 and sys.argv[1] == '--continuous':
        interval = int(sys.argv[2]) if len(sys.argv) > 2 else 300
        monitor.continuous_monitoring(interval)
    else:
        monitor.generate_report()

if __name__ == "__main__":
    main()