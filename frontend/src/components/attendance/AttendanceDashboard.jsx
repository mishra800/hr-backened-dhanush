import { useState, useEffect } from 'react';
import { useRoleCheck } from '../RoleGuard';
import api from '../../api/axios';

export default function AttendanceDashboard() {
  const { user, isAdmin, isHR, isManager, isEmployee } = useRoleCheck();
  const [attendanceData, setAttendanceData] = useState([]);
  const [wfhRequests, setWfhRequests] = useState([]);
  const [flaggedAttendance, setFlaggedAttendance] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch data based on role
      if (isEmployee()) {
        // Employee: Only their own data
        const [attendanceRes, wfhRes] = await Promise.all([
          api.get('/attendance/my-attendance'),
          api.get('/attendance/wfh-requests')
        ]);
        setAttendanceData(attendanceRes.data);
        setWfhRequests(wfhRes.data);
      } else if (isManager() || isHR() || isAdmin()) {
        // Manager/HR/Admin: Team data + approval queues
        const [attendanceRes, wfhRes, flaggedRes] = await Promise.all([
          api.get('/attendance/team-attendance'),
          api.get('/attendance/wfh-requests/pending'),
          api.get('/attendance/flagged-attendance')
        ]);
        setAttendanceData(attendanceRes.data);
        setWfhRequests(wfhRes.data);
        setFlaggedAttendance(flaggedRes.data);
      }
    } catch (error) {
      console.error('Error fetching attendance data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApproveWFH = async (requestId, approved, comments = '') => {
    try {
      await api.put(`/attendance/wfh-requests/${requestId}/approve`, {
        status: approved ? 'approved' : 'rejected',
        comments
      });
      fetchData(); // Refresh data
    } catch (error) {
      console.error('Error approving WFH request:', error);
      alert('Failed to update WFH request');
    }
  };

  const handleApproveAttendance = async (attendanceId, approved, comments = '') => {
    try {
      await api.put(`/attendance/${attendanceId}/approve`, {
        approved,
        comments
      });
      fetchData(); // Refresh data
    } catch (error) {
      console.error('Error approving attendance:', error);
      alert('Failed to update attendance');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Role-specific header */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {isAdmin() && '👑 Admin Attendance Dashboard'}
              {isHR() && '💼 HR Attendance Console'}
              {isManager() && '👨‍💼 Manager Attendance Dashboard'}
              {isEmployee() && '👤 My Attendance'}
            </h1>
            <p className="text-gray-600 mt-1">
              {isAdmin() && 'Full system attendance management and oversight'}
              {isHR() && 'Employee attendance management and policy enforcement'}
              {isManager() && 'Team attendance monitoring and approvals'}
              {isEmployee() && 'View your attendance history and submit WFH requests'}
            </p>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-500">Role</div>
            <div className="font-semibold text-lg capitalize">{user?.role}</div>
          </div>
        </div>
      </div>

      {/* Employee View */}
      {isEmployee() && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Quick Actions */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
            <div className="space-y-3">
              <a
                href="/dashboard/attendance"
                className="block w-full bg-blue-600 text-white text-center py-3 rounded-lg hover:bg-blue-700 transition"
              >
                📅 Mark Attendance
              </a>
              <a
                href="/dashboard/wfh-request"
                className="block w-full bg-green-600 text-white text-center py-3 rounded-lg hover:bg-green-700 transition"
              >
                🏠 Request WFH
              </a>
            </div>
          </div>

          {/* Recent Attendance */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">Recent Attendance</h2>
            <div className="space-y-3">
              {attendanceData.slice(0, 5).map((record) => (
                <div key={record.id} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                  <div>
                    <div className="font-medium">{new Date(record.date).toLocaleDateString()}</div>
                    <div className="text-sm text-gray-600">{record.work_mode.toUpperCase()}</div>
                  </div>
                  <div className={`px-2 py-1 rounded text-sm font-medium ${
                    record.status === 'present' ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'
                  }`}>
                    {record.status.toUpperCase()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Manager/HR/Admin View */}
      {(isManager() || isHR() || isAdmin()) && (
        <div className="space-y-6">
          {/* Pending Approvals */}
          {(wfhRequests.length > 0 || flaggedAttendance.length > 0) && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4 text-orange-600">
                ⚠️ Pending Approvals ({wfhRequests.length + flaggedAttendance.length})
              </h2>
              
              {/* WFH Requests */}
              {wfhRequests.length > 0 && (
                <div className="mb-6">
                  <h3 className="font-medium mb-3">WFH Requests</h3>
                  <div className="space-y-3">
                    {wfhRequests.map((request) => (
                      <div key={request.id} className="border border-orange-200 rounded-lg p-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="font-medium">{request.employee?.first_name} {request.employee?.last_name}</div>
                            <div className="text-sm text-gray-600">
                              Date: {new Date(request.request_date).toLocaleDateString()}
                            </div>
                            <div className="text-sm text-gray-600 mt-1">{request.reason}</div>
                          </div>
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleApproveWFH(request.id, true)}
                              className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleApproveWFH(request.id, false)}
                              className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
                            >
                              Reject
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Flagged Attendance */}
              {flaggedAttendance.length > 0 && (
                <div>
                  <h3 className="font-medium mb-3">Late Attendance</h3>
                  <div className="space-y-3">
                    {flaggedAttendance.map((record) => (
                      <div key={record.id} className="border border-orange-200 rounded-lg p-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="font-medium">{record.employee?.first_name} {record.employee?.last_name}</div>
                            <div className="text-sm text-gray-600">
                              Date: {new Date(record.date).toLocaleDateString()}
                            </div>
                            <div className="text-sm text-gray-600">
                              Check-in: {new Date(record.check_in).toLocaleTimeString()}
                            </div>
                          </div>
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleApproveAttendance(record.id, true)}
                              className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleApproveAttendance(record.id, false)}
                              className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
                            >
                              Reject
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Team Attendance Overview */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">Today's Team Attendance</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Employee
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Check-in
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Mode
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {attendanceData.map((record) => (
                    <tr key={record.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {record.employee?.first_name} {record.employee?.last_name}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {record.check_in ? new Date(record.check_in).toLocaleTimeString() : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          record.status === 'present' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-orange-100 text-orange-800'
                        }`}>
                          {record.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {record.work_mode?.toUpperCase() || 'OFFICE'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}