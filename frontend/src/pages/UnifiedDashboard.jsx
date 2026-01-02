import { useAuth } from '../context/authcontext';
import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import api from '../api/axios';
import RoleGuard from '../components/RoleGuard';

// Unified Dashboard Component with proper API connections and role-based views
export default function UnifiedDashboard() {
  const { user } = useAuth();
  const [dashboardData, setDashboardData] = useState({
    stats: {},
    activities: [],
    notifications: [],
    calendar: [],
    roleSpecificData: {}
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchDashboardData();
  }, [user?.role]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch common dashboard data
      const [statsRes, activitiesRes, notificationsRes, calendarRes] = await Promise.all([
        api.get('/dashboard/stats').catch(() => ({ data: {} })),
        api.get('/dashboard/activities').catch(() => ({ data: [] })),
        api.get('/dashboard/notifications').catch(() => ({ data: [] })),
        api.get('/dashboard/calendar').catch(() => ({ data: [] }))
      ]);

      // Fetch role-specific data
      let roleSpecificData = {};
      try {
        switch (user?.role) {
          case 'employee':
            const empRes = await api.get('/dashboard/employee-stats');
            roleSpecificData = empRes.data;
            break;
          case 'manager':
          case 'admin':
          case 'hr':
          case 'super_admin':
            const teamRes = await api.get('/dashboard/team-stats');
            roleSpecificData = teamRes.data;
            break;
          case 'candidate':
            const candRes = await api.get('/dashboard/candidate-stats');
            roleSpecificData = candRes.data;
            break;
        }
      } catch (roleError) {
        console.warn('Role-specific data fetch failed:', roleError);
      }

      setDashboardData({
        stats: statsRes.data,
        activities: activitiesRes.data,
        notifications: notificationsRes.data,
        calendar: calendarRes.data,
        roleSpecificData
      });

    } catch (error) {
      console.error('Dashboard data fetch failed:', error);
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-6xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Dashboard Error</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button 
            onClick={fetchDashboardData}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="bg-white shadow rounded-lg p-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome back, {user?.first_name || user?.email || 'User'}!
        </h1>
        <p className="text-gray-600 mt-1">
          {getRoleDescription(user?.role)} Dashboard
        </p>
      </div>

      {/* Notifications Banner */}
      <NotificationsBanner notifications={dashboardData.notifications} />

      {/* Role-specific Dashboard Content */}
      <RoleGuard allowedRoles={['admin', 'hr', 'super_admin']}>
        <AdminDashboard 
          stats={dashboardData.stats}
          activities={dashboardData.activities}
          calendar={dashboardData.calendar}
          notifications={dashboardData.notifications}
        />
      </RoleGuard>

      <RoleGuard allowedRoles={['manager']}>
        <ManagerDashboard 
          stats={dashboardData.stats}
          teamData={dashboardData.roleSpecificData}
          activities={dashboardData.activities}
          calendar={dashboardData.calendar}
        />
      </RoleGuard>

      <RoleGuard allowedRoles={['employee']}>
        <EmployeeDashboard 
          employeeData={dashboardData.roleSpecificData}
          activities={dashboardData.activities}
          calendar={dashboardData.calendar}
        />
      </RoleGuard>

      <RoleGuard allowedRoles={['candidate']}>
        <CandidateDashboard 
          candidateData={dashboardData.roleSpecificData}
          activities={dashboardData.activities}
        />
      </RoleGuard>

      <RoleGuard allowedRoles={['assets_team']}>
        <AssetsTeamDashboard 
          notifications={dashboardData.notifications}
          activities={dashboardData.activities}
        />
      </RoleGuard>
    </div>
  );
}

