import { useState, useRef, useEffect } from 'react';
import api from '../../api/axios';

export default function SimpleAttendance() {
  const [step, setStep] = useState(1); // 1: Check, 2: Camera, 3: Success
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [hasProfileImage, setHasProfileImage] = useState(false);
  const [todayAttendance, setTodayAttendance] = useState(null);
  
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  useEffect(() => {
    checkStatus();
  }, []);

  const checkStatus = async () => {
    try {
      // Check if already marked today
      const attendanceRes = await api.get('/attendance/my-attendance');
      const today = new Date().toDateString();
      const todayRecord = attendanceRes.data.find(a => 
        new Date(a.date).toDateString() === today
      );
      
      if (todayRecord) {
        setTodayAttendance(todayRecord);
        setStep(3);
        return;
      }

      // Check if has profile image
      const profileRes = await api.get('/attendance/check-profile-image');
      setHasProfileImage(profileRes.data.has_profile_image);
      
    } catch (err) {
      setError('Failed to check status: ' + (err.response?.data?.detail || err.message));
    }
  };

  const startCamera = async () => {
    try {
      setCameraReady(false);
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user', width: 640, height: 480 } 
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        
        await new Promise((resolve) => {
          videoRef.current.onloadedmetadata = () => {
            videoRef.current.play();
            setCameraReady(true);
            resolve();
          };
        });
        
        setCameraActive(true);
        setStep(2);
      }
    } catch (err) {
      setError('Camera access denied. Please allow camera access in your browser.');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
    setCameraReady(false);
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current || !cameraReady) {
      setError('Camera not ready. Please wait.');
      return null;
    }
    
    const canvas = canvasRef.current;
    const video = videoRef.current;
    
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    return canvas.toDataURL('image/jpeg', 0.8);
  };

  const markAttendance = async () => {
    setLoading(true);
    setError('');

    try {
      // Get location
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        });
      });

      // Capture photo
      const photoData = capturePhoto();
      if (!photoData) {
        throw new Error('Failed to capture photo');
      }

      // Submit attendance
      const response = await api.post('/attendance/mark-with-face-recognition', {
        attendance_image: photoData,
        location: `${position.coords.latitude}, ${position.coords.longitude}`
      });

      if (response.data.success && response.data.match) {
        setStep(3);
        stopCamera();
        setTodayAttendance(response.data.attendance);
      } else {
        setError(response.data.message || 'Face recognition failed. Please try again.');
      }
    } catch (err) {
      setError('Failed to mark attendance: ' + (err.response?.data?.detail || err.message));
    } finally {
      setLoading(false);
    }
  };

  // Step 1: Initial Check
  if (step === 1) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4">
        <div className="max-w-md mx-auto">
          <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
            <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="text-3xl">📅</span>
            </div>
            
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Mark Attendance</h2>
            <p className="text-gray-600 mb-6">
              Simple face recognition attendance system
            </p>

            {!hasProfileImage && (
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6">
                <p className="text-orange-800 text-sm">
                  ⚠️ Please upload your profile photo first in "My Profile" section
                </p>
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                <p className="text-red-800 text-sm">{error}</p>
              </div>
            )}

            <button
              onClick={startCamera}
              disabled={!hasProfileImage}
              className="w-full bg-blue-600 text-white py-4 rounded-lg font-bold text-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {hasProfileImage ? '📸 Start Camera' : 'Upload Profile Photo First'}
            </button>

            {!hasProfileImage && (
              <button
                onClick={() => window.location.href = '/dashboard/profile'}
                className="w-full mt-3 bg-purple-600 text-white py-3 rounded-lg font-semibold hover:bg-purple-700 transition"
              >
                Go to My Profile
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Step 2: Camera & Face Recognition
  if (step === 2) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 py-12 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
              📸 Face Recognition
            </h2>

            <div className="relative bg-black rounded-lg overflow-hidden mb-6">
              <video 
                ref={videoRef} 
                autoPlay 
                playsInline
                muted
                className="w-full h-80 object-cover"
              />
              <div className="absolute inset-0 border-4 border-green-400 opacity-30 rounded-full w-64 h-64 m-auto pointer-events-none"></div>
              <div className="absolute bottom-4 left-0 right-0 text-center">
                <span className="bg-black bg-opacity-50 text-white px-4 py-2 rounded-full text-sm">
                  {cameraReady ? '✅ Position your face in the circle' : '⏳ Starting camera...'}
                </span>
              </div>
              {cameraReady && (
                <div className="absolute top-4 right-4">
                  <span className="bg-green-500 text-white px-3 py-1 rounded-full text-xs font-semibold flex items-center">
                    <span className="w-2 h-2 bg-white rounded-full mr-2 animate-pulse"></span>
                    LIVE
                  </span>
                </div>
              )}
            </div>
            <canvas ref={canvasRef} className="hidden" />

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                <p className="text-red-800 text-sm">{error}</p>
              </div>
            )}

            <div className="flex space-x-4">
              <button
                onClick={markAttendance}
                disabled={!cameraReady || loading}
                className="flex-1 bg-green-600 text-white py-4 rounded-lg font-bold text-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin h-5 w-5 mr-3" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Recognizing...
                  </span>
                ) : (
                  '✅ Mark Attendance'
                )}
              </button>
              
              <button
                onClick={() => {
                  stopCamera();
                  setStep(1);
                }}
                className="bg-gray-600 text-white py-4 px-6 rounded-lg font-semibold hover:bg-gray-700 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Step 3: Success
  if (step === 3) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 py-12 px-4">
        <div className="max-w-md mx-auto">
          <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
            <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 animate-bounce">
              <svg className="w-12 h-12 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Attendance Marked!</h2>
            <p className="text-gray-600 mb-6">Your attendance has been successfully recorded</p>

            {todayAttendance && (
              <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left">
                <div className="flex justify-between mb-2">
                  <span className="text-gray-600">Time:</span>
                  <span className="font-semibold">
                    {new Date(todayAttendance.check_in || todayAttendance.date).toLocaleTimeString()}
                  </span>
                </div>
                <div className="flex justify-between mb-2">
                  <span className="text-gray-600">Status:</span>
                  <span className={`font-semibold ${
                    todayAttendance.status === 'present' ? 'text-green-600' : 'text-orange-600'
                  }`}>
                    {todayAttendance.status?.toUpperCase()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Mode:</span>
                  <span className="font-semibold">
                    {todayAttendance.work_mode?.toUpperCase() || 'OFFICE'}
                  </span>
                </div>
              </div>
            )}

            <button
              onClick={() => window.location.href = '/dashboard'}
              className="w-full bg-gray-800 text-white py-3 rounded-lg font-semibold hover:bg-gray-900 transition"
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }
}