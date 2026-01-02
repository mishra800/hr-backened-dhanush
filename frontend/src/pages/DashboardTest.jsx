import { useState, useEffect } from 'react';
import { useAuth } from '../context/authcontext';
import api from '../api/axios';

// Simple test component to verify dashboard APIs work correctly
export default function DashboardTest() {
  const { user } = useAuth();
  const [testResults, setTestResults] = useState({});
  const [loading, setLoading] = useState(false);

  const runTests = async () => {
    setLoading(true);
    const results = {};

    // Test 1: Dashboard Stats
    try {
      const statsResponse = await api.get('/dashboard/stats');
      results.stats = {
        success: true,
        data: statsResponse.data,
        message: 'Stats API working correctly'
      };
    } catch (error) {
      results.stats = {
        success: false,
        error: error.message,
        message: 'Stats API failed'
      };
    }

    // Test 2: Activities
    try {
      const activitiesResponse = await api.get('/dashboard/activities?limit=5');
      results.activities = {
        success: true,
        count: activitiesResponse.data.length,
        message: `Activities API returned ${activitiesResponse.data.length} items`
      };
    } catch (error) {
      results.activities = {
        success: false,
        error: error.message,
        message: 'Activities API failed'
      };
    }

    // Test 3: Notifications
    try {
      const notificationsResponse = await api.get('/dashboard/notifications');
      results.notifications = {
        success: true,
        count: notificationsResponse.data.length,
        message: `Notifications API returned ${notificationsResponse.data.length} items`
      };
    } catch (error) {
      results.notifications = {
        success: false,
        error: error.message,
        message: 'Notifications API failed'
      };
    }

    // Test 4: Calendar
    try {
      const calendarResponse = await api.get('/dashboard/calendar?days_ahead=7');
      results.calendar = {
        success: true,
        count: calendarResponse.data.length,
        message: `Calendar API returned ${calendarResponse.data.length} events`
      };
    } catch (error) {
      results.calendar = {
        success: false,
        error: error.message,
        message: 'Calendar API failed'
      };
    }

    // Test 5: Role-specific endpoints
    if (user?.role === 'employee') {
      try {
        const employeeStatsResponse = await api.get('/dashboard/employee-stats');
        results.roleSpecific = {
          success: true,
          data: employeeStatsResponse.data,
          message: 'Employee stats API working correctly'
        };
      } catch (error) {
        results.roleSpecific = {
          success: false,
          error: error.message,
          message: 'Employee stats API failed'
        };
      }
    } else if (user?.role === 'manager' || user?.role === 'admin' || user?.role === 'hr') {
      try {
        const teamStatsResponse = await api.get('/dashboard/team-stats');
        results.roleSpecific = {
          success: true,
          data: teamStatsResponse.data,
          message: 'Team stats API working correctly'
        };
      } catch (error) {
        results.roleSpecific = {
          success: false,
          error: error.message,
          message: 'Team stats API failed'
        };
      }
    } else if (user?.role === 'candidate') {
      try {
        const candidateStatsResponse = await api.get('/dashboard/candidate-stats');
        results.roleSpecific = {
          success: true,
          data: candidateStatsResponse.data,
          message: 'Candidate stats API working correctly'
        };
      } catch (error) {
        results.roleSpecific = {
          success: false,
          error: error.message,
          message: 'Candidate stats API failed'
        };
      }
    }

    // Test 6: Cache functionality (if admin)
    if (user?.role === 'admin' || user?.role === 'super_admin') {
      try {
        const cacheStatsResponse = await api.get('/dashboard/cache/stats');
        results.cache = {
          success: true,
          data: cacheStatsResponse.data,
          message: 'Cache stats API working correctly'
        };
      } catch (error) {
        results.cache = {
          success: false,
          error: error.message,
          message: 'Cache stats API failed'
        };
      }
    }

    setTestResults(results);
    setLoading(false);
  };

  useEffect(() => {
    runTests();
  }, [user]);

  const getStatusIcon = (success) => success ? '✅' : '❌';
  const getStatusColor = (success) => success ? 'text-green-600' : 'text-red-600';

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Dashboard API Test Results</h1>
          <button
            onClick={runTests}
            disabled={loading}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Testing...' : 'Run Tests Again'}
          </button>
        </div>

        <div className="mb-4 p-4 bg-blue-50 rounded-lg">
          <h3 className="font-medium text-blue-900">Test Environment</h3>
          <p className="text-blue-700">User: {user?.email}</p>
          <p className="text-blue-700">Role: {user?.role}</p>
          <p className="text-blue-700">Test Time: {new Date().toLocaleString()}</p>
        </div>

        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Running dashboard API tests...</p>
          </div>
        ) : (
          <div className="space-y-4">
            {Object.entries(testResults).map(([testName, result]) => (
              <div key={testName} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium text-gray-900 capitalize">
                    {testName.replace(/([A-Z])/g, ' $1').trim()} Test
                  </h3>
                  <span className={`font-bold ${getStatusColor(result.success)}`}>
                    {getStatusIcon(result.success)} {result.success ? 'PASS' : 'FAIL'}
                  </span>
                </div>
                
                <p className={`text-sm ${getStatusColor(result.success)} mb-2`}>
                  {result.message}
                </p>

                {result.success && result.data && (
                  <details className="mt-2">
                    <summary className="cursor-pointer text-sm text-gray-600 hover:text-gray-800">
                      View Response Data
                    </summary>
                    <pre className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-auto">
                      {JSON.stringify(result.data, null, 2)}
                    </pre>
                  </details>
                )}

                {!result.success && result.error && (
                  <div className="mt-2 p-2 bg-red-50 rounded">
                    <p className="text-sm text-red-700">Error: {result.error}</p>
                  </div>
                )}

                {result.count !== undefined && (
                  <p className="text-sm text-gray-600">Items returned: {result.count}</p>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="font-medium text-gray-900 mb-2">Test Summary</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-green-600">✅ Passed: </span>
              {Object.values(testResults).filter(r => r.success).length}
            </div>
            <div>
              <span className="text-red-600">❌ Failed: </span>
              {Object.values(testResults).filter(r => !r.success).length}
            </div>
          </div>
          
          {Object.values(testResults).every(r => r.success) && (
            <div className="mt-3 p-3 bg-green-50 rounded border border-green-200">
              <p className="text-green-800 font-medium">🎉 All tests passed! Dashboard is working correctly.</p>
            </div>
          )}
        </div>

        <div className="mt-6 text-sm text-gray-500">
          <p>This test verifies that all dashboard APIs are working correctly for your role.</p>
          <p>If any tests fail, check the browser console and network tab for more details.</p>
        </div>
      </div>
    </div>
  );
}