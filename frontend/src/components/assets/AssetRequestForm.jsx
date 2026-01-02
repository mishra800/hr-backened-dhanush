import { useState } from 'react';
import api from '../../api/axios';
import { useAuth } from '../../context/authcontext';

export default function AssetRequestForm({ onClose, onSubmit }) {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    request_type: 'additional',
    requested_assets: [],
    reason: '',
    business_justification: '',
    priority: 'normal'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const assetTypes = [
    'Laptop',
    'Monitor',
    'Keyboard',
    'Mouse',
    'Headset',
    'Mobile',
    'Tablet',
    'Webcam',
    'Docking Station',
    'External Drive'
  ];

  const requestTypes = [
    { value: 'additional', label: 'Additional Equipment' },
    { value: 'replacement', label: 'Replacement' },
    { value: 'upgrade', label: 'Upgrade' }
  ];

  const priorities = [
    { value: 'low', label: 'Low' },
    { value: 'normal', label: 'Normal' },
    { value: 'high', label: 'High' },
    { value: 'urgent', label: 'Urgent' }
  ];

  const handleAssetToggle = (assetType) => {
    setFormData(prev => ({
      ...prev,
      requested_assets: prev.requested_assets.includes(assetType)
        ? prev.requested_assets.filter(a => a !== assetType)
        : [...prev.requested_assets, assetType]
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (formData.requested_assets.length === 0) {
      setError('Please select at least one asset type');
      return;
    }

    if (!formData.reason.trim()) {
      setError('Please provide a reason for the request');
      return;
    }

    try {
      setLoading(true);
      setError('');

      // Get employee ID from user profile
      const profileRes = await api.get('/employees/profile');
      const employeeId = profileRes.data.id;

      const requestData = {
        ...formData,
        employee_id: employeeId
      };

      await api.post('/assets/requests', requestData);
      
      onSubmit();
    } catch (error) {
      console.error('Error creating asset request:', error);
      setError(error.response?.data?.detail || 'Failed to create asset request');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-2xl font-bold text-gray-900">Request Assets</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {/* Request Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Request Type
            </label>
            <select
              value={formData.request_type}
              onChange={(e) => setFormData(prev => ({ ...prev, request_type: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {requestTypes.map(type => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          {/* Asset Types */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Requested Assets *
            </label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {assetTypes.map(assetType => (
                <label key={assetType} className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.requested_assets.includes(assetType)}
                    onChange={() => handleAssetToggle(assetType)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">{assetType}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Priority */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Priority
            </label>
            <select
              value={formData.priority}
              onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {priorities.map(priority => (
                <option key={priority.value} value={priority.value}>
                  {priority.label}
                </option>
              ))}
            </select>
          </div>

          {/* Reason */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Reason *
            </label>
            <textarea
              value={formData.reason}
              onChange={(e) => setFormData(prev => ({ ...prev, reason: e.target.value }))}
              rows={3}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Please explain why you need these assets..."
            />
          </div>

          {/* Business Justification */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Business Justification
            </label>
            <textarea
              value={formData.business_justification}
              onChange={(e) => setFormData(prev => ({ ...prev, business_justification: e.target.value }))}
              rows={3}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="How will these assets help with your work or projects?"
            />
          </div>

          {/* Submit Buttons */}
          <div className="flex justify-end space-x-4 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Submitting...' : 'Submit Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}