import { useState, useEffect } from 'react';
import api from '../../api/axios';

export default function CheckoutFlow() {
  const [currentAttendance, setCurrentAttendance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [checkingOut, setCheckingOut] = useState(false);
  const [autoCheckoutEnabled, setAutoCheckoutEnabled] = useState(false);
  const [workingHours, setWorkingHours] = useState(null);

  useEffect(() => {
    checkCurrentAttendance();
    checkAutoCheckoutSettings();
  }, []);

  const checkCurrentAttendance = async () => {
    try {
      setLoading(true);
      const res = await api.get('/attendance/my-attendance');
      const today = new Date().toDateString();
      const todayRecord = res.data.find(a => 
        new Date(a.date).toDateString() === today && !a.check_out
      );
      setCurrentAttendance(todayRecord);
      
      if (todayRecord) {
        calculateWorkingHours(todayRecord);
      }
    } catch (error) {
      console.error('Error checking attendance:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkAutoCheckoutSettings = async () => {
    try {
      const res = await api.get('/attendance/auto-checkout-settings');
      setAutoCheckoutEnabled(res.data.enabled);
    } catch (error) {
      console.error('Error checking auto-checkout settings:', error);
    }
  };

  const calculateWorkingHours = (attendance) => {
    const checkIn = new Date(attendance.check_in);
    const now = new Date();
    const diffMs = now - checkIn;
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    setWorkingHours({ hours, minutes, total: diffMs });
  };

  const handleManualCheckout = async () => {
    try {
      setCheckingOut(true);
      await api.post('/attendance/checkout');
      alert('✅ Check-out successful!');
      checkCurrentAttendance();
    } catch (error) {
      alert('❌ Check-out failed: ' + (error.response?.data?.detail || error.message));
    } finally {
      setCheckingOut(false);
    }
  };

  const handleAutoCheckoutToggle = async () => {
    try {
      await api.put('/attendance/auto-checkout-settings', {
        enabled: !autoCheckoutEnabled
      });
      setAutoCheckoutEnabled(!autoCheckoutEnabled);
      alert(`Auto-checkout ${!autoCheckoutEnabled ? 'enabled' : 'disabled'}`);
    } catch (error) {
      alert('Failed to update auto-checkout settings');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!currentAttendance) {
    return (
      <div className="bg-white rounded-lg shadow p-6 text-center">
        <div className="text-4xl mb-4">📤</div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">No Active Check-in</h2>
        <p className="text-gray-600">You haven't checked in today or have already checked out.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Current Session Info */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
          ⏰ Current Work Session
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="text-sm text-blue-600 font-medium">Check-in Time</div>
            <div className="text-lg font-bold text-blue-900">
              {new Date(currentAttendance.check_in).toLocaleTimeString()}
            </div>
          </div>
          
          <div className="bg-green-50 rounded-lg p-4">
            <div className="text-sm text-green-600 font-medium">Working Hours</div>
            <div className="text-lg font-bold text-green-900">
              {workingHours ? `${workingHours.hours}h ${workingHours.minutes}m` : 'Calculating...'}
            </div>
          </div>
          
          <div className="bg-purple-50 rounded-lg p-4">
            <div className="text-sm text-purple-600 font-medium">Work Mode</div>
            <div className="text-lg font-bold text-purple-900">
              {currentAttendance.work_mode?.toUpperCase() || 'OFFICE'}
            </div>
          </div>
        </div>

        {/* Status Indicators */}
        <div className="flex items-center space-x-4 mb-6">
          <div className={`flex items-center px-3 py-1 rounded-full text-sm font-medium ${
            currentAttendance.status === 'present' 
              ? 'bg-green-100 text-green-800' 
              : 'bg-orange-100 text-orange-800'
          }`}>
            <span className="w-2 h-2 rounded-full mr-2 animate-pulse bg-current"></span>
            {currentAttendance.status.toUpperCase()}
          </div>
          
          {currentAttendance.requires_approval && (
            <div className="flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
              ⚠️ Pending Approval
            </div>
          )}
          
          {currentAttendance.face_match_confidence && (
            <div className="flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
              🔍 Face: {currentAttendance.face_match_confidence}%
            </div>
          )}
        </div>

        {/* Manual Checkout */}
        <div className="border-t pt-6">
          <h3 className="text-lg font-semibold mb-4">📤 Check-out Options</h3>
          
          <div className="space-y-4">
            {/* Manual Checkout Button */}
            <button
              onClick={handleManualCheckout}
              disabled={checkingOut}
              className="w-full md:w-auto px-6 py-3 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {checkingOut ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin h-4 w-4 mr-2" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Checking out...
                </span>
              ) : (
                '📤 Check Out Now'
              )}
            </button>

            {/* Auto Checkout Toggle */}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <div className="font-medium text-gray-900">🤖 Auto Check-out</div>
                <div className="text-sm text-gray-600">
                  Automatically check out at 6:00 PM if you forget
                </div>
              </div>
              <button
                onClick={handleAutoCheckoutToggle}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  autoCheckoutEnabled ? 'bg-blue-600' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    autoCheckoutEnabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Working Hours Summary */}
      <WorkingHoursSummary attendance={currentAttendance} />
      
      {/* Missing Checkout Alerts */}
      <MissingCheckoutAlerts />
    </div>
  );
}

// Working Hours Summary Component
function WorkingHoursSummary({ attendance }) {
  const [weeklyHours, setWeeklyHours] = useState(null);

  useEffect(() => {
    fetchWeeklyHours();
  }, []);

  const fetchWeeklyHours = async () => {
    try {
      const res = await api.get('/attendance/weekly-hours');
      setWeeklyHours(res.data);
    } catch (error) {
      console.error('Error fetching weekly hours:', error);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold mb-4">📊 Working Hours Summary</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="text-center p-4 bg-blue-50 rounded-lg">
          <div className="text-2xl font-bold text-blue-900">
            {weeklyHours ? `${weeklyHours.thisWeek}h` : '--'}
          </div>
          <div className="text-sm text-blue-600">This Week</div>
        </div>
        
        <div className="text-center p-4 bg-green-50 rounded-lg">
          <div className="text-2xl font-bold text-green-900">
            {weeklyHours ? `${weeklyHours.thisMonth}h` : '--'}
          </div>
          <div className="text-sm text-green-600">This Month</div>
        </div>
        
        <div className="text-center p-4 bg-purple-50 rounded-lg">
          <div className="text-2xl font-bold text-purple-900">
            {weeklyHours ? `${weeklyHours.average}h` : '--'}
          </div>
          <div className="text-sm text-purple-600">Daily Average</div>
        </div>
      </div>
    </div>
  );
}

// Missing Checkout Alerts Component
function MissingCheckoutAlerts() {
  const [missingCheckouts, setMissingCheckouts] = useState([]);

  useEffect(() => {
    fetchMissingCheckouts();
  }, []);

  const fetchMissingCheckouts = async () => {
    try {
      const res = await api.get('/attendance/missing-checkouts');
      setMissingCheckouts(res.data);
    } catch (error) {
      console.error('Error fetching missing checkouts:', error);
    }
  };

  const handleReportMissing = async (attendanceId, reason) => {
    try {
      await api.post(`/attendance/${attendanceId}/report-missing-checkout`, {
        reason
      });
      alert('✅ Missing checkout reported successfully');
      fetchMissingCheckouts();
    } catch (error) {
      alert('❌ Failed to report missing checkout');
    }
  };

  if (missingCheckouts.length === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold mb-4 text-orange-600">
        ⚠️ Missing Check-outs ({missingCheckouts.length})
      </h3>
      
      <div className="space-y-3">
        {missingCheckouts.map((attendance) => (
          <div key={attendance.id} className="flex items-center justify-between p-3 bg-orange-50 rounded-lg border border-orange-200">
            <div>
              <div className="font-medium text-gray-900">
                {new Date(attendance.date).toLocaleDateString()}
              </div>
              <div className="text-sm text-gray-600">
                Check-in: {new Date(attendance.check_in).toLocaleTimeString()}
              </div>
            </div>
            <button
              onClick={() => {
                const reason = prompt('Please provide a reason for missing checkout:');
                if (reason) {
                  handleReportMissing(attendance.id, reason);
                }
              }}
              className="px-3 py-1 bg-orange-600 text-white rounded text-sm hover:bg-orange-700"
            >
              Report Missing
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}