import { useState } from 'react';
import { useRoleCheck } from '../components/RoleGuard';
import RoleGuard from '../components/RoleGuard';
import SimpleAttendance from '../components/attendance/SimpleAttendance';
import AdminAttendanceDashboard from '../components/attendance/AdminAttendanceDashboard';

function AttendanceContent() {
  const { isAdmin, isHR, isManager } = useRoleCheck();
  
  // Show admin dashboard for admin, HR, and managers
  if (isAdmin() || isHR() || isManager()) {
    return <AdminAttendanceDashboard />;
  }
  
  // Show simple attendance for employees
  return <SimpleAttendance />;
}

export default function Attendance() {
  return (
    <RoleGuard 
      allowedRoles={['admin', 'hr', 'manager', 'employee']} 
      showError={true}
    >
      <AttendanceContent />
    </RoleGuard>
  );
}
