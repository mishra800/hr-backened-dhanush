import { useState, useEffect } from 'react';
import api from '../../api/axios';
import InfrastructureSetupModal from './InfrastructureSetupModal';

export default function InfrastructureSetupDashboard() {
  const [pendingRequests, setPendingRequests] = useState([]);
  const [myAssignments, setMyAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showSetupModal, setShowSetupModal] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [pendingRes, assignmentsRes] = await Promise.all([
        api.get('/infrastructure/requests/pending'),
        api.get('/infrastructure/requests/my-assignments')
      ]);
      
      setPendingRequests(pendingRes.data);
      setMyAssignments(assignmentsRes.data);
    } catch (error) {
      console.error('Error fetching infrastructure data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAssignRequest = async (requestId) => {
    try {
      await api.post(`/infrastructure/requests/${requestId}/assign`);
      fetchData();
    } catch (error) {
      console.error('Error assigning request:', error);
    }
  };

  const handleStartSetup = (request) => {
    setSelectedRequest(request);
    setShowSetupModal(true);
  };

  const handleSetupComplete = () => {
    setShowSetupModal(false);
    setSelectedRequest(null);
    fetchData();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2">Loading...</span>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Infrastructure Setup Dashboard</h1>
        <p className="text-gray-600 mt-2">Manage new employee infrastructure setup requests</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <span className="text-2xl">⏳</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Pending Requests</p>
              <p className="text-2xl font-bold text-gray-900">
                {pendingRequests.filter(r => r.status === 'pending').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <span className="text-2xl">🔧</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">My Assignments</p>
              <p className="text-2xl font-bold text-gray-900">{myAssignments.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <span className="text-2xl">✅</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">In Progress</p>
              <p className="text-2xl font-bold text-gray-900">
                {myAssignments.filter(r => r.status === 'in_progress').length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Pending Requests */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Pending Infrastructure Requests</h2>
        {pendingRequests.filter(r => r.status === 'pending').length > 0 ? (
          <div className="space-y-4">
            {pendingRequests.filter(r => r.status === 'pending').map((request) => (
              <div key={request.id} className="bg-white rounded-lg shadow-md p-6 border">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {request.ticket_number} - {request.employee_name}
                    </h3>
                    <p className="text-sm text-gray-600">
                      Created: {new Date(request.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                      request.priority === 'urgent' ? 'bg-red-100 text-red-800' :
                      request.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {request.priority.toUpperCase()}
                    </span>
                  </div>
                </div>

                <div className="mb-4">
                  <p className="text-sm text-gray-600 mb-2">Required Setup:</p>
                  <div className="flex flex-wrap gap-2">
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">💻 Laptop</span>
                    <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs">📧 Email</span>
                    <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded text-xs">📶 WiFi</span>
                    <span className="px-2 py-1 bg-orange-100 text-orange-800 rounded text-xs">🆔 ID Card</span>
                    <span className="px-2 py-1 bg-pink-100 text-pink-800 rounded text-xs">👆 Biometric</span>
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    onClick={() => handleAssignRequest(request.id)}
                    className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                  >
                    Assign to Me
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 bg-white rounded-lg shadow">
            <div className="text-gray-400 text-4xl mb-2">📋</div>
            <p className="text-gray-600">No pending infrastructure requests</p>
          </div>
        )}
      </div>

      {/* My Assignments */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">My Assignments</h2>
        {myAssignments.length > 0 ? (
          <div className="space-y-4">
            {myAssignments.map((request) => (
              <div key={request.id} className="bg-white rounded-lg shadow-md p-6 border">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {request.ticket_number} - {request.employee_name}
                    </h3>
                    <p className="text-sm text-gray-600">
                      Assigned: {new Date(request.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                      request.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                      request.status === 'assigned' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {request.status.replace('_', ' ').toUpperCase()}
                    </span>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mb-4">
                  <div className="flex justify-between text-sm text-gray-600 mb-1">
                    <span>Progress</span>
                    <span>{request.progress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${request.progress}%` }}
                    ></div>
                  </div>
                </div>

                <div className="flex justify-end space-x-2">
                  {request.status === 'assigned' && (
                    <button
                      onClick={() => handleStartSetup(request)}
                      className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
                    >
                      Start Setup
                    </button>
                  )}
                  {request.status === 'in_progress' && (
                    <button
                      onClick={() => handleStartSetup(request)}
                      className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                    >
                      Continue Setup
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 bg-white rounded-lg shadow">
            <div className="text-gray-400 text-4xl mb-2">🔧</div>
            <p className="text-gray-600">No assignments yet</p>
          </div>
        )}
      </div>

      {/* Setup Modal */}
      {showSetupModal && selectedRequest && (
        <InfrastructureSetupModal
          request={selectedRequest}
          onClose={() => setShowSetupModal(false)}
          onComplete={handleSetupComplete}
        />
      )}
    </div>
  );
}