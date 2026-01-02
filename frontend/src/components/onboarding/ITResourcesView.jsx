import { useState, useEffect } from 'react';
import api from '../../api/axios';

export default function ITResourcesView({ employeeId, onClose }) {
  const [resources, setResources] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (employeeId) {
      fetchITResources();
    }
  }, [employeeId]);

  const fetchITResources = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/onboarding/it-resources/${employeeId}`);
      setResources(response.data);
    } catch (err) {
      console.error('Error fetching IT resources:', err);
      setError('Failed to load IT resources');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2">Loading IT resources...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
          <div className="text-center">
            <p className="text-red-600 mb-4">{error}</p>
            <button
              onClick={onClose}
              className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-2xl font-bold text-gray-900">IT Resources</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl"
          >
            ×
          </button>
        </div>

        <div className="p-6">
          {resources && (
            <div className="space-y-6">
              {/* Employee Info */}
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="font-semibold text-blue-900 mb-2">Employee Information</h3>
                <p className="text-blue-800">
                  <strong>Name:</strong> {resources.employee_name}
                </p>
                <p className="text-blue-800">
                  <strong>Employee ID:</strong> {resources.employee_id}
                </p>
              </div>

              {/* Email */}
              {resources.email && (
                <div className="bg-green-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-green-900 mb-2 flex items-center">
                    📧 Company Email
                    <span className={`ml-2 px-2 py-1 rounded-full text-xs ${
                      resources.email.status === 'active' ? 'bg-green-200 text-green-800' : 'bg-yellow-200 text-yellow-800'
                    }`}>
                      {resources.email.status}
                    </span>
                  </h3>
                  <p className="text-green-800">
                    <strong>Email Address:</strong> {resources.email.address}
                  </p>
                </div>
              )}

              {/* VPN */}
              {resources.vpn && (
                <div className="bg-purple-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-purple-900 mb-2 flex items-center">
                    🔒 VPN Access
                    <span className={`ml-2 px-2 py-1 rounded-full text-xs ${
                      resources.vpn.status === 'active' ? 'bg-green-200 text-green-800' : 'bg-yellow-200 text-yellow-800'
                    }`}>
                      {resources.vpn.status}
                    </span>
                  </h3>
                  <p className="text-purple-800">
                    <strong>Username:</strong> {resources.vpn.username}
                  </p>
                  <p className="text-purple-800">
                    <strong>Server:</strong> {resources.vpn.server}
                  </p>
                  {resources.vpn.expires_at && (
                    <p className="text-purple-800">
                      <strong>Expires:</strong> {new Date(resources.vpn.expires_at).toLocaleDateString()}
                    </p>
                  )}
                </div>
              )}

              {/* Access Card */}
              {resources.access_card && (
                <div className="bg-orange-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-orange-900 mb-2 flex items-center">
                    🏢 Access Card
                    <span className={`ml-2 px-2 py-1 rounded-full text-xs ${
                      resources.access_card.status === 'active' ? 'bg-green-200 text-green-800' : 'bg-yellow-200 text-yellow-800'
                    }`}>
                      {resources.access_card.status}
                    </span>
                  </h3>
                  <p className="text-orange-800">
                    <strong>Card Number:</strong> {resources.access_card.card_number}
                  </p>
                  <p className="text-orange-800">
                    <strong>Access Level:</strong> {resources.access_card.access_level}
                  </p>
                  <p className="text-orange-800">
                    <strong>Delivery Status:</strong> 
                    <span className={`ml-1 px-2 py-1 rounded text-xs ${
                      resources.access_card.delivery_status === 'delivered' ? 'bg-green-200 text-green-800' : 
                      resources.access_card.delivery_status === 'pending' ? 'bg-yellow-200 text-yellow-800' :
                      'bg-blue-200 text-blue-800'
                    }`}>
                      {resources.access_card.delivery_status}
                    </span>
                  </p>
                </div>
              )}

              {/* Assets */}
              {resources.assets && resources.assets.length > 0 && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-gray-900 mb-3">💻 Assigned Assets</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {resources.assets.map((asset) => (
                      <div key={asset.id} className="bg-white p-3 rounded border">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium text-gray-900">{asset.name}</p>
                            <p className="text-sm text-gray-600">{asset.type}</p>
                            <p className="text-xs text-gray-500">S/N: {asset.serial_number}</p>
                          </div>
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            asset.status === 'assigned' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {asset.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* No Resources Message */}
              {!resources.email && !resources.vpn && !resources.access_card && (!resources.assets || resources.assets.length === 0) && (
                <div className="text-center py-8">
                  <p className="text-gray-500">No IT resources have been provisioned yet.</p>
                  <p className="text-sm text-gray-400 mt-2">Resources will appear here after IT setup is completed.</p>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex justify-end p-6 border-t">
          <button
            onClick={onClose}
            className="bg-gray-600 text-white px-6 py-2 rounded-lg hover:bg-gray-700"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}