// Notifications Banner Component
function NotificationsBanner({ notifications }) {
  if (!notifications || notifications.length === 0) return null;

  return (
    <div className="space-y-3">
      {notifications.slice(0, 3).map((notification, index) => (
        <div key={index} className={`p-4 rounded-lg border-l-4 ${getNotificationStyles(notification.type)}`}>
          <div className="flex items-center justify-between">
            <div>
              <h4 className={`font-medium ${getNotificationTextColor(notification.type)}`}>
                {notification.title}
              </h4>
              <p className={`text-sm ${getNotificationSubTextColor(notification.type)}`}>
                {notification.message}
              </p>
            </div>
            {notification.action_url && (
              <Link
                to={notification.action_url}
                className={`px-4 py-2 rounded text-sm font-medium ${getNotificationButtonStyles(notification.type)}`}
              >
                View
              </Link>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// Admin Dashboard Component
function AdminDashboard({ stats, activities, calendar, notifications }) {
  return (
    <>
      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Employees"
          value={stats.total_employees || 0}
          icon="👥"
          color="indigo"
          link="/employees"
        />
        <StatCard
          title="Open Jobs"
          value={stats.open_jobs || 0}
          icon="📝"
          color="green"
          link="/recruitment"
          badge={notifications.filter(n => n.action_url === '/recruitment').reduce((sum, n) => sum + (n.count || 1), 0)}
        />
        <StatCard
          title="Pending Approvals"
          value={stats.pending_leave_requests || 0}
          icon="⚠️"
          color="yellow"
          link="/leave"
        />
        <StatCard
          title="Applications"
          value={stats.pending_applications || 0}
          icon="📊"
          color="blue"
          link="/recruitment"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <ActivityFeed activities={activities} />
        <CalendarWidget events={calendar} />
        <QuickActions role="admin" />
      </div>
    </>
  );
}

// Manager Dashboard Component
function ManagerDashboard({ stats, teamData, activities, calendar }) {
  return (
    <>
      {/* Team Stats */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        <StatCard
          title="Team Size"
          value={teamData.team_size || 0}
          icon="👥"
          color="blue"
        />
        <StatCard
          title="Open Positions"
          value={teamData.open_positions || 0}
          icon="📝"
          color="green"
        />
        <StatCard
          title="Interviews Today"
          value={teamData.interviews_today || 0}
          icon="🤝"
          color="purple"
        />
      </div>

      {/* Team Workload Heatmap */}
      {teamData.team_workload && (
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Team Workload</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {teamData.team_workload.map((member, idx) => (
              <WorkloadCard key={idx} member={member} />
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ActivityFeed activities={activities} />
        <CalendarWidget events={calendar} />
      </div>
    </>
  );
}

// Employee Dashboard Component
function EmployeeDashboard({ employeeData, activities, calendar }) {
  return (
    <>
      {/* Employee Stats */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Leave Balance"
          value={`${employeeData.leave_balance || 0} Days`}
          icon="🏖️"
          color="green"
        />
        <StatCard
          title="Next Holiday"
          value={employeeData.next_holiday || "TBD"}
          icon="🎉"
          color="purple"
          isText={true}
        />
        <StatCard
          title="Pending Tasks"
          value={employeeData.pending_tasks || 0}
          icon="📋"
          color="yellow"
        />
        <StatCard
          title="Learning Hours"
          value={employeeData.learning_hours || 0}
          icon="🎓"
          color="blue"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <QuickActions role="employee" />
        <MyGoals />
        <ActivityFeed activities={activities} />
        <CalendarWidget events={calendar} />
      </div>
    </>
  );
}

// Candidate Dashboard Component
function CandidateDashboard({ candidateData, activities }) {
  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* My Applications */}
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">My Applications</h3>
          <div className="space-y-4">
            {candidateData.applications && candidateData.applications.length > 0 ? (
              candidateData.applications.slice(0, 3).map((app) => (
                <ApplicationCard key={app.id} application={app} />
              ))
            ) : (
              <p className="text-gray-500 text-center py-4">No applications yet</p>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <QuickActions role="candidate" />
      </div>

      <ActivityFeed activities={activities} />
    </>
  );
}

// Assets Team Dashboard Component
function AssetsTeamDashboard({ notifications, activities }) {
  const assetNotifications = notifications.filter(n => 
    n.title.includes('Asset') || n.title.includes('IT')
  );

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Asset Notifications */}
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Asset Management Tasks</h3>
          <div className="space-y-3">
            {assetNotifications.length > 0 ? (
              assetNotifications.map((notification, index) => (
                <div key={index} className="p-3 bg-orange-50 rounded border-l-4 border-orange-400">
                  <h4 className="font-medium text-orange-800">{notification.title}</h4>
                  <p className="text-sm text-orange-700">{notification.message}</p>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-center py-4">No pending tasks</p>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <QuickActions role="assets_team" />
      </div>

      <ActivityFeed activities={activities} />
    </>
  );
}

// Reusable Components

function StatCard({ title, value, icon, color, link, badge, isText = false }) {
  const colorClasses = {
    indigo: 'bg-indigo-500',
    green: 'bg-green-500',
    yellow: 'bg-yellow-500',
    red: 'bg-red-500',
    blue: 'bg-blue-500',
    purple: 'bg-purple-500'
  };

  const content = (
    <div className="bg-white overflow-hidden shadow rounded-lg relative">
      <div className="p-5">
        <div className="flex items-center">
          <div className={`flex-shrink-0 ${colorClasses[color]} rounded-md p-3`}>
            <span className="text-white text-2xl">{icon}</span>
          </div>
          <div className="ml-5 w-0 flex-1">
            <dl>
              <dt className="text-sm font-medium text-gray-500 truncate">{title}</dt>
              <dd className={`${isText ? 'text-lg' : 'text-3xl'} font-semibold text-gray-900`}>
                {value}
              </dd>
            </dl>
          </div>
        </div>
      </div>
      {badge > 0 && (
        <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full h-6 w-6 flex items-center justify-center">
          {badge}
        </span>
      )}
    </div>
  );

  return link ? <Link to={link}>{content}</Link> : content;
}

function ActivityFeed({ activities }) {
  return (
    <div className="bg-white shadow rounded-lg p-6">
      <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Activities</h3>
      <ul className="space-y-3 max-h-64 overflow-y-auto">
        {activities && activities.length > 0 ? (
          activities.map((activity, index) => (
            <li key={index} className="flex items-start text-sm text-gray-600">
              <span className="text-lg mr-3 flex-shrink-0">{activity.icon}</span>
              <div className="flex-1">
                <p>{activity.message}</p>
                {activity.timestamp && (
                  <p className="text-xs text-gray-400 mt-1">
                    {new Date(activity.timestamp).toLocaleString()}
                  </p>
                )}
              </div>
            </li>
          ))
        ) : (
          <li className="text-gray-500 text-center py-4">No recent activities</li>
        )}
      </ul>
    </div>
  );
}

function CalendarWidget({ events }) {
  return (
    <div className="bg-white shadow rounded-lg p-6">
      <h3 className="text-lg font-medium text-gray-900 mb-4">📅 Upcoming Events</h3>
      <div className="space-y-3 max-h-64 overflow-y-auto">
        {events && events.length > 0 ? (
          events.slice(0, 5).map((event, index) => (
            <div key={index} className="flex items-center p-2 bg-gray-50 rounded">
              <span className="text-lg mr-3">{event.icon}</span>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">{event.title}</p>
                <p className="text-xs text-gray-500">
                  {new Date(event.date).toLocaleDateString()}
                </p>
              </div>
            </div>
          ))
        ) : (
          <div className="text-sm text-gray-500 text-center py-4">
            No upcoming events
          </div>
        )}
      </div>
    </div>
  );
}

function QuickActions({ role }) {
  const actionsByRole = {
    admin: [
      { to: "/recruitment", icon: "📢", label: "Recruitment", color: "blue" },
      { to: "/onboarding", icon: "🚀", label: "Onboarding", color: "green" },
      { to: "/leave", icon: "🏖️", label: "Leave Approvals", color: "yellow" },
      { to: "/assets", icon: "💻", label: "Assets", color: "purple" }
    ],
    manager: [
      { to: "/attendance", icon: "📅", label: "Team Attendance", color: "blue" },
      { to: "/performance", icon: "📈", label: "Performance", color: "green" },
      { to: "/recruitment", icon: "🤝", label: "Interviews", color: "purple" },
      { to: "/leave", icon: "🏖️", label: "Leave Approvals", color: "yellow" }
    ],
    employee: [
      { to: "/attendance", icon: "📍", label: "Check-In", color: "blue" },
      { to: "/leave", icon: "🏖️", label: "Request Leave", color: "green" },
      { to: "/learning", icon: "🎓", label: "Learning", color: "purple" },
      { to: "/assets", icon: "💻", label: "My Assets", color: "gray" }
    ],
    candidate: [
      { to: "/career", icon: "🔍", label: "Browse Jobs", color: "blue" },
      { to: "/profile", icon: "👤", label: "Update Profile", color: "green" }
    ],
    assets_team: [
      { to: "/assets", icon: "💻", label: "Asset Requests", color: "blue" },
      { to: "/assets", icon: "🔧", label: "IT Issues", color: "red" },
      { to: "/infrastructure", icon: "🏗️", label: "Infrastructure", color: "green" }
    ]
  };

  const actions = actionsByRole[role] || [];

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
      <div className="grid grid-cols-2 gap-4">
        {actions.map((action, index) => (
          <Link
            key={index}
            to={action.to}
            className="p-4 border rounded-lg hover:bg-gray-50 text-center transition-colors"
          >
            <span className="block text-2xl mb-2">{action.icon}</span>
            <span className="text-sm font-medium">{action.label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

function WorkloadCard({ member }) {
  const getStatusColor = (load) => {
    if (load > 90) return 'bg-red-600';
    if (load < 50) return 'bg-yellow-500';
    return 'bg-green-600';
  };

  const getStatusBadgeColor = (load) => {
    if (load > 90) return 'bg-red-100 text-red-800';
    if (load < 50) return 'bg-yellow-100 text-yellow-800';
    return 'bg-green-100 text-green-800';
  };

  return (
    <div className="border rounded-lg p-4">
      <div className="flex justify-between items-center mb-2">
        <span className="font-bold text-gray-700">{member.name}</span>
        <span className={`text-xs font-bold px-2 py-0.5 rounded ${getStatusBadgeColor(member.load)}`}>
          {member.status}
        </span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2.5 mb-1">
        <div
          className={`h-2.5 rounded-full ${getStatusColor(member.load)}`}
          style={{ width: `${member.load}%` }}
        ></div>
      </div>
      <p className="text-xs text-gray-500 text-right">{member.load}% Capacity</p>
    </div>
  );
}

function ApplicationCard({ application }) {
  const statusColors = {
    applied: 'bg-blue-100 text-blue-800',
    screening: 'bg-yellow-100 text-yellow-800',
    interview: 'bg-purple-100 text-purple-800',
    offered: 'bg-green-100 text-green-800',
    rejected: 'bg-red-100 text-red-800'
  };

  return (
    <div className="border rounded-lg p-4">
      <div className="flex justify-between items-start">
        <div>
          <h4 className="font-bold text-gray-900">{application.job_title}</h4>
          <p className="text-sm text-gray-500">{application.company} • {application.location}</p>
        </div>
        <span className={`px-2 py-1 text-xs font-bold rounded ${statusColors[application.status] || 'bg-gray-100 text-gray-800'}`}>
          {application.status}
        </span>
      </div>
      {application.applied_date && (
        <div className="mt-3 text-sm text-gray-600">
          <p>📅 Applied: {new Date(application.applied_date).toLocaleDateString()}</p>
        </div>
      )}
    </div>
  );
}

function MyGoals() {
  // Mock goals data - in production, fetch from API
  const goals = [
    { title: "Complete React Training", progress: 80, color: "green" },
    { title: "Deliver Project X", progress: 45, color: "blue" }
  ];

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <h3 className="text-lg font-medium text-gray-900 mb-4">My Goals</h3>
      <ul className="space-y-3">
        {goals.map((goal, index) => (
          <li key={index}>
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="text-gray-700">{goal.title}</span>
              <span className={`text-${goal.color}-600 font-bold`}>{goal.progress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className={`bg-${goal.color}-500 h-2 rounded-full`} 
                style={{ width: `${goal.progress}%` }}
              ></div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

// Helper functions
function getRoleDescription(role) {
  const descriptions = {
    admin: 'Administrator',
    hr: 'Human Resources',
    manager: 'Team Manager',
    employee: 'Employee',
    candidate: 'Job Candidate',
    assets_team: 'IT Assets Team',
    super_admin: 'Super Administrator'
  };
  return descriptions[role] || 'User';
}

function getNotificationStyles(type) {
  const styles = {
    success: 'bg-green-50 border-green-400',
    warning: 'bg-yellow-50 border-yellow-400',
    info: 'bg-blue-50 border-blue-400',
    error: 'bg-red-50 border-red-400'
  };
  return styles[type] || styles.info;
}

function getNotificationTextColor(type) {
  const colors = {
    success: 'text-green-800',
    warning: 'text-yellow-800',
    info: 'text-blue-800',
    error: 'text-red-800'
  };
  return colors[type] || colors.info;
}

function getNotificationSubTextColor(type) {
  const colors = {
    success: 'text-green-700',
    warning: 'text-yellow-700',
    info: 'text-blue-700',
    error: 'text-red-700'
  };
  return colors[type] || colors.info;
}

function getNotificationButtonStyles(type) {
  const styles = {
    success: 'bg-green-600 text-white hover:bg-green-700',
    warning: 'bg-yellow-600 text-white hover:bg-yellow-700',
    info: 'bg-blue-600 text-white hover:bg-blue-700',
    error: 'bg-red-600 text-white hover:bg-red-700'
  };
  return styles[type] || styles.info;
}