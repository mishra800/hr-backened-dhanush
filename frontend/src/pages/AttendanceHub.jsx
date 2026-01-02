import { useState } from 'react';
import { useRoleCheck } from '../components/RoleGuard';
import RoleGuard from '../components/RoleGuard';
import SimpleAttendance from '../components/attendance/SimpleAttendance';
import CheckoutFlow from '../components/attendance/CheckoutFlow';
import AttendanceReports from '../components/attendance/AttendanceReports';
import WFHRequestManager from '../components/wfh/WFHRequestManager';

function AttendanceHubContent() {
  const { isEmployee, isManager, isHR, isAdmin } = useRoleCheck();
  const [activeTab, setActiveTab] = useState('attendance');

  const tabs = [
    { id: 'attendance', label: '📅 Mark Attendance', roles: ['admin', 'hr', 'manager', 'employee'] },
    { id: 'checkout', label: '📤 Check-out', roles: ['admin', 'hr', 'manager', 'employee'] },
    { id: 'wfh', label: '🏠 WFH Requests', roles: ['admin', 'hr', 'manager', 'employee'] },
    { id: 'reports', label: '📊 Reports', roles: ['admin', 'hr', 'manager', 'employee'] }
  ];

  const userRole = isAdmin() ? 'admin' : isHR() ? 'hr' : isManager() ? 'manager' : 'employee';
  const availableTabs = tabs.filter(tab => tab.roles.includes(userRole));

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                🏢 Attendance Management Hub
              </h1>
              <p className="text-sm text-gray-600">
                Comprehensive attendance system with security and analytics
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-500">
                {new Date().toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </div>
              <div className="text-lg font-semibold text-blue-600">
                {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8">
            {availableTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'attendance' && (
          <div className="space-y-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-blue-800">
                    Simple Attendance System
                  </h3>
                  <div className="mt-2 text-sm text-blue-700">
                    <p>
                      Easy attendance marking with face recognition. Just upload your profile photo and mark attendance with camera.
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <SimpleAttendance />
          </div>
        )}

        {activeTab === 'checkout' && (
          <div className="space-y-6">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.293l-3-3a1 1 0 00-1.414 1.414L10.586 9H7a1 1 0 100 2h3.586l-1.293 1.293a1 1 0 101.414 1.414l3-3a1 1 0 000-1.414z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">
                    Simple Check-out
                  </h3>
                  <div className="mt-2 text-sm text-red-700">
                    <p>
                      Easy check-out system with working hours tracking.
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <CheckoutFlow />
          </div>
        )}

        {activeTab === 'wfh' && (
          <div className="space-y-6">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-green-800">
                    Work From Home Management
                  </h3>
                  <div className="mt-2 text-sm text-green-700">
                    <p>
                      Submit WFH requests, track approval status, and manage remote work 
                      with integrated attendance system.
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <WFHRequestManager />
          </div>
        )}



        {activeTab === 'reports' && (
          <div className="space-y-6">
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-purple-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-purple-800">
                    Reports & Analytics
                  </h3>
                  <div className="mt-2 text-sm text-purple-700">
                    <p>
                      Comprehensive attendance reports, analytics, and insights with 
                      export capabilities for personal and team data.
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <AttendanceReports />
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="bg-white border-t mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-500">
              © 2024 AI HR Management System. All rights reserved.
            </div>
            <div className="flex items-center space-x-6 text-sm text-gray-500">
              <span>🔒 Secure Biometric Storage</span>
              <span>📍 GPS Validation</span>
              <span>🛡️ Fraud Prevention</span>
              <span>📱 Mobile Ready</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function AttendanceHub() {
  return (
    <RoleGuard 
      allowedRoles={['admin', 'hr', 'manager', 'employee']} 
      showError={true}
    >
      <AttendanceHubContent />
    </RoleGuard>
  );
}