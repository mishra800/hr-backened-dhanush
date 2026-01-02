import { useState, useEffect } from 'react';
import api from '../../api/axios';

export default function OnboardingDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      setLoading(true);
      const response = await api.get('/onboarding/dashboard-stats');
      setStats(response.data);
    } catch (err) {
      console.error('Error fetching dashboard stats:', err);
      setError('Failed to load dashboard statistics');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-600">{error}</p>
        <button
          onClick={fetchDashboardStats}
          className="mt-2 bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-blue-600 font-bold">👥</span>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Onboarding</p>
              <p className="text-2xl font-bold text-gray-900">{stats?.total_onboarding || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                <span className="text-orange-600 font-bold">⚡</span>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Immediate Joiners</p>
              <p className="text-2xl font-bold text-gray-900">{stats?.immediate_joiners || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                <span className="text-red-600 font-bold">⏰</span>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Overdue</p>
              <p className="text-2xl font-bold text-gray-900">{stats?.overdue || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                <span className="text-green-600 font-bold">✅</span>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Recent Activations</p>
              <p className="text-2xl font-bold text-gray-900">{stats?.recent_activations?.length || 0}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Phase Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Onboarding by Phase</h3>
          <div className="space-y-3">
            {stats?.by_phase && Object.entries(stats.by_phase).map(([phase, count]) => (
              <div key={phase} className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className={`w-3 h-3 rounded-full mr-3 ${getPhaseColor(phase)}`}></div>
                  <span className="text-sm font-medium text-gray-700 capitalize">
                    {phase.replace('_', ' ')}
                  </span>
                </div>
                <span className="text-sm font-bold text-gray-900">{count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Activations */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activations</h3>
          {stats?.recent_activations?.length > 0 ? (
            <div className="space-y-3">
              {stats.recent_activations.map((activation, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{activation.name}</p>
                    <p className="text-xs text-gray-500">{activation.position} • {activation.department}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-green-600 font-medium">
                      {activation.activation_date ? new Date(activation.activation_date).toLocaleDateString() : 'N/A'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-sm">No recent activations</p>
          )}
        </div>
      </div>

      {/* Action Items */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Action Items</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {stats?.overdue > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center">
                <span className="text-red-600 text-lg mr-2">⚠️</span>
                <div>
                  <p className="text-sm font-medium text-red-800">Overdue Onboarding</p>
                  <p className="text-xs text-red-600">{stats.overdue} employees need attention</p>
                </div>
              </div>
            </div>
          )}

          {stats?.immediate_joiners > 0 && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <div className="flex items-center">
                <span className="text-orange-600 text-lg mr-2">⚡</span>
                <div>
                  <p className="text-sm font-medium text-orange-800">Immediate Joiners</p>
                  <p className="text-xs text-orange-600">{stats.immediate_joiners} require expedited processing</p>
                </div>
              </div>
            </div>
          )}

          {stats?.by_phase?.activation > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center">
                <span className="text-blue-600 text-lg mr-2">🎯</span>
                <div>
                  <p className="text-sm font-medium text-blue-800">Pending Activation</p>
                  <p className="text-xs text-blue-600">{stats.by_phase.activation} employees ready for activation</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function getPhaseColor(phase) {
  const colors = {
    pre_boarding: 'bg-gray-400',
    initiation: 'bg-blue-400',
    parallel_tracks: 'bg-purple-400',
    induction: 'bg-yellow-400',
    activation: 'bg-green-400'
  };
  return colors[phase] || 'bg-gray-400';
}