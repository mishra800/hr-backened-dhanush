import { useState, useEffect } from 'react';
import api from '../api/axios';

export default function SuperAdmin() {
  const [activeTab, setActiveTab] = useState('capabilities');
  const [capabilities, setCapabilities] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [auditLogs, setAuditLogs] = useState([]);
  const [userStats, setUserStats] = useState(null);
  const [permissionTemplates, setPermissionTemplates] = useState({});

  // All available modules
  const MODULES = [
    { id: 'dashboard', name: 'Dashboard', icon: '📊', description: 'Main dashboard with overview' },
    { id: 'recruitment', name: 'Recruitment', icon: '👥', description: 'Job postings and candidate management' },
    { id: 'onboarding', name: 'Onboarding', icon: '🚀', description: 'Employee onboarding process' },
    { id: 'employees', name: 'Employees', icon: '👤', description: 'Employee directory and management' },
    { id: 'attendance', name: 'Attendance', icon: '📅', description: 'Attendance tracking and reports' },
    { id: 'leave', name: 'Leave Management', icon: '🏖️', description: 'Leave requests and approvals' },
    { id: 'performance', name: 'Performance', icon: '⭐', description: 'Performance reviews and goals' },
    { id: 'engagement', name: 'Engagement', icon: '❤️', description: 'Employee engagement activities' },
    { id: 'learning', name: 'Learning', icon: '📚', description: 'Training and development' },
    { id: 'payroll', name: 'Payroll', icon: '💰', description: 'Salary and payroll management' },
    { id: 'analysis', name: 'Analytics', icon: '📈', description: 'Reports and analytics' },
    { id: 'career', name: 'Career', icon: '🎯', description: 'Career development and planning' },
    { id: 'assets', name: 'Assets', icon: '💻', description: 'Asset management' },
    { id: 'announcements', name: 'Announcements', icon: '📢', description: 'Company announcements' },
  ];

  // All roles
  const ROLES = [
    { id: 'admin', name: 'Admin', color: 'red', description: 'System administrator with full access' },
    { id: 'hr', name: 'HR', color: 'purple', description: 'Human Resources management' },
    { id: 'manager', name: 'Manager', color: 'blue', description: 'Team management and oversight' },
    { id: 'employee', name: 'Employee', color: 'green', description: 'Regular employee access' },
    { id: 'assets_team', name: 'Assets Team', color: 'orange', description: 'IT assets and infrastructure management' },
    { id: 'candidate', name: 'Candidate', color: 'yellow', description: 'Job applicant access' },
  ];

  useEffect(() => {
    fetchCapabilities();
    fetchAuditLogs();
    fetchUserStats();
    fetchPermissionTemplates();
  }, []);

  const fetchPermissionTemplates = async () => {
    try {
      const response = await api.get('/admin/permission-templates');
      setPermissionTemplates(response.data);
    } catch (error) {
      console.error('Error fetching permission templates:', error);
    }
  };

  const fetchCapabilities = async () => {
    try {
      setLoading(true);
      const response = await api.get('/admin/capabilities');
      setCapabilities(response.data);
    } catch (error) {
      console.error('Error fetching capabilities:', error);
      // Initialize with default capabilities if API fails
      initializeDefaultCapabilities();
    } finally {
      setLoading(false);
    }
  };

  const initializeDefaultCapabilities = () => {
    const defaultCaps = {};
    ROLES.forEach(role => {
      defaultCaps[role.id] = {};
      MODULES.forEach(module => {
        // Admin has access to everything
        if (role.id === 'admin') {
          defaultCaps[role.id][module.id] = { enabled: true, permissions: ['read', 'write', 'delete'] };
        }
        // HR has most access
        else if (role.id === 'hr') {
          defaultCaps[role.id][module.id] = { enabled: true, permissions: ['read', 'write'] };
        }
        // Manager has team management focus
        else if (role.id === 'manager') {
          const managerModules = ['dashboard', 'recruitment', 'employees', 'attendance', 'leave', 'performance', 'engagement', 'analysis', 'assets', 'announcements'];
          defaultCaps[role.id][module.id] = {
            enabled: managerModules.includes(module.id),
            permissions: managerModules.includes(module.id) ? ['read', 'write'] : []
          };
        }
        // Assets Team has assets focus
        else if (role.id === 'assets_team') {
          const assetsModules = ['dashboard', 'assets', 'announcements'];
          defaultCaps[role.id][module.id] = {
            enabled: assetsModules.includes(module.id),
            permissions: assetsModules.includes(module.id) ? ['read', 'write'] : []
          };
        }
        // Employee has limited access
        else if (role.id === 'employee') {
          const employeeModules = ['dashboard', 'attendance', 'leave', 'performance', 'engagement', 'learning', 'career', 'assets', 'announcements'];
          defaultCaps[role.id][module.id] = {
            enabled: employeeModules.includes(module.id),
            permissions: employeeModules.includes(module.id) ? ['read'] : []
          };
        }
        // Candidate has minimal access
        else if (role.id === 'candidate') {
          const candidateModules = ['dashboard'];
          defaultCaps[role.id][module.id] = {
            enabled: candidateModules.includes(module.id),
            permissions: candidateModules.includes(module.id) ? ['read'] : []
          };
        }
      });
    });
    setCapabilities(defaultCaps);
  };

  const toggleModuleAccess = (roleId, moduleId) => {
    setCapabilities(prev => ({
      ...prev,
      [roleId]: {
        ...prev[roleId],
        [moduleId]: {
          ...prev[roleId]?.[moduleId],
          enabled: !prev[roleId]?.[moduleId]?.enabled
        }
      }
    }));
  };

  const togglePermission = (roleId, moduleId, permission) => {
    setCapabilities(prev => {
      const currentPerms = prev[roleId]?.[moduleId]?.permissions || [];
      const newPerms = currentPerms.includes(permission)
        ? currentPerms.filter(p => p !== permission)
        : [...currentPerms, permission];
      
      return {
        ...prev,
        [roleId]: {
          ...prev[roleId],
          [moduleId]: {
            ...prev[roleId]?.[moduleId],
            permissions: newPerms
          }
        }
      };
    });
  };

  const saveCapabilities = async () => {
    try {
      setSaving(true);
      await api.post('/admin/capabilities', { capabilities });
      alert('✅ Capabilities saved successfully!');
    } catch (error) {
      console.error('Error saving capabilities:', error);
      alert('❌ Failed to save capabilities. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const fetchAuditLogs = async () => {
    try {
      const response = await api.get('/admin/audit-logs');
      setAuditLogs(response.data.logs || []); // Extract logs array from response
    } catch (error) {
      console.error('Error fetching audit logs:', error);
      setAuditLogs([]); // Set empty array on error
    }
  };

  const fetchUserStats = async () => {
    try {
      const response = await api.get('/admin/users/stats');
      setUserStats(response.data);
    } catch (error) {
      console.error('Error fetching user stats:', error);
    }
  };

  const applyTemplate = async (templateName) => {
    const template = permissionTemplates[templateName];
    if (!template) return;

    if (confirm(`Apply ${template.name}?\n\n${template.description}\n\nThis will override current settings.`)) {
      try {
        setSaving(true);
        await api.post(`/admin/permission-templates/${templateName}/apply`);
        await fetchCapabilities(); // Refresh capabilities
        alert(`✅ ${template.name} template applied successfully!`);
      } catch (error) {
        console.error('Error applying template:', error);
        alert('❌ Failed to apply template. Please try again.');
      } finally {
        setSaving(false);
      }
    }
  };

  const initializeStartupMode = () => {
    // Everyone gets more access in startup mode
    const startupCaps = {};
    ROLES.forEach(role => {
      startupCaps[role.id] = {};
      MODULES.forEach(module => {
        if (role.id === 'super_admin') {
          startupCaps[role.id][module.id] = { enabled: true, permissions: ['read', 'write', 'delete'] };
        } else if (role.id === 'candidate') {
          startupCaps[role.id][module.id] = { enabled: false, permissions: [] };
        } else {
          // Everyone else gets read access to most things
          startupCaps[role.id][module.id] = { enabled: true, permissions: ['read'] };
        }
      });
    });
    return startupCaps;
  };

  const initializeEnterpriseMode = () => {
    // Strict separation in enterprise mode
    return initializeDefaultCapabilities();
  };

  const initializeRemoteMode = () => {
    // Focus on engagement, communication, and self-service
    const remoteCaps = {};
    ROLES.forEach(role => {
      remoteCaps[role.id] = {};
      MODULES.forEach(module => {
        const engagementModules = ['dashboard', 'engagement', 'learning', 'announcements', 'meetings'];
        if (role.id === 'super_admin') {
          remoteCaps[role.id][module.id] = { enabled: true, permissions: ['read', 'write', 'delete'] };
        } else if (role.id === 'employee') {
          remoteCaps[role.id][module.id] = {
            enabled: engagementModules.includes(module.id) || ['attendance', 'leave', 'performance'].includes(module.id),
            permissions: ['read', 'write']
          };
        } else {
          remoteCaps[role.id][module.id] = initializeDefaultCapabilities()[role.id][module.id];
        }
      });
    });
    return remoteCaps;
  };

  const resetToDefaults = () => {
    if (confirm('Are you sure you want to reset all capabilities to default values? This cannot be undone.')) {
      initializeDefaultCapabilities();
      alert('Capabilities reset to defaults. Click "Save Changes" to apply.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading Super Admin Panel...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <span className="text-4xl">🔐</span>
                Super Admin Panel
              </h1>
              <p className="text-gray-500 mt-1">Manage system capabilities and role permissions</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={resetToDefaults}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Reset to Defaults
              </button>
              <button
                onClick={saveCapabilities}
                disabled={saving}
                className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-400 font-semibold"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>

        {/* Warning Banner */}
        <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <span className="text-2xl">⚠️</span>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Warning: Super Admin Access</h3>
              <p className="text-sm text-red-700 mt-1">
                Changes made here will affect all users in the system. Disabling critical modules may prevent users from performing their duties. Use with caution.
              </p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap gap-2 mb-6">
          <button
            onClick={() => setActiveTab('capabilities')}
            className={`px-4 py-2 rounded-lg font-medium ${
              activeTab === 'capabilities' ? 'bg-red-600 text-white' : 'bg-white text-gray-600'
            }`}
          >
            🎛️ Module Capabilities
          </button>
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2 rounded-lg font-medium ${
              activeTab === 'overview' ? 'bg-red-600 text-white' : 'bg-white text-gray-600'
            }`}
          >
            📊 Access Overview
          </button>
          <button
            onClick={() => setActiveTab('templates')}
            className={`px-4 py-2 rounded-lg font-medium ${
              activeTab === 'templates' ? 'bg-red-600 text-white' : 'bg-white text-gray-600'
            }`}
          >
            📋 Templates
          </button>
          <button
            onClick={() => setActiveTab('audit')}
            className={`px-4 py-2 rounded-lg font-medium ${
              activeTab === 'audit' ? 'bg-red-600 text-white' : 'bg-white text-gray-600'
            }`}
          >
            📜 Audit Trail
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`px-4 py-2 rounded-lg font-medium ${
              activeTab === 'users' ? 'bg-red-600 text-white' : 'bg-white text-gray-600'
            }`}
          >
            👥 User Management
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`px-4 py-2 rounded-lg font-medium ${
              activeTab === 'settings' ? 'bg-red-600 text-white' : 'bg-white text-gray-600'
            }`}
          >
            ⚙️ System Settings
          </button>
        </div>

        {/* Content */}
        {activeTab === 'capabilities' && (
          <div className="space-y-6">
            {ROLES.map(role => (
              <div key={role.id} className="bg-white rounded-lg shadow-lg overflow-hidden">
                <div className={`bg-${role.color}-500 px-6 py-4 flex items-center justify-between`}>
                  <div>
                    <h2 className="text-xl font-bold text-white">{role.name}</h2>
                    <p className="text-white text-sm opacity-90">{role.description}</p>
                  </div>
                  <div className="text-white text-sm">
                    {Object.values(capabilities[role.id] || {}).filter(m => m.enabled).length} / {MODULES.length} modules enabled
                  </div>
                </div>

                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {MODULES.map(module => {
                      const isEnabled = capabilities[role.id]?.[module.id]?.enabled || false;
                      const permissions = capabilities[role.id]?.[module.id]?.permissions || [];

                      return (
                        <div
                          key={module.id}
                          className={`border-2 rounded-lg p-4 transition-all ${
                            isEnabled ? 'border-green-300 bg-green-50' : 'border-gray-200 bg-gray-50'
                          }`}
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <span className="text-2xl">{module.icon}</span>
                              <div>
                                <h4 className="font-semibold text-gray-900">{module.name}</h4>
                                <p className="text-xs text-gray-500">{module.description}</p>
                              </div>
                            </div>
                            <button
                              onClick={() => toggleModuleAccess(role.id, module.id)}
                              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                                isEnabled ? 'bg-green-600' : 'bg-gray-300'
                              }`}
                            >
                              <span
                                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                  isEnabled ? 'translate-x-6' : 'translate-x-1'
                                }`}
                              />
                            </button>
                          </div>

                          {isEnabled && (
                            <div className="mt-3 pt-3 border-t border-green-200">
                              <p className="text-xs font-medium text-gray-700 mb-2">Permissions:</p>
                              <div className="flex flex-wrap gap-2">
                                {['read', 'write', 'delete'].map(perm => (
                                  <button
                                    key={perm}
                                    onClick={() => togglePermission(role.id, module.id, perm)}
                                    className={`px-2 py-1 text-xs rounded font-medium transition-colors ${
                                      permissions.includes(perm)
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-gray-200 text-gray-600'
                                    }`}
                                  >
                                    {perm === 'read' ? '👁️' : perm === 'write' ? '✏️' : '🗑️'} {perm}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'templates' && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Capability Templates</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {Object.entries(permissionTemplates).map(([templateName, template]) => (
                <div key={templateName} className="bg-white rounded-lg shadow-lg p-6 border-t-4 border-blue-500">
                  <div className="text-4xl mb-4">
                    {templateName === 'startup' ? '🚀' :
                     templateName === 'enterprise' ? '🏢' :
                     templateName === 'remote' ? '🌍' :
                     templateName === 'security_focused' ? '🔒' : '📋'}
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">{template.name}</h3>
                  <p className="text-gray-600 text-sm mb-4">
                    {template.description}
                  </p>
                  <button
                    onClick={() => applyTemplate(templateName)}
                    disabled={saving}
                    className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
                  >
                    {saving ? 'Applying...' : 'Apply Template'}
                  </button>
                </div>
              ))}
            </div>

            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
              <p className="text-sm text-yellow-800">
                <span className="font-semibold">Note:</span> Applying a template will override your current capability settings. Make sure to save after applying.
              </p>
            </div>
          </div>
        )}

        {activeTab === 'audit' && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">Audit Trail</h2>
              <button
                onClick={async () => {
                  try {
                    await api.post('/admin/create-sample-audit-logs');
                    alert('✅ Sample audit logs created successfully!');
                    fetchAuditLogs(); // Refresh the logs
                  } catch (error) {
                    console.error('Error creating sample logs:', error);
                    alert('❌ Failed to create sample logs');
                  }
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
              >
                Create Sample Logs
              </button>
            </div>
            
            <div className="space-y-3">
              {!auditLogs || auditLogs.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <div className="text-5xl mb-4">📜</div>
                  <p>No audit logs found</p>
                  <p className="text-sm mt-2">Audit logs will appear here when administrative actions are performed</p>
                  <p className="text-sm mt-2 text-blue-600">Click "Create Sample Logs" above to generate test data</p>
                </div>
              ) : (
                auditLogs.map((log) => (
                  <div key={log.id} className="p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3">
                        <span className="text-2xl">
                          {log.action === 'capability_change' ? '🎛️' :
                           log.action === 'role_change' ? '👤' :
                           log.action === 'user_create' ? '➕' :
                           log.action === 'user_activate' ? '✅' :
                           log.action === 'user_deactivate' ? '❌' :
                           log.action === 'system_setting_change' ? '⚙️' :
                           log.action === 'login' ? '🔐' :
                           log.action === 'logout' ? '🚪' : '📝'}
                        </span>
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">
                            {log.action.replace('_', ' ').toUpperCase()}
                          </p>
                          <p className="text-sm text-gray-600 mt-1">
                            By: <span className="font-medium">{log.user_email}</span> • 
                            Resource: <span className="font-medium">{log.resource_type}</span>
                            {log.resource_id > 0 && ` (ID: ${log.resource_id})`}
                          </p>
                          {log.details && (
                            <p className="text-sm text-gray-700 mt-1">{log.details}</p>
                          )}
                          <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                            <span>🕒 {new Date(log.created_at).toLocaleString()}</span>
                            {log.ip_address && <span>🌐 {log.ip_address}</span>}
                            {log.user_agent && (
                              <span className="truncate max-w-xs">🖥️ {log.user_agent}</span>
                            )}
                          </div>
                          {(log.old_value || log.new_value) && (
                            <div className="mt-3 p-3 bg-gray-50 rounded text-xs">
                              {log.old_value && (
                                <div className="mb-2">
                                  <span className="font-medium text-red-600">Old:</span>
                                  <span className="text-gray-600 ml-2">{log.old_value}</span>
                                </div>
                              )}
                              {log.new_value && (
                                <div>
                                  <span className="font-medium text-green-600">New:</span>
                                  <span className="text-gray-600 ml-2">{log.new_value}</span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                      <span className={`px-2 py-1 text-xs rounded font-medium ${
                        log.risk_level === 'high' ? 'bg-red-100 text-red-800' :
                        log.risk_level === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                        log.risk_level === 'critical' ? 'bg-red-200 text-red-900' :
                        'bg-green-100 text-green-800'
                      }`}>
                        {log.risk_level || 'low'}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === 'users' && (
          <div className="space-y-6">
            {/* User Statistics */}
            {userStats && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white p-6 rounded-lg shadow-lg">
                  <p className="text-blue-100 text-sm">Total Users</p>
                  <h3 className="text-4xl font-bold mt-2">{userStats.total_users}</h3>
                </div>
                <div className="bg-gradient-to-br from-green-500 to-green-600 text-white p-6 rounded-lg shadow-lg">
                  <p className="text-green-100 text-sm">Active Users</p>
                  <h3 className="text-4xl font-bold mt-2">{userStats.active_users}</h3>
                </div>
                <div className="bg-gradient-to-br from-red-500 to-red-600 text-white p-6 rounded-lg shadow-lg">
                  <p className="text-red-100 text-sm">Inactive Users</p>
                  <h3 className="text-4xl font-bold mt-2">{userStats.inactive_users}</h3>
                </div>
                <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white p-6 rounded-lg shadow-lg">
                  <p className="text-purple-100 text-sm">Roles</p>
                  <h3 className="text-4xl font-bold mt-2">{Object.keys(userStats.by_role || {}).length}</h3>
                </div>
              </div>
            )}

            {/* Users by Role */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-6">Users by Role</h3>
              <div className="space-y-4">
                {userStats && Object.entries(userStats.by_role || {}).map(([role, count]) => (
                  <div key={role} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <span className="text-2xl">
                        {role === 'super_admin' ? '🔴' :
                         role === 'hr_manager' ? '🟣' :
                         role === 'hiring_manager' ? '🔵' :
                         role === 'employee' ? '🟢' : '🟡'}
                      </span>
                      <span className="font-medium text-gray-900 capitalize">{role.replace('_', ' ')}</span>
                    </div>
                    <span className="text-2xl font-bold text-gray-700">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-6">System Settings</h2>
              
              <div className="space-y-6">
                {/* Session Management */}
                <div className="border-b pb-6">
                  <h3 className="font-semibold text-gray-900 mb-4">Session Management</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Session Timeout (minutes)</label>
                      <input
                        type="number"
                        defaultValue={30}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Max Concurrent Sessions</label>
                      <input
                        type="number"
                        defaultValue={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                  </div>
                </div>

                {/* Security Settings */}
                <div className="border-b pb-6">
                  <h3 className="font-semibold text-gray-900 mb-4">Security Settings</h3>
                  <div className="space-y-3">
                    <label className="flex items-center">
                      <input type="checkbox" defaultChecked className="h-4 w-4 text-red-600 rounded" />
                      <span className="ml-2 text-sm text-gray-700">Require 2FA for Super Admins</span>
                    </label>
                    <label className="flex items-center">
                      <input type="checkbox" defaultChecked className="h-4 w-4 text-red-600 rounded" />
                      <span className="ml-2 text-sm text-gray-700">Log all data access</span>
                    </label>
                    <label className="flex items-center">
                      <input type="checkbox" className="h-4 w-4 text-red-600 rounded" />
                      <span className="ml-2 text-sm text-gray-700">IP Whitelisting</span>
                    </label>
                    <label className="flex items-center">
                      <input type="checkbox" defaultChecked className="h-4 w-4 text-red-600 rounded" />
                      <span className="ml-2 text-sm text-gray-700">Password expiry (90 days)</span>
                    </label>
                  </div>
                </div>

                {/* Data Retention */}
                <div className="border-b pb-6">
                  <h3 className="font-semibold text-gray-900 mb-4">Data Retention</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Audit Logs (days)</label>
                      <input
                        type="number"
                        defaultValue={365}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Application Data (days)</label>
                      <input
                        type="number"
                        defaultValue={730}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                  </div>
                </div>

                {/* Email Notifications */}
                <div>
                  <h3 className="font-semibold text-gray-900 mb-4">Email Notifications</h3>
                  <div className="space-y-3">
                    <label className="flex items-center">
                      <input type="checkbox" defaultChecked className="h-4 w-4 text-red-600 rounded" />
                      <span className="ml-2 text-sm text-gray-700">Notify on capability changes</span>
                    </label>
                    <label className="flex items-center">
                      <input type="checkbox" defaultChecked className="h-4 w-4 text-red-600 rounded" />
                      <span className="ml-2 text-sm text-gray-700">Notify on role changes</span>
                    </label>
                    <label className="flex items-center">
                      <input type="checkbox" className="h-4 w-4 text-red-600 rounded" />
                      <span className="ml-2 text-sm text-gray-700">Daily security digest</span>
                    </label>
                  </div>
                </div>

                <div className="pt-6">
                  <button className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">
                    Save Settings
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'overview' && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Access Overview Matrix</h2>
            
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Module
                    </th>
                    {ROLES.map(role => (
                      <th key={role.id} className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {role.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {MODULES.map(module => (
                    <tr key={module.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <span className="text-xl mr-2">{module.icon}</span>
                          <span className="text-sm font-medium text-gray-900">{module.name}</span>
                        </div>
                      </td>
                      {ROLES.map(role => {
                        const isEnabled = capabilities[role.id]?.[module.id]?.enabled || false;
                        const permissions = capabilities[role.id]?.[module.id]?.permissions || [];
                        
                        return (
                          <td key={role.id} className="px-6 py-4 whitespace-nowrap text-center">
                            {isEnabled ? (
                              <div>
                                <span className="text-green-600 text-xl">✓</span>
                                <div className="text-xs text-gray-500 mt-1">
                                  {permissions.join(', ')}
                                </div>
                              </div>
                            ) : (
                              <span className="text-red-600 text-xl">✗</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
