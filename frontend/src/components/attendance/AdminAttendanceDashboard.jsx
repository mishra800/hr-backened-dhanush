import { useState, useEffect } from 'react';
import { useRoleCheck } from '../RoleGuard';
import api from '../../api/axios';

export default function AdminAttendanceDashboard() {
  const { user, isAdmin, isHR, isManager } = useRoleCheck();
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Data states
  const [realTimeStatus, setRealTimeStatus] = useState(null);
  const [teamAttendance, setTeamAttendance] = useState([]);
  const [wfhRequests, setWfhRequests] = useState([]);
  const [flaggedAttendance, setFlaggedAttendance] = useState([]);
  const [correctionRequests, setCorrectionRequests] = useState([]);

  useEffect(() => {
    fetchData();
    // Set up real-time updates every 30 seconds
    const interval = setInterval(fetchRealTimeStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        fetchRealTimeStatus(),
        fetchTeamAttendance(),
        fetchPendingApprovals()
      ]);
    } catch (err) {
      setError('Failed to load attendance data');
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchRealTimeStatus = async () => {
    try {
      const response = await api.get('/attendance/real-time-status');
      setRealTimeStatus(response.data);
    } catch (err) {
      console.error('Error fetching real-time status:', err);
    }
  };

  const fetchTeamAttendance = async () => {
    try {
      const response = await api.get('/attendance/team-attendance');
      setTeamAttendance(response.data);
    } catch (err) {
      console.error('Error fetching team attendance:', err);
    }
  };

  const fetchPendingApprovals = async () => {
    try {
      const [wfhRes, flaggedRes, correctionRes] = await Promise.all([
        api.get('/attendance/wfh-requests/pending'),
        api.get('/attendance/flagged-attendance'),
        api.get('/attendance/correction-requests')
      ]);
      setWfhRequests(wfhRes.data);
      setFlaggedAttendance(flaggedRes.data);
      setCorrectionRequests(correctionRes.data);
    } catch (err) {
      console.error('Error fetching pending approvals:', err);
    }
  };

  const handleApproveWFH = async (requestId, approved, comments = '') => {
    try {
      await api.put(`/attendance/wfh-requests/${requestId}/approve`, {
        status: approved ? 'approved' : 'rejected',
        comments
      });
      await fetchPendingApprovals();
      alert(`WFH request ${approved ? 'approved' : 'rejected'} successfully!`);
    } catch (error) {
      alert('Failed to update WFH request');
    }
  };

  const handleApproveAttendance = async (attendanceId, approved, comments = '') => {
    try {
      await api.put(`/attendance/${attendanceId}/approve`, {
        approved,
        comments
      });
      await fetchPendingApprovals();
      await fetchTeamAttendance();
      alert(`Attendance ${approved ? 'approved' : 'rejected'} successfully!`);
    } catch (error) {
      alert('Failed to update attendance');
    }
  };

  const handleApproveCorrection = async (correctionId, approved, comments = '') => {
    try {
      await api.put(`/attendance/correction-requests/${correctionId}/approve`, {
        status: approved ? 'approved' : 'rejected',
        comments
      });
      await fetchPendingApprovals();
      alert(`Correction request ${approved ? 'approved' : 'rejected'} successfully!`);
    } catch (error) {
      alert('Failed to update correction request');
    }
  };

  const exportAttendance = async () => {
    try {
      const startDate = new Date();
      startDate.setDate(1); // First day of current month
      const endDate = new Date();
      
      const response = await api.get('/attendance/export/csv', {
        params: {
          start_date: startDate.toISOString().split('T')[0],
          end_date: endDate.toISOString().split('T')[0]
        },
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `attendance_${startDate.toISOString().split('T')[0]}_${endDate.toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      alert('Failed to export attendance data');
    }
  };

  const tabs = [
    { id: 'overview', label: '📊 Overview', icon: '📊' },
    { id: 'approvals', label: '⚠️ Approvals', icon: '⚠️', count: wfhRequests.length + flaggedAttendance.length + correctionRequests.length },
    { id: 'team', label: '👥 Team Attendance', icon: '👥' },
    { id: 'reports', label: '📈 Reports', icon: '📈' }
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading attendance dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {isAdmin() && '👑 Admin Attendance Management'}
                {isHR() && '💼 HR Attendance Console'}
                {isManager() && '👨‍💼 Manager Dashboard'}
              </h1>
              <p className="text-sm text-gray-600">
                Comprehensive attendance oversight and management
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={exportAttendance}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition flex items-center"
              >
                📥 Export CSV
              </button>
              <div className="text-sm text-gray-500">
                {new Date().toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </div>
              <div className="text-lg font-semibold text-blue-600">
                {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors relative ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label}
                {tab.count > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* Overview Tab */}
        {activeTab === 'overview' && realTimeStatus && (
          <div className="space-y-6">
            {/* Quick Actions for Admin */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <button
                  onClick={() => window.location.href = '/dashboard/attendance-hub'}
                  className="bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition"
                >
                  📅 Mark My Attendance
                </button>
                <button
                  onClick={() => setActiveTab('approvals')}
                  className="bg-orange-600 text-white py-3 rounded-lg font-semibold hover:bg-orange-700 transition"
                >
                  ⚠️ Review Approvals ({wfhRequests.length + flaggedAttendance.length + correctionRequests.length})
                </button>
                <button
                  onClick={exportAttendance}
                  className="bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 transition"
                >
                  📥 Export Data
                </button>
              </div>
            </div>
            {/* Real-time Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                      <span className="text-green-600 font-bold">✓</span>
                    </div>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Present Today</p>
                    <p className="text-2xl font-bold text-gray-900">{realTimeStatus.summary.present_count}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                      <span className="text-orange-600 font-bold">⏰</span>
                    </div>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Late Today</p>
                    <p className="text-2xl font-bold text-gray-900">{realTimeStatus.summary.late_count}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-blue-600 font-bold">🏠</span>
                    </div>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">WFH Today</p>
                    <p className="text-2xl font-bold text-gray-900">{realTimeStatus.summary.wfh_count}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                      <span className="text-red-600 font-bold">✗</span>
                    </div>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Absent Today</p>
                    <p className="text-2xl font-bold text-gray-900">{realTimeStatus.summary.absent_count}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Attendance Rate */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-4">Today's Attendance Rate</h3>
              <div className="flex items-center">
                <div className="flex-1 bg-gray-200 rounded-full h-4">
                  <div 
                    className="bg-green-600 h-4 rounded-full transition-all duration-500"
                    style={{ width: `${realTimeStatus.summary.attendance_rate}%` }}
                  ></div>
                </div>
                <span className="ml-4 text-2xl font-bold text-green-600">
                  {realTimeStatus.summary.attendance_rate}%
                </span>
              </div>
            </div>

            {/* Recent Check-ins */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-4">Recent Check-ins</h3>
              <div className="space-y-3">
                {realTimeStatus.recent_checkins.map((checkin, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                        <span className="text-blue-600 font-bold">
                          {checkin.employee_name.split(' ').map(n => n[0]).join('')}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium">{checkin.employee_name}</p>
                        <p className="text-sm text-gray-600">{checkin.check_in_time}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        checkin.status === 'present' ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'
                      }`}>
                        {checkin.status.toUpperCase()}
                      </span>
                      <span className="text-xs text-gray-500">{checkin.work_mode.toUpperCase()}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Approvals Tab */}
        {activeTab === 'approvals' && (
          <div className="space-y-6">
            {/* WFH Requests */}
            {wfhRequests.length > 0 && (
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold mb-4 text-orange-600">
                  🏠 Pending WFH Requests ({wfhRequests.length})
                </h3>
                <div className="space-y-4">
                  {wfhRequests.map((request) => (
                    <div key={request.id} className="border border-orange-200 rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center mb-2">
                            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                              <span className="text-blue-600 text-sm font-bold">
                                {request.employee?.first_name?.[0]}{request.employee?.last_name?.[0]}
                              </span>
                            </div>
                            <div>
                              <p className="font-medium">{request.employee?.first_name} {request.employee?.last_name}</p>
                              <p className="text-sm text-gray-600">{request.employee?.department}</p>
                            </div>
                          </div>
                          <div className="ml-11">
                            <p className="text-sm text-gray-600">
                              <strong>Date:</strong> {new Date(request.request_date).toLocaleDateString()}
                            </p>
                            <p className="text-sm text-gray-600 mt-1">
                              <strong>Reason:</strong> {request.reason}
                            </p>
                            <p className="text-xs text-gray-500 mt-2">
                              Requested: {new Date(request.created_at).toLocaleString()}
                            </p>
                          </div>
                        </div>
                        <div className="flex space-x-2 ml-4">
                          <button
                            onClick={() => handleApproveWFH(request.id, true)}
                            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition"
                          >
                            ✓ Approve
                          </button>
                          <button
                            onClick={() => {
                              const comments = prompt('Rejection reason (optional):');
                              handleApproveWFH(request.id, false, comments || '');
                            }}
                            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition"
                          >
                            ✗ Reject
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
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold mb-4 text-red-600">
                  ⏰ Late Attendance Requiring Approval ({flaggedAttendance.length})
                </h3>
                <div className="space-y-4">
                  {flaggedAttendance.map((record) => (
                    <div key={record.id} className="border border-red-200 rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center mb-2">
                            <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center mr-3">
                              <span className="text-red-600 text-sm font-bold">
                                {record.employee?.first_name?.[0]}{record.employee?.last_name?.[0]}
                              </span>
                            </div>
                            <div>
                              <p className="font-medium">{record.employee?.first_name} {record.employee?.last_name}</p>
                              <p className="text-sm text-gray-600">{record.employee?.department}</p>
                            </div>
                          </div>
                          <div className="ml-11">
                            <p className="text-sm text-gray-600">
                              <strong>Date:</strong> {new Date(record.date).toLocaleDateString()}
                            </p>
                            <p className="text-sm text-gray-600">
                              <strong>Check-in:</strong> {new Date(record.check_in).toLocaleTimeString()}
                            </p>
                            <p className="text-sm text-red-600 font-medium">
                              Late by: {Math.round((new Date(record.check_in) - new Date(record.date).setHours(11, 0, 0, 0)) / (1000 * 60))} minutes
                            </p>
                          </div>
                        </div>
                        <div className="flex space-x-2 ml-4">
                          <button
                            onClick={() => handleApproveAttendance(record.id, true)}
                            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition"
                          >
                            ✓ Approve
                          </button>
                          <button
                            onClick={() => {
                              const comments = prompt('Rejection reason (optional):');
                              handleApproveAttendance(record.id, false, comments || '');
                            }}
                            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition"
                          >
                            ✗ Reject
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Correction Requests */}
            {correctionRequests.length > 0 && (
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold mb-4 text-blue-600">
                  📝 Attendance Correction Requests ({correctionRequests.length})
                </h3>
                <div className="space-y-4">
                  {correctionRequests.map((correction) => (
                    <div key={correction.id} className="border border-blue-200 rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center mb-2">
                            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                              <span className="text-blue-600 text-sm font-bold">
                                {correction.employee?.first_name?.[0]}{correction.employee?.last_name?.[0]}
                              </span>
                            </div>
                            <div>
                              <p className="font-medium">{correction.employee?.first_name} {correction.employee?.last_name}</p>
                              <p className="text-sm text-gray-600">{correction.employee?.department}</p>
                            </div>
                          </div>
                          <div className="ml-11">
                            <p className="text-sm text-gray-600 mb-2">
                              <strong>Reason:</strong> {correction.reason}
                            </p>
                            {correction.requested_check_in && (
                              <p className="text-sm text-gray-600">
                                <strong>Requested Check-in:</strong> {new Date(correction.requested_check_in).toLocaleString()}
                              </p>
                            )}
                            {correction.requested_check_out && (
                              <p className="text-sm text-gray-600">
                                <strong>Requested Check-out:</strong> {new Date(correction.requested_check_out).toLocaleString()}
                              </p>
                            )}
                            <p className="text-xs text-gray-500 mt-2">
                              Requested: {new Date(correction.created_at).toLocaleString()}
                            </p>
                          </div>
                        </div>
                        <div className="flex space-x-2 ml-4">
                          <button
                            onClick={() => {
                              const comments = prompt('Approval comments (optional):');
                              handleApproveCorrection(correction.id, true, comments || '');
                            }}
                            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition"
                          >
                            ✓ Approve
                          </button>
                          <button
                            onClick={() => {
                              const comments = prompt('Rejection reason (optional):');
                              handleApproveCorrection(correction.id, false, comments || '');
                            }}
                            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition"
                          >
                            ✗ Reject
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* No pending approvals */}
            {wfhRequests.length === 0 && flaggedAttendance.length === 0 && correctionRequests.length === 0 && (
              <div className="bg-white rounded-lg shadow p-12 text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">✅</span>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">All Caught Up!</h3>
                <p className="text-gray-600">No pending approvals at the moment.</p>
              </div>
            )}
          </div>
        )}

        {/* Team Attendance Tab */}
        {activeTab === 'team' && (
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold">Today's Team Attendance</h3>
            </div>
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
                      Check-out
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Mode
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Hours
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {teamAttendance.map((record) => (
                    <tr key={record.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                            <span className="text-blue-600 text-sm font-bold">
                              {record.employee?.first_name?.[0]}{record.employee?.last_name?.[0]}
                            </span>
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {record.employee?.first_name} {record.employee?.last_name}
                            </div>
                            <div className="text-sm text-gray-500">{record.employee?.department}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {record.check_in ? new Date(record.check_in).toLocaleTimeString() : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {record.check_out ? new Date(record.check_out).toLocaleTimeString() : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          record.status === 'present' 
                            ? 'bg-green-100 text-green-800' 
                            : record.status === 'late'
                            ? 'bg-orange-100 text-orange-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {record.status?.toUpperCase() || 'ABSENT'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          record.work_mode === 'wfh' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {record.work_mode?.toUpperCase() || 'OFFICE'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {record.working_hours ? `${record.working_hours.toFixed(1)}h` : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Reports Tab */}
        {activeTab === 'reports' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold mb-4">📊 Personal Reports</h3>
                <p className="text-gray-600 mb-4">Individual employee attendance reports</p>
                <button 
                  onClick={() => window.location.href = '/dashboard/attendance-hub?tab=reports'}
                  className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition"
                >
                  View Reports
                </button>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold mb-4">📈 Analytics</h3>
                <p className="text-gray-600 mb-4">Team attendance analytics and trends</p>
                <button 
                  onClick={() => window.location.href = '/dashboard/attendance-hub?tab=reports'}
                  className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700 transition"
                >
                  View Analytics
                </button>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold mb-4">📋 Compliance</h3>
                <p className="text-gray-600 mb-4">Regulatory compliance reports</p>
                <button 
                  onClick={async () => {
                    try {
                      const startDate = prompt('Start date (YYYY-MM-DD):', new Date().toISOString().split('T')[0]);
                      const endDate = prompt('End date (YYYY-MM-DD):', new Date().toISOString().split('T')[0]);
                      if (startDate && endDate) {
                        const response = await api.get('/attendance/compliance-report', {
                          params: { start_date: startDate, end_date: endDate }
                        });
                        console.log('Compliance Report:', response.data);
                        alert('Compliance report generated! Check console for details.');
                      }
                    } catch (error) {
                      alert('Failed to generate compliance report');
                    }
                  }}
                  className="w-full bg-purple-600 text-white py-2 rounded hover:bg-purple-700 transition"
                >
                  Generate Report
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}