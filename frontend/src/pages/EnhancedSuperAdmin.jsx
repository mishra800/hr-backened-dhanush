import { useState, useEffect, useCallback } from 'react';
import api from '../api/axios';

export default function EnhancedSuperAdmin() {
  // State management
  const [activeTab, setActiveTab] = useState('capabilities');
  const [capabilities, setCapabilities] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [auditLogs, setAuditLogs] = useState({ logs: [], total: 0 });
  const [userStats, setUserStats] = useState(null);
  const [usersList, setUsersList] = useState({ users: [], total: 0 });
  const [systemSettings, setSystemSettings] = useState({});
  const [permissionTemplates, setPermissionTemplates] = useState({});
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Pagination and filtering
  const [auditFilters, setAuditFilters] = useState({
    skip: 0,
    limit: 20,
    action_filter: '',
    user_filter: null,
    days_back: 30
  });
  const [usersFilters, setUsersFilters] = useState({
    skip: 0,
    limit: 20,
    role_filter: ''
  });

  // Confirmation dialogs
  const [confirmDialog, setConfirmDialog] = useState({ show: false, title: '', message: '', onConfirm: null });

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
    { id: 'super_admin', name: 'Super Admin', color: 'red', description: 'Full system access with all privileges' },
    { id: 'admin', name: 'Admin', color: 'red', description: 'System administrator with full access' },
    { id: 'hr', name: 'HR', color: 'purple', description: 'Human Resources management' },
    { id: 'manager', name: 'Manager', color: 'blue', description: 'Team management and oversight' },
    { id: 'employee', name: 'Employee', color: 'green', description: 'Regular employee access' },
    { id: 'assets_team', name: 'Assets Team', color: 'orange', description: 'IT assets and infrastructure management' },
    { id: 'candidate', name: 'Candidate', color: 'yellow', description: 'Job applicant access' },
  ];

  // Utility functions
  const showError = (message) => {
    setError(message);
    setTimeout(() => setError(null), 5000);
  };

  const showSuccess = (message) => {
    setSuccess(message);
    setTimeout(() => setSuccess(null), 3000);
  };

  const showConfirmDialog = (title, message, onConfirm) => {
    setConfirmDialog({ show: true, title, message, onConfirm });
  };

  const hideConfirmDialog = () => {
    setConfirmDialog({ show: false, title: '', message: '', onConfirm: null });
  };

  // Data fetching functions
  const fetchCapabilities = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get('/admin/capabilities');
      setCapabilities(response.data);
    } catch (error) {
      console.error('Error fetching capabilities:', error);
      showError('Failed to load capabilities. Using default values.');
      initializeDefaultCapabilities();
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchAuditLogs = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      Object.entries(auditFilters).forEach(([key, value]) => {
        if (value !== '' && value !== null) {
          params.append(key, value);
        }
      });
      
      const response = await api.get(`/admin/audit-logs?${params}`);
      setAuditLogs(response.data);
    } catch (error) {
      console.error('Error fetching audit logs:', error);
      showError('Failed to load audit logs');
    }
  }, [auditFilters]);

  const fetchUserStats = useCallback(async () => {
    try {
      const response = await api.get('/admin/users/stats');
      setUserStats(response.data);
    } catch (error) {
      console.error('Error fetching user stats:', error);
      showError('Failed to load user statistics');
    }
  }, []);

  const fetchUsersList = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      Object.entries(usersFilters).forEach(([key, value]) => {
        if (value !== '' && value !== null) {
          params.append(key, value);
        }
      });
      
      const response = await api.get(`/admin/users?${params}`);
      setUsersList(response.data);
    } catch (error) {
      console.error('Error fetching users list:', error);
      showError('Failed to load users list');
    }
  }, [usersFilters]);

  const fetchSystemSettings = useCallback(async () => {
    try {
      const response = await api.get('/admin/system-settings');
      setSystemSettings(response.data);
    } catch (error) {
      console.error('Error fetching system settings:', error);
      showError('Failed to load system settings');
    }
  }, []);

  const fetchPermissionTemplates = useCallback(async () => {
    try {
      const response = await api.get('/admin/permission-templates');
      setPermissionTemplates(response.data);
    } catch (error) {
      console.error('Error fetching permission templates:', error);
      showError('Failed to load permission templates');
    }
  }, []);

  // Initialize data on component mount
  useEffect(() => {
    fetchCapabilities();
    fetchUserStats();
    fetchPermissionTemplates();
    fetchSystemSettings();
  }, [fetchCapabilities, fetchUserStats, fetchPermissionTemplates, fetchSystemSettings]);

  useEffect(() => {
    if (activeTab === 'audit') {
      fetchAuditLogs();
    }
  }, [activeTab, fetchAuditLogs]);

  useEffect(() => {
    if (activeTab === 'users') {
      fetchUsersList();
    }
  }, [activeTab, fetchUsersList]);

  // Default capabilities initialization
  const initializeDefaultCapabilities = () => {
    const defaultCaps = {};
    ROLES.forEach(role => {
      defaultCaps[role.id] = {};
      MODULES.forEach(module => {
        if (role.id === 'super_admin' || role.id === 'admin') {
          defaultCaps[role.id][module.id] = { enabled: true, permissions: ['read', 'write', 'delete'] };
        } else if (role.id === 'hr') {
          defaultCaps[role.id][module.id] = { enabled: true, permissions: ['read', 'write'] };
        } else if (role.id === 'manager') {
          const managerModules = ['dashboard', 'recruitment', 'employees', 'attendance', 'leave', 'performance', 'engagement', 'analysis', 'assets', 'announcements'];
          defaultCaps[role.id][module.id] = {
            enabled: managerModules.includes(module.id),
            permissions: managerModules.includes(module.id) ? ['read', 'write'] : []
          };
        } else if (role.id === 'assets_team') {
          const assetsModules = ['dashboard', 'assets', 'announcements'];
          defaultCaps[role.id][module.id] = {
            enabled: assetsModules.includes(module.id),
            permissions: assetsModules.includes(module.id) ? ['read', 'write'] : []
          };
        } else if (role.id === 'employee') {
          const employeeModules = ['dashboard', 'attendance', 'leave', 'performance', 'engagement', 'learning', 'career', 'assets', 'announcements'];
          defaultCaps[role.id][module.id] = {
            enabled: employeeModules.includes(module.id),
            permissions: employeeModules.includes(module.id) ? ['read'] : []
          };
        } else if (role.id === 'candidate') {
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

  // Capability management functions
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
    showConfirmDialog(
      'Save Capabilities',
      'Are you sure you want to save these capability changes? This will affect all users in the system.',
      async () => {
        try {
          setSaving(true);
          await api.post('/admin/capabilities', { capabilities });
          showSuccess('✅ Capabilities saved successfully!');
          hideConfirmDialog();
        } catch (error) {
          console.error('Error saving capabilities:', error);
          showError('❌ Failed to save capabilities. Please try again.');
        } finally {
          setSaving(false);
        }
      }
    );
  };

  // Template management
  const applyTemplate = (templateName) => {
    const template = permissionTemplates[templateName];
    if (!template) return;

    showConfirmDialog(
      `Apply ${template.name}`,
      `${template.description}\n\nThis will override your current capability settings. Are you sure?`,
      async () => {
        try {
          setSaving(true);
          await api.post(`/admin/permission-templates/${templateName}/apply`);
          await fetchCapabilities(); // Refresh capabilities
          showSuccess(`✅ ${template.name} template applied successfully!`);
          hideConfirmDialog();
        } catch (error) {
          console.error('Error applying template:', error);
          showError('❌ Failed to apply template. Please try again.');
        } finally {
          setSaving(false);
        }
      }
    );
  };

  // User management functions
  const updateUserRole = async (userId, newRole, userEmail) => {
    showConfirmDialog(
      'Change User Role',
      `Are you sure you want to change ${userEmail}'s role to ${newRole}? This will immediately affect their system access.`,
      async () => {
        try {
          await api.patch(`/admin/users/${userId}/role`, { new_role: newRole });
          showSuccess(`✅ User role updated successfully!`);
          await fetchUsersList();
          await fetchUserStats();
          hideConfirmDialog();
        } catch (error) {
          console.error('Error updating user role:', error);
          showError('❌ Failed to update user role. Please try again.');
        }
      }
    );
  };

  const toggleUserStatus = async (userId, currentStatus, userEmail) => {
    const action = currentStatus ? 'deactivate' : 'activate';
    const actionText = currentStatus ? 'deactivate' : 'activate';
    
    showConfirmDialog(
      `${actionText.charAt(0).toUpperCase() + actionText.slice(1)} User`,
      `Are you sure you want to ${actionText} ${userEmail}? This will ${currentStatus ? 'prevent them from accessing' : 'allow them to access'} the system.`,
      async () => {
        try {
          await api.post(`/admin/users/${userId}/${action}`);
          showSuccess(`✅ User ${actionText}d successfully!`);
          await fetchUsersList();
          await fetchUserStats();
          hideConfirmDialog();
        } catch (error) {
          console.error(`Error ${actionText}ing user:`, error);
          showError(`❌ Failed to ${actionText} user. Please try again.`);
        }
      }
    );
  };

  // System settings management
  const saveSystemSettings = async () => {
    showConfirmDialog(
      'Save System Settings',
      'Are you sure you want to save these system settings? Some changes may require users to log in again.',
      async () => {
        try {
          await api.post('/admin/system-settings', { settings: systemSettings });
          showSuccess('✅ System settings saved successfully!');
          hideConfirmDialog();
        } catch (error) {
          console.error('Error saving system settings:', error);
          showError('❌ Failed to save system settings. Please try again.');
        }
      }
    );
  };

  // Reset functions
  const resetToDefaults = () => {
    showConfirmDialog(
      'Reset to Defaults',
      'Are you sure you want to reset all capabilities to default values? This cannot be undone and will affect all users.',
      () => {
        initializeDefaultCapabilities();
        showSuccess('Capabilities reset to defaults. Click "Save Changes" to apply.');
        hideConfirmDialog();
      }
    );
  };

  // Utility functions for display
  const getRiskLevelColor = (riskLevel) => {
    switch (riskLevel) {
      case 'critical': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getActionIcon = (action) => {
    const icons = {
      capability_change: '🎛️',
      role_change: '👤',
      user_create: '➕',
      user_delete: '🗑️',
      user_activate: '✅',
      user_deactivate: '❌',
      system_setting_change: '⚙️',
      login: '🔐',
      logout: '🚪',
      permission_grant: '🔓',
      permission_revoke: '🔒'
    };
    return icons[action] || '📝';
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading Enhanced Super Admin Panel...</p>
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
                Enhanced Super Admin Panel
              </h1>
              <p className="text-gray-500 mt-1">Comprehensive system management and security controls</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={resetToDefaults}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Reset to Defaults
              </button>
              <button
                onClick={saveCapabilities}
                disabled={saving}
                className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-400 font-semibold transition-colors"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>

        {/* Alert Messages */}
        {error && (
          <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-4 rounded-lg">
            <div className="flex">
              <span className="text-red-500 text-xl mr-3">❌</span>
              <p className="text-red-700">{error}</p>
            </div>
          </div>
        )}

        {success && (
          <div className="mb-6 bg-green-50 border-l-4 border-green-500 p-4 rounded-lg">
            <div className="flex">
              <span className="text-green-500 text-xl mr-3">✅</span>
              <p className="text-green-700">{success}</p>
            </div>
          </div>
        )}

        {/* Security Warning Banner */}
        <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 rounded-lg">
          <div className="flex">
            <div className="flex-shrink-0">
              <span className="text-2xl">⚠️</span>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Security Warning: Super Admin Access</h3>
              <p className="text-sm text-red-700 mt-1">
                Changes made here will affect all users in the system. All actions are logged for security auditing. 
                Disabling critical modules may prevent users from performing their duties. Use with extreme caution.
              </p>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex flex-wrap gap-2 mb-6">
          {[
            { id: 'capabilities', icon: '🎛️', label: 'Module Capabilities' },
            { id: 'overview', icon: '📊', label: 'Access Overview' },
            { id: 'templates', icon: '📋', label: 'Permission Templates' },
            { id: 'users', icon: '👥', label: 'User Management' },
            { id: 'audit', icon: '📜', label: 'Audit Trail' },
            { id: 'settings', icon: '⚙️', label: 'System Settings' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === tab.id 
                  ? 'bg-red-600 text-white shadow-lg' 
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>
        {/* Tab Content */}
        {activeTab === 'capabilities' && (
          <div className="space-y-6">
            {ROLES.map(role => (
              <div key={role.id} className="bg-white rounded-lg shadow-lg overflow-hidden">
                <div className={`bg-gradient-to-r from-${role.color}-500 to-${role.color}-600 px-6 py-4 flex items-center justify-between`}>
                  <div>
                    <h2 className="text-xl font-bold text-white">{role.name}</h2>
                    <p className="text-white text-sm opacity-90">{role.description}</p>
                  </div>
                  <div className="text-white text-sm bg-white bg-opacity-20 px-3 py-1 rounded-full">
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
                          className={`border-2 rounded-lg p-4 transition-all duration-200 ${
                            isEnabled 
                              ? 'border-green-300 bg-green-50 shadow-md' 
                              : 'border-gray-200 bg-gray-50 hover:border-gray-300'
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
                              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ${
                                isEnabled ? 'bg-green-600' : 'bg-gray-300'
                              }`}
                            >
                              <span
                                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ${
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
                                    className={`px-2 py-1 text-xs rounded font-medium transition-colors duration-200 ${
                                      permissions.includes(perm)
                                        ? 'bg-blue-600 text-white shadow-sm'
                                        : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
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
                    <tr key={module.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <span className="text-xl mr-2">{module.icon}</span>
                          <div>
                            <span className="text-sm font-medium text-gray-900">{module.name}</span>
                            <p className="text-xs text-gray-500">{module.description}</p>
                          </div>
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
                                  {permissions.map(p => p.charAt(0).toUpperCase()).join(', ')}
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

        {activeTab === 'templates' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">Permission Templates</h2>
              <p className="text-sm text-gray-600">Pre-configured permission sets for different organizational needs</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {Object.entries(permissionTemplates).map(([templateName, template]) => (
                <div key={templateName} className="bg-white rounded-lg shadow-lg p-6 border-t-4 border-blue-500 hover:shadow-xl transition-shadow">
                  <div className="text-4xl mb-4">
                    {templateName === 'startup' ? '🚀' :
                     templateName === 'enterprise' ? '🏢' :
                     templateName === 'remote' ? '🌍' :
                     templateName === 'security_focused' ? '🔒' : '📋'}
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">{template.name}</h3>
                  <p className="text-gray-600 text-sm mb-4 min-h-[3rem]">
                    {template.description}
                  </p>
                  <button
                    onClick={() => applyTemplate(templateName)}
                    disabled={saving}
                    className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
                  >
                    {saving ? 'Applying...' : 'Apply Template'}
                  </button>
                </div>
              ))}
            </div>

            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-lg">
              <div className="flex">
                <span className="text-yellow-500 text-xl mr-3">⚠️</span>
                <div>
                  <p className="text-sm text-yellow-800">
                    <span className="font-semibold">Important:</span> Applying a template will completely override your current capability settings. 
                    This action is logged and cannot be undone. Make sure to review the template before applying.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'users' && (
          <div className="space-y-6">
            {/* User Statistics */}
            {userStats && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white p-6 rounded-lg shadow-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-blue-100 text-sm">Total Users</p>
                      <h3 className="text-4xl font-bold mt-2">{userStats.total_users}</h3>
                    </div>
                    <span className="text-5xl opacity-20">👥</span>
                  </div>
                </div>
                <div className="bg-gradient-to-br from-green-500 to-green-600 text-white p-6 rounded-lg shadow-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-green-100 text-sm">Active Users</p>
                      <h3 className="text-4xl font-bold mt-2">{userStats.active_users}</h3>
                    </div>
                    <span className="text-5xl opacity-20">✅</span>
                  </div>
                </div>
                <div className="bg-gradient-to-br from-red-500 to-red-600 text-white p-6 rounded-lg shadow-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-red-100 text-sm">Inactive Users</p>
                      <h3 className="text-4xl font-bold mt-2">{userStats.inactive_users}</h3>
                    </div>
                    <span className="text-5xl opacity-20">❌</span>
                  </div>
                </div>
                <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white p-6 rounded-lg shadow-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-purple-100 text-sm">Roles</p>
                      <h3 className="text-4xl font-bold mt-2">{Object.keys(userStats.by_role || {}).length}</h3>
                    </div>
                    <span className="text-5xl opacity-20">🎭</span>
                  </div>
                </div>
              </div>
            )}

            {/* User Filters */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="flex flex-wrap items-center gap-4 mb-4">
                <h3 className="text-lg font-semibold text-gray-900">User Management</h3>
                <select
                  value={usersFilters.role_filter}
                  onChange={(e) => setUsersFilters(prev => ({ ...prev, role_filter: e.target.value, skip: 0 }))}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                >
                  <option value="">All Roles</option>
                  {ROLES.map(role => (
                    <option key={role.id} value={role.id}>{role.name}</option>
                  ))}
                </select>
                <button
                  onClick={() => fetchUsersList()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                >
                  Refresh
                </button>
              </div>

              {/* Users List */}
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Login</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {usersList.users?.map(user => (
                      <tr key={user.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">{user.email}</div>
                            <div className="text-sm text-gray-500">ID: {user.id}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <select
                            value={user.role}
                            onChange={(e) => updateUserRole(user.id, e.target.value, user.email)}
                            className="text-sm border border-gray-300 rounded px-2 py-1"
                          >
                            {ROLES.map(role => (
                              <option key={role.id} value={role.id}>{role.name}</option>
                            ))}
                          </select>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            user.is_active 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {user.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {user.last_login ? formatDate(user.last_login) : 'Never'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button
                            onClick={() => toggleUserStatus(user.id, user.is_active, user.email)}
                            className={`px-3 py-1 rounded text-xs font-medium ${
                              user.is_active
                                ? 'bg-red-100 text-red-800 hover:bg-red-200'
                                : 'bg-green-100 text-green-800 hover:bg-green-200'
                            }`}
                          >
                            {user.is_active ? 'Deactivate' : 'Activate'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {usersList.total > usersFilters.limit && (
                <div className="flex items-center justify-between mt-4">
                  <p className="text-sm text-gray-700">
                    Showing {usersFilters.skip + 1} to {Math.min(usersFilters.skip + usersFilters.limit, usersList.total)} of {usersList.total} users
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setUsersFilters(prev => ({ ...prev, skip: Math.max(0, prev.skip - prev.limit) }))}
                      disabled={usersFilters.skip === 0}
                      className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => setUsersFilters(prev => ({ ...prev, skip: prev.skip + prev.limit }))}
                      disabled={usersFilters.skip + usersFilters.limit >= usersList.total}
                      className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Users by Role */}
            {userStats && (
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-6">Users by Role Distribution</h3>
                <div className="space-y-4">
                  {Object.entries(userStats.by_role || {}).map(([role, count]) => {
                    const roleInfo = ROLES.find(r => r.id === role);
                    const percentage = userStats.total_users > 0 ? (count / userStats.total_users * 100).toFixed(1) : 0;
                    
                    return (
                      <div key={role} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                        <div className="flex items-center space-x-3">
                          <span className="text-2xl">
                            {role === 'super_admin' ? '🔴' :
                             role === 'admin' ? '🔴' :
                             role === 'hr' ? '🟣' :
                             role === 'manager' ? '🔵' :
                             role === 'employee' ? '🟢' :
                             role === 'assets_team' ? '🟠' : '🟡'}
                          </span>
                          <div>
                            <span className="font-medium text-gray-900">{roleInfo?.name || role}</span>
                            <p className="text-sm text-gray-500">{percentage}% of total users</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-2xl font-bold text-gray-700">{count}</span>
                          <div className="w-20 bg-gray-200 rounded-full h-2 mt-1">
                            <div 
                              className="bg-blue-600 h-2 rounded-full" 
                              style={{ width: `${percentage}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'audit' && (
          <div className="space-y-6">
            {/* Audit Filters */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="flex flex-wrap items-center gap-4 mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Audit Trail Filters</h3>
                <select
                  value={auditFilters.action_filter}
                  onChange={(e) => setAuditFilters(prev => ({ ...prev, action_filter: e.target.value, skip: 0 }))}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                >
                  <option value="">All Actions</option>
                  <option value="capability_change">Capability Changes</option>
                  <option value="role_change">Role Changes</option>
                  <option value="user_create">User Creation</option>
                  <option value="user_activate">User Activation</option>
                  <option value="user_deactivate">User Deactivation</option>
                  <option value="system_setting_change">System Settings</option>
                  <option value="login">Login Events</option>
                  <option value="logout">Logout Events</option>
                </select>
                <select
                  value={auditFilters.days_back}
                  onChange={(e) => setAuditFilters(prev => ({ ...prev, days_back: parseInt(e.target.value), skip: 0 }))}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                >
                  <option value={7}>Last 7 days</option>
                  <option value={30}>Last 30 days</option>
                  <option value={90}>Last 90 days</option>
                  <option value={365}>Last year</option>
                </select>
                <button
                  onClick={() => fetchAuditLogs()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                >
                  Refresh
                </button>
              </div>
            </div>

            {/* Audit Logs */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Security Audit Trail</h2>
              
              <div className="space-y-3">
                {auditLogs.logs?.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <div className="text-5xl mb-4">📜</div>
                    <p>No audit logs found for the selected criteria</p>
                  </div>
                ) : (
                  auditLogs.logs?.map((log) => (
                    <div key={log.id} className="p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-3">
                          <span className="text-2xl">{getActionIcon(log.action)}</span>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <p className="font-medium text-gray-900">{log.action.replace('_', ' ').toUpperCase()}</p>
                              <span className={`px-2 py-1 text-xs rounded font-medium ${getRiskLevelColor(log.risk_level)}`}>
                                {log.risk_level}
                              </span>
                            </div>
                            <p className="text-sm text-gray-600 mb-2">
                              By: <span className="font-medium">{log.user_email}</span> • 
                              Resource: <span className="font-medium">{log.resource_type}</span>
                              {log.resource_id > 0 && ` (ID: ${log.resource_id})`}
                            </p>
                            {log.details && (
                              <p className="text-sm text-gray-700 mb-2">{log.details}</p>
                            )}
                            <div className="flex items-center gap-4 text-xs text-gray-500">
                              <span>🕒 {formatDate(log.created_at)}</span>
                              <span>🌐 {log.ip_address}</span>
                              {log.user_agent && (
                                <span className="truncate max-w-xs">🖥️ {log.user_agent}</span>
                              )}
                            </div>
                            {(log.old_value || log.new_value) && (
                              <div className="mt-3 p-3 bg-gray-50 rounded text-xs">
                                {log.old_value && (
                                  <div className="mb-2">
                                    <span className="font-medium text-red-600">Old:</span>
                                    <pre className="text-gray-600 whitespace-pre-wrap">{log.old_value}</pre>
                                  </div>
                                )}
                                {log.new_value && (
                                  <div>
                                    <span className="font-medium text-green-600">New:</span>
                                    <pre className="text-gray-600 whitespace-pre-wrap">{log.new_value}</pre>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Pagination */}
              {auditLogs.total > auditFilters.limit && (
                <div className="flex items-center justify-between mt-6">
                  <p className="text-sm text-gray-700">
                    Showing {auditFilters.skip + 1} to {Math.min(auditFilters.skip + auditFilters.limit, auditLogs.total)} of {auditLogs.total} logs
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setAuditFilters(prev => ({ ...prev, skip: Math.max(0, prev.skip - prev.limit) }))}
                      disabled={auditFilters.skip === 0}
                      className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => setAuditFilters(prev => ({ ...prev, skip: prev.skip + prev.limit }))}
                      disabled={auditFilters.skip + auditFilters.limit >= auditLogs.total}
                      className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-6">System Settings</h2>
              
              <div className="space-y-8">
                {/* Session Management */}
                <div className="border-b pb-6">
                  <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <span>🕒</span> Session Management
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Session Timeout (minutes)</label>
                      <input
                        type="number"
                        value={systemSettings.session?.timeout_minutes || 30}
                        onChange={(e) => setSystemSettings(prev => ({
                          ...prev,
                          session: { ...prev.session, timeout_minutes: parseInt(e.target.value) }
                        }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Max Concurrent Sessions</label>
                      <input
                        type="number"
                        value={systemSettings.session?.max_concurrent_sessions || 3}
                        onChange={(e) => setSystemSettings(prev => ({
                          ...prev,
                          session: { ...prev.session, max_concurrent_sessions: parseInt(e.target.value) }
                        }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                      />
                    </div>
                  </div>
                  <div className="mt-4">
                    <label className="flex items-center">
                      <input 
                        type="checkbox" 
                        checked={systemSettings.session?.require_2fa_for_admins || false}
                        onChange={(e) => setSystemSettings(prev => ({
                          ...prev,
                          session: { ...prev.session, require_2fa_for_admins: e.target.checked }
                        }))}
                        className="h-4 w-4 text-red-600 rounded focus:ring-red-500" 
                      />
                      <span className="ml-2 text-sm text-gray-700">Require 2FA for Super Admins</span>
                    </label>
                  </div>
                </div>

                {/* Security Settings */}
                <div className="border-b pb-6">
                  <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <span>🔒</span> Security Settings
                  </h3>
                  <div className="space-y-3">
                    <label className="flex items-center">
                      <input 
                        type="checkbox" 
                        checked={systemSettings.security?.log_all_data_access || false}
                        onChange={(e) => setSystemSettings(prev => ({
                          ...prev,
                          security: { ...prev.security, log_all_data_access: e.target.checked }
                        }))}
                        className="h-4 w-4 text-red-600 rounded focus:ring-red-500" 
                      />
                      <span className="ml-2 text-sm text-gray-700">Log all data access</span>
                    </label>
                    <label className="flex items-center">
                      <input 
                        type="checkbox" 
                        checked={systemSettings.security?.ip_whitelisting_enabled || false}
                        onChange={(e) => setSystemSettings(prev => ({
                          ...prev,
                          security: { ...prev.security, ip_whitelisting_enabled: e.target.checked }
                        }))}
                        className="h-4 w-4 text-red-600 rounded focus:ring-red-500" 
                      />
                      <span className="ml-2 text-sm text-gray-700">IP Whitelisting</span>
                    </label>
                    <label className="flex items-center">
                      <input 
                        type="checkbox" 
                        checked={systemSettings.security?.require_special_chars || false}
                        onChange={(e) => setSystemSettings(prev => ({
                          ...prev,
                          security: { ...prev.security, require_special_chars: e.target.checked }
                        }))}
                        className="h-4 w-4 text-red-600 rounded focus:ring-red-500" 
                      />
                      <span className="ml-2 text-sm text-gray-700">Require special characters in passwords</span>
                    </label>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Password Expiry (days)</label>
                      <input
                        type="number"
                        value={systemSettings.security?.password_expiry_days || 90}
                        onChange={(e) => setSystemSettings(prev => ({
                          ...prev,
                          security: { ...prev.security, password_expiry_days: parseInt(e.target.value) }
                        }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Min Password Length</label>
                      <input
                        type="number"
                        value={systemSettings.security?.min_password_length || 8}
                        onChange={(e) => setSystemSettings(prev => ({
                          ...prev,
                          security: { ...prev.security, min_password_length: parseInt(e.target.value) }
                        }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Data Retention */}
                <div className="border-b pb-6">
                  <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <span>🗄️</span> Data Retention
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Audit Logs (days)</label>
                      <input
                        type="number"
                        value={systemSettings.data_retention?.audit_logs_days || 365}
                        onChange={(e) => setSystemSettings(prev => ({
                          ...prev,
                          data_retention: { ...prev.data_retention, audit_logs_days: parseInt(e.target.value) }
                        }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Application Data (days)</label>
                      <input
                        type="number"
                        value={systemSettings.data_retention?.application_data_days || 730}
                        onChange={(e) => setSystemSettings(prev => ({
                          ...prev,
                          data_retention: { ...prev.data_retention, application_data_days: parseInt(e.target.value) }
                        }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">User Activity (days)</label>
                      <input
                        type="number"
                        value={systemSettings.data_retention?.user_activity_days || 90}
                        onChange={(e) => setSystemSettings(prev => ({
                          ...prev,
                          data_retention: { ...prev.data_retention, user_activity_days: parseInt(e.target.value) }
                        }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Email Notifications */}
                <div>
                  <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <span>📧</span> Email Notifications
                  </h3>
                  <div className="space-y-3">
                    <label className="flex items-center">
                      <input 
                        type="checkbox" 
                        checked={systemSettings.notifications?.notify_capability_changes || false}
                        onChange={(e) => setSystemSettings(prev => ({
                          ...prev,
                          notifications: { ...prev.notifications, notify_capability_changes: e.target.checked }
                        }))}
                        className="h-4 w-4 text-red-600 rounded focus:ring-red-500" 
                      />
                      <span className="ml-2 text-sm text-gray-700">Notify on capability changes</span>
                    </label>
                    <label className="flex items-center">
                      <input 
                        type="checkbox" 
                        checked={systemSettings.notifications?.notify_role_changes || false}
                        onChange={(e) => setSystemSettings(prev => ({
                          ...prev,
                          notifications: { ...prev.notifications, notify_role_changes: e.target.checked }
                        }))}
                        className="h-4 w-4 text-red-600 rounded focus:ring-red-500" 
                      />
                      <span className="ml-2 text-sm text-gray-700">Notify on role changes</span>
                    </label>
                    <label className="flex items-center">
                      <input 
                        type="checkbox" 
                        checked={systemSettings.notifications?.daily_security_digest || false}
                        onChange={(e) => setSystemSettings(prev => ({
                          ...prev,
                          notifications: { ...prev.notifications, daily_security_digest: e.target.checked }
                        }))}
                        className="h-4 w-4 text-red-600 rounded focus:ring-red-500" 
                      />
                      <span className="ml-2 text-sm text-gray-700">Daily security digest</span>
                    </label>
                  </div>
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Admin Email</label>
                    <input
                      type="email"
                      value={systemSettings.notifications?.admin_email || ''}
                      onChange={(e) => setSystemSettings(prev => ({
                        ...prev,
                        notifications: { ...prev.notifications, admin_email: e.target.value }
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                      placeholder="admin@company.com"
                    />
                  </div>
                </div>

                <div className="pt-6">
                  <button 
                    onClick={saveSystemSettings}
                    className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  >
                    Save Settings
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Confirmation Dialog */}
        {confirmDialog.show && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">{confirmDialog.title}</h3>
              <p className="text-gray-600 mb-6 whitespace-pre-line">{confirmDialog.message}</p>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={hideConfirmDialog}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    confirmDialog.onConfirm();
                  }}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  Confirm
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}