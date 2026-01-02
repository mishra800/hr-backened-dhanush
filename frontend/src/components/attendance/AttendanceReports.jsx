import { useState, useEffect } from 'react';
import { useRoleCheck } from '../RoleGuard';
import api from '../../api/axios';

export default function AttendanceReports() {
  const { user, isEmployee, isManager, isHR, isAdmin } = useRoleCheck();
  const [selectedReport, setSelectedReport] = useState('personal');
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (selectedReport) {
      fetchReportData();
    }
  }, [selectedReport, dateRange]);

  const fetchReportData = async () => {
    try {
      setLoading(true);
      let endpoint = '';
      
      switch (selectedReport) {
        case 'personal':
          endpoint = '/attendance/reports/personal';
          break;
        case 'team':
          endpoint = '/attendance/reports/team';
          break;
        case 'analytics':
          endpoint = '/attendance/reports/analytics';
          break;
        case 'wfh':
          endpoint = '/attendance/reports/wfh-analytics';
          break;
        default:
          return;
      }
      
      const res = await api.get(endpoint, {
        params: {
          start_date: dateRange.start,
          end_date: dateRange.end
        }
      });
      
      setReportData(res.data);
    } catch (error) {
      console.error('Error fetching report data:', error);
      setReportData(null);
    } finally {
      setLoading(false);
    }
  };

  const exportReport = async (format) => {
    try {
      const res = await api.get(`/attendance/reports/${selectedReport}/export`, {
        params: {
          start_date: dateRange.start,
          end_date: dateRange.end,
          format
        },
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `attendance_report_${selectedReport}_${dateRange.start}_${dateRange.end}.${format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      alert('Failed to export report');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center">
              📊 Attendance Reports & Analytics
            </h1>
            <p className="text-gray-600 mt-1">
              Comprehensive attendance insights and analytics
            </p>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => exportReport('csv')}
              disabled={!reportData || loading}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 text-sm"
            >
              📄 Export CSV
            </button>
            <button
              onClick={() => exportReport('pdf')}
              disabled={!reportData || loading}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-400 text-sm"
            >
              📑 Export PDF
            </button>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Report Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Report Type
            </label>
            <select
              value={selectedReport}
              onChange={(e) => setSelectedReport(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="personal">📋 Personal Attendance</option>
              {(isManager() || isHR() || isAdmin()) && (
                <>
                  <option value="team">👥 Team Attendance</option>
                  <option value="analytics">📈 Attendance Analytics</option>
                  <option value="wfh">🏠 WFH Analytics</option>
                </>
              )}
            </select>
          </div>

          {/* Date Range */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Start Date
            </label>
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange({...dateRange, start: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              End Date
            </label>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange({...dateRange, end: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Report Content */}
      <div className="bg-white rounded-lg shadow">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : reportData ? (
          <div className="p-6">
            {selectedReport === 'personal' && <PersonalReport data={reportData} />}
            {selectedReport === 'team' && <TeamReport data={reportData} />}
            {selectedReport === 'analytics' && <AnalyticsReport data={reportData} />}
            {selectedReport === 'wfh' && <WFHAnalyticsReport data={reportData} />}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="text-4xl mb-4">📊</div>
            <p className="text-gray-600">Select a report type and date range to view data</p>
          </div>
        )}
      </div>
    </div>
  );
}

// Personal Attendance Report
function PersonalReport({ data }) {
  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-blue-50 rounded-lg p-4">
          <div className="text-2xl font-bold text-blue-900">{data.summary.totalDays}</div>
          <div className="text-sm text-blue-600">Total Days</div>
        </div>
        <div className="bg-green-50 rounded-lg p-4">
          <div className="text-2xl font-bold text-green-900">{data.summary.presentDays}</div>
          <div className="text-sm text-green-600">Present Days</div>
        </div>
        <div className="bg-orange-50 rounded-lg p-4">
          <div className="text-2xl font-bold text-orange-900">{data.summary.lateDays}</div>
          <div className="text-sm text-orange-600">Late Days</div>
        </div>
        <div className="bg-purple-50 rounded-lg p-4">
          <div className="text-2xl font-bold text-purple-900">{data.summary.wfhDays}</div>
          <div className="text-sm text-purple-600">WFH Days</div>
        </div>
      </div>

      {/* Attendance Percentage */}
      <div className="bg-gray-50 rounded-lg p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">Attendance Rate</span>
          <span className="text-sm font-bold text-gray-900">{data.summary.attendanceRate}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-green-600 h-2 rounded-full" 
            style={{ width: `${data.summary.attendanceRate}%` }}
          ></div>
        </div>
      </div>

      {/* Recent Attendance */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Recent Attendance</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Check-in</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Check-out</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Hours</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Mode</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {data.records.map((record) => (
                <tr key={record.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Date(record.date).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {record.check_in ? new Date(record.check_in).toLocaleTimeString() : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {record.check_out ? new Date(record.check_out).toLocaleTimeString() : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {record.hours || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      record.status === 'present' ? 'bg-green-100 text-green-800' :
                      record.status === 'late' ? 'bg-orange-100 text-orange-800' :
                      'bg-red-100 text-red-800'
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
  );
}

// Team Attendance Report
function TeamReport({ data }) {
  return (
    <div className="space-y-6">
      {/* Team Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-blue-50 rounded-lg p-4">
          <div className="text-2xl font-bold text-blue-900">{data.summary.totalEmployees}</div>
          <div className="text-sm text-blue-600">Total Employees</div>
        </div>
        <div className="bg-green-50 rounded-lg p-4">
          <div className="text-2xl font-bold text-green-900">{data.summary.presentToday}</div>
          <div className="text-sm text-green-600">Present Today</div>
        </div>
        <div className="bg-orange-50 rounded-lg p-4">
          <div className="text-2xl font-bold text-orange-900">{data.summary.lateToday}</div>
          <div className="text-sm text-orange-600">Late Today</div>
        </div>
        <div className="bg-red-50 rounded-lg p-4">
          <div className="text-2xl font-bold text-red-900">{data.summary.absentToday}</div>
          <div className="text-sm text-red-600">Absent Today</div>
        </div>
      </div>

      {/* Team Attendance Table */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Team Attendance Overview</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employee</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Department</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Attendance Rate</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Present Days</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Late Days</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">WFH Days</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {data.employees.map((employee) => (
                <tr key={employee.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {employee.first_name} {employee.last_name}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {employee.department || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="text-sm font-medium text-gray-900 mr-2">
                        {employee.attendanceRate}%
                      </div>
                      <div className="w-16 bg-gray-200 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full ${
                            employee.attendanceRate >= 90 ? 'bg-green-600' :
                            employee.attendanceRate >= 75 ? 'bg-yellow-600' : 'bg-red-600'
                          }`}
                          style={{ width: `${employee.attendanceRate}%` }}
                        ></div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {employee.presentDays}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {employee.lateDays}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {employee.wfhDays}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// Analytics Report
function AnalyticsReport({ data }) {
  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg p-6 text-white">
          <div className="text-3xl font-bold">{data.metrics.averageAttendanceRate}%</div>
          <div className="text-blue-100">Average Attendance Rate</div>
        </div>
        <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-lg p-6 text-white">
          <div className="text-3xl font-bold">{data.metrics.averageWorkingHours}h</div>
          <div className="text-green-100">Average Working Hours</div>
        </div>
        <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg p-6 text-white">
          <div className="text-3xl font-bold">{data.metrics.wfhUtilization}%</div>
          <div className="text-purple-100">WFH Utilization</div>
        </div>
      </div>

      {/* Trends */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="font-semibold mb-3">Attendance Trends</h4>
          <div className="space-y-2">
            {data.trends.attendance.map((trend, index) => (
              <div key={index} className="flex justify-between items-center">
                <span className="text-sm text-gray-600">{trend.period}</span>
                <span className="font-medium">{trend.rate}%</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="font-semibold mb-3">Late Arrivals by Day</h4>
          <div className="space-y-2">
            {data.trends.lateArrivals.map((trend, index) => (
              <div key={index} className="flex justify-between items-center">
                <span className="text-sm text-gray-600">{trend.day}</span>
                <span className="font-medium">{trend.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Department Breakdown */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Department-wise Analysis</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.departments.map((dept) => (
            <div key={dept.name} className="bg-white border rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">{dept.name}</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Employees:</span>
                  <span className="font-medium">{dept.employeeCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Attendance Rate:</span>
                  <span className="font-medium">{dept.attendanceRate}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Avg. Working Hours:</span>
                  <span className="font-medium">{dept.avgWorkingHours}h</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// WFH Analytics Report
function WFHAnalyticsReport({ data }) {
  return (
    <div className="space-y-6">
      {/* WFH Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-blue-50 rounded-lg p-4">
          <div className="text-2xl font-bold text-blue-900">{data.summary.totalRequests}</div>
          <div className="text-sm text-blue-600">Total WFH Requests</div>
        </div>
        <div className="bg-green-50 rounded-lg p-4">
          <div className="text-2xl font-bold text-green-900">{data.summary.approvedRequests}</div>
          <div className="text-sm text-green-600">Approved</div>
        </div>
        <div className="bg-red-50 rounded-lg p-4">
          <div className="text-2xl font-bold text-red-900">{data.summary.rejectedRequests}</div>
          <div className="text-sm text-red-600">Rejected</div>
        </div>
        <div className="bg-orange-50 rounded-lg p-4">
          <div className="text-2xl font-bold text-orange-900">{data.summary.pendingRequests}</div>
          <div className="text-sm text-orange-600">Pending</div>
        </div>
      </div>

      {/* WFH Trends */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="font-semibold mb-3">WFH Requests by Month</h4>
          <div className="space-y-2">
            {data.trends.monthly.map((trend, index) => (
              <div key={index} className="flex justify-between items-center">
                <span className="text-sm text-gray-600">{trend.month}</span>
                <span className="font-medium">{trend.requests}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="font-semibold mb-3">Most Common WFH Reasons</h4>
          <div className="space-y-2">
            {data.trends.reasons.map((reason, index) => (
              <div key={index} className="flex justify-between items-center">
                <span className="text-sm text-gray-600">{reason.category}</span>
                <span className="font-medium">{reason.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent WFH Requests */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Recent WFH Requests</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employee</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reason</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Approved By</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {data.recentRequests.map((request) => (
                <tr key={request.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {request.employee_name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Date(request.request_date).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">
                    {request.reason}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      request.status === 'approved' ? 'bg-green-100 text-green-800' :
                      request.status === 'rejected' ? 'bg-red-100 text-red-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {request.status.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {request.approved_by || '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}