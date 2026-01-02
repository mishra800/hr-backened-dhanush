import { useState, useEffect } from 'react';
import api from '../../api/axios';

export default function MobileAttendanceDemo() {
  const [mobileData, setMobileData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMobileData();
  }, []);

  const fetchMobileData = async () => {
    try {
      setLoading(true);
      
      // Simulate mobile API calls
      const [statusRes, configRes, summaryRes] = await Promise.all([
        api.get('/mobile/attendance/status'),
        api.get('/mobile/attendance/config'),
        api.get('/mobile/attendance/summary')
      ]);
      
      setMobileData({
        status: statusRes.data,
        config: configRes.data,
        summary: summaryRes.data
      });
    } catch (error) {
      console.error('Error fetching mobile data:', error);
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

  if (!mobileData) {
    return (
      <div className="text-center py-12">
        <div className="text-4xl mb-4">📱</div>
        <p className="text-gray-600">Mobile API data not available</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Mobile API Status */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
          📱 Mobile API Integration
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Employee Status */}
          <div className="bg-blue-50 rounded-lg p-4">
            <h3 className="font-semibold text-blue-900 mb-3">Employee Status</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-blue-700">Name:</span>
                <span className="font-medium">{mobileData.status.employee.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-blue-700">Department:</span>
                <span className="font-medium">{mobileData.status.employee.department || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-blue-700">Attendance Today:</span>
                <span className={`font-medium ${mobileData.status.attendance_today.marked ? 'text-green-600' : 'text-orange-600'}`}>
                  {mobileData.status.attendance_today.marked ? 'Marked' : 'Not Marked'}
                </span>
              </div>
            </div>
          </div>

          {/* Security Features */}
          <div className="bg-green-50 rounded-lg p-4">
            <h3 className="font-semibold text-green-900 mb-3">Security Features</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-green-700">Biometric Setup:</span>
                <span className={`font-medium ${mobileData.status.security.has_biometric ? 'text-green-600' : 'text-red-600'}`}>
                  {mobileData.status.security.has_biometric ? 'Complete' : 'Required'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-green-700">Face Recognition:</span>
                <span className="font-medium text-green-600">Enabled</span>
              </div>
              <div className="flex justify-between">
                <span className="text-green-700">GPS Validation:</span>
                <span className="font-medium text-green-600">Active</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Configuration */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">📋 Mobile App Configuration</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* App Features */}
          <div>
            <h4 className="font-medium text-gray-900 mb-3">Features</h4>
            <div className="space-y-2">
              {Object.entries(mobileData.config.features).map(([feature, enabled]) => (
                <div key={feature} className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 capitalize">
                    {feature.replace('_', ' ')}
                  </span>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    enabled ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {enabled ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Settings */}
          <div>
            <h4 className="font-medium text-gray-900 mb-3">Settings</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Check-in Window:</span>
                <span className="font-medium">
                  {mobileData.config.settings.check_in_window.start} - {mobileData.config.settings.check_in_window.end}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">GPS Accuracy:</span>
                <span className="font-medium">±{mobileData.config.settings.gps_accuracy_threshold}m</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Face Threshold:</span>
                <span className="font-medium">{mobileData.config.settings.face_confidence_threshold}%</span>
              </div>
            </div>
          </div>

          {/* Office Location */}
          <div>
            <h4 className="font-medium text-gray-900 mb-3">Office Location</h4>
            <div className="space-y-2 text-sm">
              <div>
                <span className="text-gray-600">Name:</span>
                <div className="font-medium">{mobileData.config.office_location.name}</div>
              </div>
              <div>
                <span className="text-gray-600">Address:</span>
                <div className="font-medium">{mobileData.config.office_location.address}</div>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Radius:</span>
                <span className="font-medium">{mobileData.config.office_location.radius}m</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Monthly Summary */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">📊 Monthly Summary (Mobile View)</h3>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-900">
              {mobileData.summary.this_month.total_days}
            </div>
            <div className="text-sm text-blue-600">Total Days</div>
          </div>
          
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-900">
              {mobileData.summary.this_month.present_days}
            </div>
            <div className="text-sm text-green-600">Present</div>
          </div>
          
          <div className="text-center p-4 bg-orange-50 rounded-lg">
            <div className="text-2xl font-bold text-orange-900">
              {mobileData.summary.this_month.late_days}
            </div>
            <div className="text-sm text-orange-600">Late</div>
          </div>
          
          <div className="text-center p-4 bg-purple-50 rounded-lg">
            <div className="text-2xl font-bold text-purple-900">
              {mobileData.summary.this_month.wfh_days}
            </div>
            <div className="text-sm text-purple-600">WFH</div>
          </div>
        </div>

        {/* Attendance Rate */}
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Attendance Rate</span>
            <span className="text-sm font-bold text-gray-900">
              {mobileData.summary.this_month.attendance_rate}%
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-green-600 h-2 rounded-full" 
              style={{ width: `${mobileData.summary.this_month.attendance_rate}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Mobile API Endpoints */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">🔗 Available Mobile Endpoints</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <h4 className="font-medium text-gray-900">Core Endpoints</h4>
            <div className="space-y-1 text-sm">
              <div className="flex items-center">
                <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs mr-2">GET</span>
                <code className="text-gray-600">/mobile/attendance/status</code>
              </div>
              <div className="flex items-center">
                <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs mr-2">POST</span>
                <code className="text-gray-600">/mobile/attendance/quick-checkin</code>
              </div>
              <div className="flex items-center">
                <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs mr-2">POST</span>
                <code className="text-gray-600">/mobile/attendance/checkout</code>
              </div>
              <div className="flex items-center">
                <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs mr-2">GET</span>
                <code className="text-gray-600">/mobile/attendance/history</code>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="font-medium text-gray-900">Additional Endpoints</h4>
            <div className="space-y-1 text-sm">
              <div className="flex items-center">
                <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs mr-2">GET</span>
                <code className="text-gray-600">/mobile/attendance/summary</code>
              </div>
              <div className="flex items-center">
                <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs mr-2">POST</span>
                <code className="text-gray-600">/mobile/attendance/wfh-request</code>
              </div>
              <div className="flex items-center">
                <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs mr-2">GET</span>
                <code className="text-gray-600">/mobile/attendance/config</code>
              </div>
              <div className="flex items-center">
                <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs mr-2">GET</span>
                <code className="text-gray-600">/mobile/attendance/health</code>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}