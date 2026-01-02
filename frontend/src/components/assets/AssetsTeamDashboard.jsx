import { useState, useEffect } from 'react';
import api from '../../api/axios';
import AssetFulfillmentModal from './AssetFulfillmentModal';
import InfrastructureSetupDashboard from '../infrastructure/InfrastructureSetupDashboard';

export default function AssetsTeamDashboard() {
  const [activeTab, setActiveTab] = useState('infrastructure');
  const [requests, setRequests] = useState([]);
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showFulfillmentModal, setShowFulfillmentModal] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [requestsRes, complaintsRes] = await Promise.all([
        api.get('/assets/requests/assets-team'),
        api.get('/assets/complaints/assets-team')
      ]);
      
      setRequests(requestsRes.data);
      setComplaints(complaintsRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAssignRequest = async (requestId) => {
    try {
      await api.post(`/assets/requests/${requestId}/assign-team`);
      fetchData();
    } catch (error) {
      console.error('Error assigning request:', error);
    }
  };

  const handleAssignComplaint = async (complaintId) => {
    try {
      await api.post(`/assets/complaints/${complaintId}/assign`);
      fetchData();
    } catch (error) {
      console.error('Error assigning complaint:', error);
    }
  };

  const handleResolveComplaint = async (complaintId, resolutionData) => {
    try {
      await api.post(`/assets/complaints/${complaintId}/resolve`, resolutionData);
      fetchData();
    } catch (error) {
      console.error('Error resolving complaint:', error);
    }
  };

  const handleFulfillRequest = (request) => {
    setSelectedRequest(request);
    setShowFulfillmentModal(true);
  };

  const handleFulfillmentComplete = () => {
    setShowFulfillmentModal(false);
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
        <h1 className="text-3xl font-bold text-gray-900">Assets Team Dashboard</h1>
        <p className="text-gray-600 mt-2">Manage asset requests and resolve complaints</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <span className="text-2xl">📋</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Pending Requests</p>
              <p className="text-2xl font-bold text-gray-900">
                {requests.filter(r => r.status === 'hr_approved').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <span className="text-2xl">⚠️</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Open Complaints</p>
              <p className="text-2xl font-bold text-gray-900">
                {complaints.filter(c => c.status === 'open').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <span className="text-2xl">🔧</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">In Progress</p>
              <p className="text-2xl font-bold text-gray-900">
                {complaints.filter(c => c.status === 'in_progress').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <span className="text-2xl">✅</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Completed Today</p>
              <p className="text-2xl font-bold text-gray-900">
                {requests.filter(r => r.status === 'completed').length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'infrastructure', name: 'Infrastructure Setup', icon: '🏗️' },
            { id: 'requests', name: 'Asset Requests', icon: '📋' },
            { id: 'complaints', name: 'Complaints', icon: '🎫' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.name}
            </button>
          ))}
        </nav>
      </div>

      {/* Infrastructure Setup Tab */}
      {activeTab === 'infrastructure' && (
        <InfrastructureSetupDashboard />
      )}

      {/* Asset Requests Tab */}
      {activeTab === 'requests' && (
        <div className="space-y-4">
          {requests.length > 0 ? (
            requests.map((request) => (
              <div key={request.id} className="bg-white rounded-lg shadow-md p-6 border">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      Request #{request.id} - {request.employee_name}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {request.request_type.replace('_', ' ').toUpperCase()} | 
                      Created: {new Date(request.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                      request.status === 'completed' ? 'bg-green-100 text-green-800' :
                      request.status === 'assigned_to_assets' ? 'bg-blue-100 text-blue-800' :
                      request.status === 'hr_approved' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {request.status.replace('_', ' ').toUpperCase()}
                    </span>
                    <span className={`px-2 py-1 rounded text-xs ${
                      request.priority === 'urgent' ? 'bg-red-100 text-red-800' :
                      request.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {request.priority.toUpperCase()}
                    </span>
                  </div>
                </div>

                <div className="space-y-2 mb-4">
                  <p><strong>Requested Assets:</strong> {request.requested_assets.join(', ')}</p>
                  {request.reason && <p><strong>Reason:</strong> {request.reason}</p>}
                  {request.business_justification && (
                    <p><strong>Business Justification:</strong> {request.business_justification}</p>
                  )}
                </div>

                <div className="flex justify-end space-x-2">
                  {request.status === 'hr_approved' && (
                    <button
                      onClick={() => handleAssignRequest(request.id)}
                      className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                    >
                      Assign to Me
                    </button>
                  )}
                  {request.status === 'assigned_to_assets' && (
                    <button
                      onClick={() => handleFulfillRequest(request)}
                      className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
                    >
                      Fulfill Request
                    </button>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-12">
              <div className="text-gray-400 text-6xl mb-4">📋</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Requests</h3>
              <p className="text-gray-600">No asset requests to process at the moment.</p>
            </div>
          )}
        </div>
      )}

      {/* Complaints Tab */}
      {activeTab === 'complaints' && (
        <div className="space-y-4">
          {complaints.length > 0 ? (
            complaints.map((complaint) => (
              <ComplaintCard
                key={complaint.id}
                complaint={complaint}
                onAssign={() => handleAssignComplaint(complaint.id)}
                onResolve={(resolutionData) => handleResolveComplaint(complaint.id, resolutionData)}
              />
            ))
          ) : (
            <div className="text-center py-12">
              <div className="text-gray-400 text-6xl mb-4">🎫</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Complaints</h3>
              <p className="text-gray-600">No complaints to resolve at the moment.</p>
            </div>
          )}
        </div>
      )}

      {/* Fulfillment Modal */}
      {showFulfillmentModal && selectedRequest && (
        <AssetFulfillmentModal
          request={selectedRequest}
          onClose={() => setShowFulfillmentModal(false)}
          onComplete={handleFulfillmentComplete}
        />
      )}
    </div>
  );
}

// Complaint Card Component
function ComplaintCard({ complaint, onAssign, onResolve }) {
  const [showResolutionForm, setShowResolutionForm] = useState(false);
  const [resolutionData, setResolutionData] = useState({
    resolution_notes: '',
    resolution_action: 'repaired'
  });

  const resolutionActions = [
    { value: 'repaired', label: 'Repaired' },
    { value: 'replaced', label: 'Replaced' },
    { value: 'software_fix', label: 'Software Fix' },
    { value: 'user_training', label: 'User Training' },
    { value: 'no_action_needed', label: 'No Action Needed' }
  ];

  const handleResolve = () => {
    if (resolutionData.resolution_notes.trim()) {
      onResolve(resolutionData);
      setShowResolutionForm(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 border">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{complaint.title}</h3>
          <p className="text-sm text-gray-600">
            {complaint.ticket_number} | {complaint.employee_name} | 
            Created: {new Date(complaint.created_at).toLocaleDateString()}
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
            complaint.status === 'resolved' ? 'bg-green-100 text-green-800' :
            complaint.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
            'bg-yellow-100 text-yellow-800'
          }`}>
            {complaint.status.replace('_', ' ').toUpperCase()}
          </span>
          <span className={`px-2 py-1 rounded text-xs ${
            complaint.priority === 'urgent' ? 'bg-red-100 text-red-800' :
            complaint.priority === 'high' ? 'bg-orange-100 text-orange-800' :
            'bg-gray-100 text-gray-800'
          }`}>
            {complaint.priority.toUpperCase()}
          </span>
        </div>
      </div>

      <div className="space-y-2 mb-4">
        <p><strong>Type:</strong> {complaint.complaint_type.replace('_', ' ').toUpperCase()}</p>
        <p><strong>Impact:</strong> {complaint.impact_level.toUpperCase()}</p>
        {complaint.asset_name && <p><strong>Asset:</strong> {complaint.asset_name}</p>}
        <p><strong>Description:</strong> {complaint.description}</p>
      </div>

      {showResolutionForm && (
        <div className="mt-4 p-4 bg-gray-50 rounded-lg">
          <h4 className="font-medium text-gray-900 mb-3">Resolve Complaint</h4>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Resolution Action
              </label>
              <select
                value={resolutionData.resolution_action}
                onChange={(e) => setResolutionData(prev => ({ ...prev, resolution_action: e.target.value }))}
                className="w-full border border-gray-300 rounded px-3 py-2"
              >
                {resolutionActions.map(action => (
                  <option key={action.value} value={action.value}>
                    {action.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Resolution Notes
              </label>
              <textarea
                value={resolutionData.resolution_notes}
                onChange={(e) => setResolutionData(prev => ({ ...prev, resolution_notes: e.target.value }))}
                rows={3}
                className="w-full border border-gray-300 rounded px-3 py-2"
                placeholder="Describe what was done to resolve the issue..."
              />
            </div>
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setShowResolutionForm(false)}
                className="px-3 py-1 text-gray-600 bg-gray-200 rounded hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={handleResolve}
                className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700"
              >
                Resolve
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-end space-x-2">
        {complaint.status === 'open' && (
          <button
            onClick={onAssign}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Assign to Me
          </button>
        )}
        {complaint.status === 'in_progress' && (
          <button
            onClick={() => setShowResolutionForm(true)}
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
          >
            Resolve
          </button>
        )}
      </div>
    </div>
  );
}