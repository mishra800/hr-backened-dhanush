import { useAuth } from '../context/authcontext';
import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import api from '../api/axios';

export default function Dashboard() {
  const { user } = useAuth();
  const role = user?.role || 'employee';
  const [pendingLeaves, setPendingLeaves] = useState([]);
  const [loadingLeaves, setLoadingLeaves] = useState(false);
  const [dashboardStats, setDashboardStats] = useState({
    totalEmployees: 0,
    activeJobs: 0,
    pendingApplications: 0,
    attendanceRate: 0
  });
  const [recentActivities, setRecentActivities] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [calendarEvents, setCalendarEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const isManager = user && ['admin', 'hr', 'manager'].includes(user.role);
  
  useEffect(() => {
    fetchDashboardData();
    if (isManager) {
      fetchPendingLeaves();
    }
  }, [isManager]);
  
  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch dashboard stats with fallback data
      try {
        const statsResponse = await api.get('/dashboard/stats');
        setDashboardStats(statsResponse.data);
      } catch (error) {
        console.error('Stats API failed, using mock data:', error);
        setDashboardStats({
          totalEmployees: 10,
          activeJobs: 5,
          pendingApplications: 12,
          attendanceRate: 85.5
        });
      }
      
      // Fetch recent activities with fallback
      try {
        const activitiesResponse = await api.get('/dashboard/activities');
        setRecentActivities(activitiesResponse.data);
      } catch (error) {
        console.error('Activities API failed, using mock data:', error);
        setRecentActivities([
          { id: 1, type: 'application', message: 'New application received for Software Engineer', time: '2 hours ago' },
          { id: 2, type: 'leave', message: 'Leave request approved for John Doe', time: '4 hours ago' },
          { id: 3, type: 'onboarding', message: 'Sarah completed onboarding phase 3', time: '1 day ago' }
        ]);
      }
      
      // Fetch notifications with fallback
      try {
        const notificationsResponse = await api.get('/dashboard/notifications');
        setNotifications(notificationsResponse.data);
      } catch (error) {
        setNotifications([]);
      }
      
      // Fetch calendar events with fallback
      try {
        const calendarResponse = await api.get('/dashboard/calendar');
        setCalendarEvents(calendarResponse.data);
      } catch (error) {
        setCalendarEvents([
          { id: 1, title: 'Team Meeting', time: '10:00 AM', date: 'Today' },
          { id: 2, title: 'Interview - Jane Smith', time: '2:00 PM', date: 'Today' }
        ]);
      }
      
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const fetchPendingLeaves = async () => {
    setLoadingLeaves(true);
    try {
      const response = await api.get('/leave/pending');
      setPendingLeaves(response.data);
    } catch (error) {
      console.error('Error fetching pending leaves:', error);
    } finally {
      setLoadingLeaves(false);
    }
  };
  
  const handleApprove = async (leaveId) => {
    try {
      await api.put(`/leave/approve/${leaveId}`);
      alert('Leave approved successfully!');
      fetchPendingLeaves();
    } catch (error) {
      console.error('Error approving leave:', error);
      alert('Failed to approve leave.');
    }
  };
  
  const handleReject = async (leaveId) => {
    try {
      await api.put(`/leave/reject/${leaveId}`);
      alert('Leave rejected successfully!');
      fetchPendingLeaves();
    } catch (error) {
      console.error('Error rejecting leave:', error);
      alert('Failed to reject leave.');
    }
  };

  // --- 1. SUPER ADMIN & HR ADMIN DASHBOARD ---
  if (role === 'super_admin' || role === 'hr_admin') {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-indigo-500 rounded-md p-3">
                  <span className="text-white text-2xl">👥</span>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Total Employees</dt>
                    <dd className="text-lg font-medium text-gray-900">{dashboardStats.total_employees || 0}</dd>
                  </dl>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 px-5 py-3">
              <Link to="/employees" className="text-sm font-medium text-indigo-700 hover:text-indigo-900">View all</Link>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-green-500 rounded-md p-3">
                  <span className="text-white text-2xl">📝</span>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Open Requisitions</dt>
                    <dd className="text-lg font-medium text-gray-900">{dashboardStats.open_jobs || 0}</dd>
                  </dl>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 px-5 py-3">
              <Link to="/recruitment" className="text-sm font-medium text-green-700 hover:text-green-900">Manage Jobs</Link>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-yellow-500 rounded-md p-3">
                  <span className="text-white text-2xl">⚠️</span>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Pending Approvals</dt>
                    <dd className="text-lg font-medium text-gray-900">{dashboardStats.pending_leave_requests || 0}</dd>
                  </dl>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 px-5 py-3">
              <div className="text-sm font-medium text-yellow-700">Requires Action</div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-red-500 rounded-md p-3">
                  <span className="text-white text-2xl">📉</span>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Attrition Risk</dt>
                    <dd className="text-lg font-medium text-gray-900">High</dd>
                  </dl>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 px-5 py-3">
              <Link to="/analysis" className="text-sm font-medium text-red-700 hover:text-red-900">View Analytics</Link>
            </div>
          </div>
        </div>

        {/* Pending Leave Requests - Priority Section */}
        {pendingLeaves.length > 0 && (
          <div className="bg-orange-50 border-l-4 border-orange-500 shadow-lg rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <span className="text-3xl mr-3">⚠️</span>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Pending Leave Approvals</h3>
                  <p className="text-sm text-gray-600">{pendingLeaves.length} request(s) awaiting your action</p>
                </div>
              </div>
              <Link 
                to="/leave" 
                className="text-sm font-medium text-orange-700 hover:text-orange-900 underline"
              >
                View All →
              </Link>
            </div>
            
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {pendingLeaves.slice(0, 5).map((leave) => (
                <div key={leave.id} className="bg-white rounded-lg p-4 border border-orange-200">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-bold text-gray-900">
                          {leave.employee?.first_name} {leave.employee?.last_name}
                        </span>
                        <span className="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded-full font-medium">
                          Pending
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-1">
                        {leave.employee?.department} • {leave.employee?.position}
                      </p>
                      <p className="text-sm text-blue-600 font-medium">
                        {new Date(leave.start_date).toLocaleDateString()} - {new Date(leave.end_date).toLocaleDateString()}
                        <span className="text-gray-500 ml-2">
                          ({Math.ceil((new Date(leave.end_date) - new Date(leave.start_date)) / (1000 * 60 * 60 * 24)) + 1} days)
                        </span>
                      </p>
                      <p className="text-sm text-gray-700 mt-2">
                        <span className="font-medium">Reason:</span> {leave.reason}
                      </p>
                    </div>
                    <div className="flex gap-2 ml-4">
                      <button
                        onClick={() => handleApprove(leave.id)}
                        className="px-3 py-1.5 bg-green-600 text-white text-sm rounded hover:bg-green-700 font-medium"
                      >
                        ✓ Approve
                      </button>
                      <button
                        onClick={() => handleReject(leave.id)}
                        className="px-3 py-1.5 bg-red-600 text-white text-sm rounded hover:bg-red-700 font-medium"
                      >
                        ✗ Reject
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            {pendingLeaves.length > 5 && (
              <div className="mt-4 text-center">
                <Link 
                  to="/leave" 
                  className="text-sm font-medium text-orange-700 hover:text-orange-900"
                >
                  View {pendingLeaves.length - 5} more pending request(s) →
                </Link>
              </div>
            )}
          </div>
        )}

        {/* Notifications Banner */}
        {notifications.length > 0 && (
          <div className="mb-6 space-y-3">
            {notifications.map((notification, index) => (
              <div key={index} className={`p-4 rounded-lg border-l-4 ${
                notification.type === 'success' ? 'bg-green-50 border-green-400' :
                notification.type === 'warning' ? 'bg-yellow-50 border-yellow-400' :
                notification.type === 'info' ? 'bg-blue-50 border-blue-400' :
                'bg-red-50 border-red-400'
              }`}>
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className={`font-medium ${
                      notification.type === 'success' ? 'text-green-800' :
                      notification.type === 'warning' ? 'text-yellow-800' :
                      notification.type === 'info' ? 'text-blue-800' :
                      'text-red-800'
                    }`}>
                      {notification.title}
                    </h4>
                    <p className={`text-sm ${
                      notification.type === 'success' ? 'text-green-700' :
                      notification.type === 'warning' ? 'text-yellow-700' :
                      notification.type === 'info' ? 'text-blue-700' :
                      'text-red-700'
                    }`}>
                      {notification.message}
                    </p>
                  </div>
                  {notification.action_url && (
                    <Link
                      to={notification.action_url}
                      className={`px-4 py-2 rounded text-sm font-medium ${
                        notification.type === 'success' ? 'bg-green-600 text-white hover:bg-green-700' :
                        notification.type === 'warning' ? 'bg-yellow-600 text-white hover:bg-yellow-700' :
                        notification.type === 'info' ? 'bg-blue-600 text-white hover:bg-blue-700' :
                        'bg-red-600 text-white hover:bg-red-700'
                      }`}
                    >
                      View
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Activities</h3>
            <ul className="space-y-3 max-h-64 overflow-y-auto">
              {recentActivities.length > 0 ? recentActivities.map((activity, index) => (
                <li key={index} className="flex items-center text-sm text-gray-600">
                  <span className="text-lg mr-2">{activity.icon}</span>
                  <span>{activity.message}</span>
                </li>
              )) : (
                <>
                  <li className="flex items-center text-sm text-gray-600">
                    <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                    New application received for Senior React Developer
                  </li>
                  <li className="flex items-center text-sm text-gray-600">
                    <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                    John Doe completed onboarding
                  </li>
                  {pendingLeaves.length > 0 && (
                    <li className="flex items-center text-sm text-gray-600">
                      <span className="w-2 h-2 bg-yellow-500 rounded-full mr-2"></span>
                      {pendingLeaves.length} leave request(s) pending approval
                    </li>
                  )}
                </>
              )}
            </ul>
          </div>
          
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">📅 Upcoming Events</h3>
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {calendarEvents.length > 0 ? calendarEvents.slice(0, 5).map((event, index) => (
                <div key={index} className="flex items-center p-2 bg-gray-50 rounded">
                  <span className="text-lg mr-2">{event.icon}</span>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{event.title}</p>
                    <p className="text-xs text-gray-500">{new Date(event.date).toLocaleDateString()}</p>
                  </div>
                </div>
              )) : (
                <div className="text-sm text-gray-500 text-center py-4">
                  No upcoming events
                </div>
              )}
            </div>
          </div>

          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
            <div className="grid grid-cols-2 gap-4">
              <Link to="/recruitment" className="p-4 border rounded-lg hover:bg-gray-50 text-center relative">
                <span className="block text-2xl mb-2">📢</span>
                <span className="text-sm font-medium">Recruitment</span>
                {notifications.some(n => n.action_url === '/recruitment') && (
                  <span className="absolute -top-1 -right-1 bg-blue-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                    {notifications.filter(n => n.action_url === '/recruitment').reduce((sum, n) => sum + (n.count || 1), 0)}
                  </span>
                )}
              </Link>
              <Link to="/onboarding" className="p-4 border rounded-lg hover:bg-gray-50 text-center">
                <span className="block text-2xl mb-2">🚀</span>
                <span className="text-sm font-medium">Onboard User</span>
              </Link>
              <Link to="/leave" className="p-4 border rounded-lg hover:bg-gray-50 text-center relative">
                <span className="block text-2xl mb-2">🏖️</span>
                <span className="text-sm font-medium">Leave Approvals</span>
                {pendingLeaves.length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                    {pendingLeaves.length}
                  </span>
                )}
              </Link>
              <Link to="/announcements" className="p-4 border rounded-lg hover:bg-gray-50 text-center">
                <span className="block text-2xl mb-2">📣</span>
                <span className="text-sm font-medium">Announcement</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- 2. HIRING MANAGER DASHBOARD ---
  if (role === 'hiring_manager') {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
          <div className="bg-white overflow-hidden shadow rounded-lg p-5">
            <dt className="text-sm font-medium text-gray-500 truncate">My Team Size</dt>
            <dd className="mt-1 text-3xl font-semibold text-gray-900">12</dd>
          </div>
          <div className="bg-white overflow-hidden shadow rounded-lg p-5">
            <dt className="text-sm font-medium text-gray-500 truncate">Open Positions</dt>
            <dd className="mt-1 text-3xl font-semibold text-gray-900">3</dd>
          </div>
          <div className="bg-white overflow-hidden shadow rounded-lg p-5">
            <dt className="text-sm font-medium text-gray-500 truncate">Interviews Today</dt>
            <dd className="mt-1 text-3xl font-semibold text-gray-900">2</dd>
          </div>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Team Management</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link to="/attendance" className="p-4 border rounded-lg hover:bg-gray-50 flex items-center">
              <span className="text-2xl mr-3">📅</span>
              <div>
                <div className="font-medium">Team Attendance</div>
                <div className="text-xs text-gray-500">View today's status</div>
              </div>
            </Link>
            <Link to="/performance" className="p-4 border rounded-lg hover:bg-gray-50 flex items-center">
              <span className="text-2xl mr-3">📈</span>
              <div>
                <div className="font-medium">Performance Reviews</div>
                <div className="text-xs text-gray-500">Pending reviews: 4</div>
              </div>
            </Link>
            <Link to="/recruitment" className="p-4 border rounded-lg hover:bg-gray-50 flex items-center">
              <span className="text-2xl mr-3">🤝</span>
              <div>
                <div className="font-medium">Interviews</div>
                <div className="text-xs text-gray-500">Schedule & Feedback</div>
              </div>
            </Link>
          </div>
        </div>

        {/* Workload Heatmap */}
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-900">🔥 Team Workload Heatmap</h3>
            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">AI Analysis</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { name: 'Alice', load: 95, status: 'Overloaded' },
              { name: 'Bob', load: 45, status: 'Underutilized' },
              { name: 'Charlie', load: 75, status: 'Optimal' },
              { name: 'Diana', load: 88, status: 'High' },
            ].map((member, idx) => (
              <div key={idx} className="border rounded-lg p-4 relative overflow-hidden">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-bold text-gray-700">{member.name}</span>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded ${member.load > 90 ? 'bg-red-100 text-red-800' :
                      member.load < 50 ? 'bg-yellow-100 text-yellow-800' :
                        'bg-green-100 text-green-800'
                    }`}>{member.status}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5 mb-1">
                  <div
                    className={`h-2.5 rounded-full ${member.load > 90 ? 'bg-red-600' :
                        member.load < 50 ? 'bg-yellow-500' :
                          'bg-green-600'
                      }`}
                    style={{ width: `${member.load}%` }}
                  ></div>
                </div>
                <p className="text-xs text-gray-500 text-right">{member.load}% Capacity</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // --- 3. CANDIDATE DASHBOARD ---
  if (role === 'candidate') {
    return (
      <div className="space-y-6">
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Welcome, {user?.first_name || 'Candidate'}!</h2>
          <p className="text-gray-600">Track your applications and explore new opportunities.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">My Applications</h3>
            <div className="space-y-4">
              <div className="border rounded-lg p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-bold text-gray-900">Senior React Developer</h4>
                    <p className="text-sm text-gray-500">Engineering • Remote</p>
                  </div>
                  <span className="px-2 py-1 text-xs font-bold rounded bg-yellow-100 text-yellow-800">Interview Scheduled</span>
                </div>
                <div className="mt-3 text-sm text-gray-600">
                  <p>📅 Next Interview: Tomorrow, 10:00 AM</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
            <div className="space-y-3">
              <Link to="/career" className="block w-full text-center bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
                Browse Open Jobs
              </Link>
              <Link to="/profile" className="block w-full text-center border border-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-50">
                Update Profile & Resume
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- 4. EMPLOYEE DASHBOARD (Default) ---
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="bg-white overflow-hidden shadow rounded-lg p-5">
          <dt className="text-sm font-medium text-gray-500 truncate">Leave Balance</dt>
          <dd className="mt-1 text-3xl font-semibold text-gray-900">12 Days</dd>
        </div>
        <div className="bg-white overflow-hidden shadow rounded-lg p-5">
          <dt className="text-sm font-medium text-gray-500 truncate">Next Holiday</dt>
          <dd className="mt-1 text-lg font-semibold text-gray-900">Christmas (25 Dec)</dd>
        </div>
        <div className="bg-white overflow-hidden shadow rounded-lg p-5">
          <dt className="text-sm font-medium text-gray-500 truncate">Pending Tasks</dt>
          <dd className="mt-1 text-3xl font-semibold text-gray-900">3</dd>
        </div>
        <div className="bg-white overflow-hidden shadow rounded-lg p-5">
          <dt className="text-sm font-medium text-gray-500 truncate">Learning Hours</dt>
          <dd className="mt-1 text-3xl font-semibold text-gray-900">8.5</dd>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Today's Actions</h3>
          <div className="grid grid-cols-2 gap-4">
            <Link to="attendance" className="p-4 border rounded-lg hover:bg-gray-50 text-center">
              <span className="block text-2xl mb-2">📍</span>
              <span className="text-sm font-medium">Smart Check-In</span>
            </Link>
            <Link to="leave" className="p-4 border rounded-lg hover:bg-gray-50 text-center">
              <span className="block text-2xl mb-2">🏖️</span>
              <span className="text-sm font-medium">Request Leave</span>
            </Link>
            <Link to="learning" className="p-4 border rounded-lg hover:bg-gray-50 text-center">
              <span className="block text-2xl mb-2">🎓</span>
              <span className="text-sm font-medium">My Learning</span>
            </Link>
            <Link to="payroll" className="p-4 border rounded-lg hover:bg-gray-50 text-center">
              <span className="block text-2xl mb-2">💵</span>
              <span className="text-sm font-medium">View Payslip</span>
            </Link>
          </div>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">My Goals</h3>
          <ul className="space-y-3">
            <li className="flex items-center justify-between text-sm">
              <span className="text-gray-700">Complete React Training</span>
              <span className="text-green-600 font-bold">80%</span>
            </li>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-green-500 h-2 rounded-full" style={{ width: '80%' }}></div>
            </div>
            <li className="flex items-center justify-between text-sm mt-2">
              <span className="text-gray-700">Deliver Project X</span>
              <span className="text-blue-600 font-bold">45%</span>
            </li>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-blue-500 h-2 rounded-full" style={{ width: '45%' }}></div>
            </div>
          </ul>
        </div>

        {/* Gamification Section */}
        <div className="bg-gradient-to-br from-purple-600 to-indigo-700 shadow-lg rounded-lg p-6 text-white col-span-1 lg:col-span-2">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-xl font-bold">🏆 Employee Leaderboard</h3>
              <p className="text-purple-200 text-sm">Earn points for attendance, learning, and engagement!</p>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold">1,250</p>
              <p className="text-xs uppercase tracking-wider text-purple-200">My Points</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white/10 rounded-lg p-3 flex items-center space-x-3">
              <div className="bg-yellow-400 p-2 rounded-full text-yellow-900 font-bold text-xs">🥇</div>
              <div>
                <p className="font-bold text-sm">Employee of the Week</p>
                <p className="text-xs text-purple-200">Current: Sarah J.</p>
              </div>
            </div>
            <div className="bg-white/10 rounded-lg p-3 flex items-center space-x-3">
              <div className="bg-green-400 p-2 rounded-full text-green-900 font-bold text-xs">🎓</div>
              <div>
                <p className="font-bold text-sm">Learning Champion</p>
                <p className="text-xs text-purple-200">Badge Earned</p>
              </div>
            </div>
            <div className="bg-white/10 rounded-lg p-3 flex items-center space-x-3">
              <div className="bg-blue-400 p-2 rounded-full text-blue-900 font-bold text-xs">🔥</div>
              <div>
                <p className="font-bold text-sm">7-Day Streak</p>
                <p className="text-xs text-purple-200">On-Time Attendance</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
