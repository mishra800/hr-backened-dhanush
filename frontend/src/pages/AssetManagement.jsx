import { useAuth } from '../context/authcontext';
import AssetDashboard from '../components/assets/AssetDashboard';
import AssetsTeamDashboard from '../components/assets/AssetsTeamDashboard';
import AcknowledgmentAdminDashboard from '../components/assets/AcknowledgmentAdminDashboard';
import RoleGuard from '../components/RoleGuard';
import { useState } from 'react';

export default function AssetManagement() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('assets');

  // Show different dashboards based on user role
  if (user?.role === 'assets_team' || user?.role === 'admin') {
    return (
      <RoleGuard allowedRoles={['assets_team', 'admin']}>
        <div className="min-h-screen bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Tab Navigation */}
            <div className="mb-8">
              <div className="border-b border-gray-200">
                <nav className="-mb-px flex space-x-8">
                  <button
                    onClick={() => setActiveTab('assets')}
                    className={`py-2 px-1 border-b-2 font-medium text-sm ${
                      activeTab === 'assets'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    Asset Management
                  </button>
                  <button
                    onClick={() => setActiveTab('acknowledgments')}
                    className={`py-2 px-1 border-b-2 font-medium text-sm ${
                      activeTab === 'acknowledgments'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    Asset Acknowledgments
                  </button>
                </nav>
              </div>
            </div>

            {/* Tab Content */}
            {activeTab === 'assets' && <AssetsTeamDashboard />}
            {activeTab === 'acknowledgments' && <AcknowledgmentAdminDashboard />}
          </div>
        </div>
      </RoleGuard>
    );
  }

  // Default employee asset dashboard
  return <AssetDashboard />;
}