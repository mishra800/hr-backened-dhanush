import { useState, useEffect } from 'react';
import api from '../../api/axios';
import AssetRequestForm from './AssetRequestForm';
import ComplaintForm from './ComplaintForm';

export default function AssetDashboard() {
  const [activeTab, setActiveTab] = useState('assets');
  const [myAssets, setMyAssets] = useState([]);
  const [myRequests, setMyRequests] = useState([]);
  const [myComplaints, setMyComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [showComplaintForm, setShowComplaintForm] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [assetsRes, requestsRes, complaintsRes] = await Promise.all([
        api.get('/assets/my-assets'),
        api.get('/assets/my-requests'),
        api.get('/assets/my-complaints')
      ]);
      
      setMyAssets(assetsRes.data);
      setMyRequests(requestsRes.data);
      setMyComplaints(complaintsRes.data);
    } catch (error) {
      console.error('Error fetching asset data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRequestSubmit = () => {
    setShowRequestForm(false);
    fetchData();
  };

  const handleComplaintSubmit = () => {
    setShowComplaintForm(false);
    fetchData();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2">Loading assets...</span>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Asset Management</h1>
        <p className="text-gray-600 mt-2">Manage your IT assets, requests, and complaints</p>
      </div>

      {/* Action Buttons */}
      <div className="mb-6 flex gap-4">
        <button
          onClick={() => setShowRequestForm(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center"
        >
          <span className="mr-2">📝</span>
          Request Assets
        </button>
        <button
          onClick={() => setShowComplaintForm(true)}
          className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 flex items-center"
        >
          <span className="mr-2">🚨</span>
          Report IT Issue
        </button>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'assets', name: 'My Assets', icon: '💻' },
            { id: 'requests', name: 'My Requests', icon: '📋' },
            { id: 'complaints', name: 'My Complaints', icon: '🎫' }
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

      {/* Tab Content */}
      {activeTab === 'assets' && (
        <div>
          {/* Quick IT Issue Reporting */}
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <span className="text-red-600 text-2xl mr-3">🚨</span>
                <div>
                  <h3 className="text-red-800 font-medium">Having IT Issues?</h3>
                  <p className="text-red-700 text-sm">
                    Report laptop, WiFi, software, or any IT problems instantly
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowComplaintForm(true)}
                className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 font-medium"
              >
                🚨 Report IT Issue
              </button>
            </div>
            <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
              <div className="flex items-center text-red-700">
                <span className="mr-1">💻</span>
                <span>Laptop Issues</span>
              </div>
              <div className="flex items-center text-red-700">
                <span className="mr-1">📶</span>
                <span>WiFi Problems</span>
              </div>
              <div className="flex items-center text-red-700">
                <span className="mr-1">🖥️</span>
                <span>Software Issues</span>
              </div>
              <div className="flex items-center text-red-700">
                <span className="mr-1">📧</span>
                <span>Email Problems</span>
              </div>
            </div>
          </div>

          {/* Assets Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {myAssets.length > 0 ? (
            myAssets.map((asset) => (
              <div key={asset.id} className="bg-white rounded-lg shadow-md p-6 border">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{asset.name}</h3>
                    <p className="text-sm text-gray-600">{asset.type}</p>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    asset.status === 'assigned' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {asset.status}
                  </span>
                </div>
                <div className="space-y-2 text-sm text-gray-600">
                  <p><strong>Serial Number:</strong> {asset.serial_number}</p>
                  {asset.specifications && (
                    <div>
                      <strong>Specifications:</strong>
                      <ul className="mt-1 ml-4 list-disc">
                        {Object.entries(asset.specifications).map(([key, value]) => (
                          <li key={key}>{key}: {value}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
                <button
                  onClick={() => setShowComplaintForm(true)}
                  className="mt-4 w-full bg-red-50 text-red-600 py-2 px-4 rounded hover:bg-red-100 text-sm"
                >
                  Report Issue
                </button>
              </div>
            ))
          ) : (
            <div className="col-span-full text-center py-12">
              <div className="text-gray-400 text-6xl mb-4">💻</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Assets Assigned</h3>
              <p className="text-gray-600 mb-4">You don't have any assets assigned yet.</p>
              <button
                onClick={() => setShowRequestForm(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
              >
                Request Assets
              </button>
            </div>
          )}
          </div>
        </div>
      )}

      {activeTab === 'requests' && (
        <div className="space-y-4">
          {myRequests.length > 0 ? (
            myRequests.map((request) => (
              <div key={request.id} className="bg-white rounded-lg shadow-md p-6 border">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      Request #{request.id} - {request.request_type.replace('_', ' ').toUpperCase()}
                    </h3>
                    <p className="text-sm text-gray-600">
                      Created: {new Date(request.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    request.status === 'completed' ? 'bg-green-100 text-green-800' :
                    request.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                    request.status === 'hr_approved' ? 'bg-blue-100 text-blue-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {request.status.replace('_', ' ').toUpperCase()}
                  </span>
                </div>
                <div className="space-y-2">
                  <p><strong>Requested Assets:</strong> {request.requested_assets.join(', ')}</p>
                  {request.reason && <p><strong>Reason:</strong> {request.reason}</p>}
                  <p><strong>Priority:</strong> {request.priority.toUpperCase()}</p>
                </div>
                {(request.manager_notes || request.hr_notes || request.assets_team_notes) && (
                  <div className="mt-4 pt-4 border-t">
                    <h4 className="font-medium text-gray-900 mb-2">Notes:</h4>
                    {request.manager_notes && <p className="text-sm text-gray-600 mb-1"><strong>Manager:</strong> {request.manager_notes}</p>}
                    {request.hr_notes && <p className="text-sm text-gray-600 mb-1"><strong>HR:</strong> {request.hr_notes}</p>}
                    {request.assets_team_notes && <p className="text-sm text-gray-600"><strong>Assets Team:</strong> {request.assets_team_notes}</p>}
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="text-center py-12">
              <div className="text-gray-400 text-6xl mb-4">📋</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Requests</h3>
              <p className="text-gray-600">You haven't made any asset requests yet.</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'complaints' && (
        <div className="space-y-4">
          {myComplaints.length > 0 ? (
            myComplaints.map((complaint) => (
              <div key={complaint.id} className="bg-white rounded-lg shadow-md p-6 border">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{complaint.title}</h3>
                    <p className="text-sm text-gray-600">
                      Ticket: {complaint.ticket_number} | Created: {new Date(complaint.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    complaint.status === 'resolved' ? 'bg-green-100 text-green-800' :
                    complaint.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {complaint.status.replace('_', ' ').toUpperCase()}
                  </span>
                </div>
                <div className="space-y-2">
                  <p><strong>Type:</strong> {complaint.complaint_type.replace('_', ' ').toUpperCase()}</p>
                  <p><strong>Priority:</strong> {complaint.priority.toUpperCase()}</p>
                  <p><strong>Impact:</strong> {complaint.impact_level.toUpperCase()}</p>
                  {complaint.asset_name && <p><strong>Asset:</strong> {complaint.asset_name}</p>}
                  <p><strong>Description:</strong> {complaint.description}</p>
                </div>
                {complaint.resolution_notes && (
                  <div className="mt-4 pt-4 border-t bg-green-50 p-3 rounded">
                    <h4 className="font-medium text-green-900 mb-2">Resolution:</h4>
                    <p className="text-sm text-green-800">{complaint.resolution_notes}</p>
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="text-center py-12">
              <div className="text-gray-400 text-6xl mb-4">🎫</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Complaints</h3>
              <p className="text-gray-600">You haven't reported any issues yet.</p>
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      {showRequestForm && (
        <AssetRequestForm
          onClose={() => setShowRequestForm(false)}
          onSubmit={handleRequestSubmit}
        />
      )}

      {showComplaintForm && (
        <ComplaintForm
          onClose={() => setShowComplaintForm(false)}
          onSubmit={handleComplaintSubmit}
          assets={myAssets}
        />
      )}
    </div>
  );
}