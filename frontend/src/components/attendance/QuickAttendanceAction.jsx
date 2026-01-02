import { useState } from 'react';
import api from '../../api/axios';

export default function QuickAttendanceAction() {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const quickMarkAttendance = async () => {
    setLoading(true);
    try {
      // Get location
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        });
      });

      // Quick attendance without face recognition (for admin/testing)
      const response = await api.post('/attendance/mark-attendance', {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        photo_base64: null // Skip photo for quick marking
      });

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (error) {
      alert('Failed to mark attendance: ' + (error.response?.data?.detail || error.message));
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
        <div className="text-green-600 text-2xl mb-2">✅</div>
        <p className="text-green-800 font-medium">Attendance marked successfully!</p>
      </div>
    );
  }

  return (
    <button
      onClick={quickMarkAttendance}
      disabled={loading}
      className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
    >
      {loading ? (
        <>
          <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          Marking...
        </>
      ) : (
        <>
          📅 Quick Mark Attendance
        </>
      )}
    </button>
  );
}