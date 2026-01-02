import { useState, useEffect } from 'react';
import api from '../../api/axios';

export default function AssetFulfillmentModal({ request, onClose, onComplete }) {
  const [availableAssets, setAvailableAssets] = useState({});
  const [selectedAssets, setSelectedAssets] = useState([]);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchAvailableAssets();
  }, [request]);

  const fetchAvailableAssets = async () => {
    try {
      setLoading(true);
      
      // Fetch available assets for each requested type
      const assetPromises = request.requested_assets.map(async (assetType) => {
        const response = await api.get(`/assets/available?asset_type=${assetType}`);
        return { type: assetType, assets: response.data };
      });
      
      const results = await Promise.all(assetPromises);
      
      const assetsMap = {};
      results.forEach(({ type, assets }) => {
        assetsMap[type] = assets;
      });
      
      setAvailableAssets(assetsMap);
    } catch (error) {
      console.error('Error fetching available assets:', error);
      setError('Failed to load available assets');
    } finally {
      setLoading(false);
    }
  };

  const handleAssetSelect = (assetType, assetId, condition = 'good') => {
    setSelectedAssets(prev => {
      // Remove any existing selection for this asset type
      const filtered = prev.filter(item => 
        !availableAssets[assetType]?.some(asset => asset.id === item.asset_id)
      );
      
      // Add new selection if assetId is provided
      if (assetId) {
        return [...filtered, { asset_id: assetId, condition }];
      }
      
      return filtered;
    });
  };

  const handleSubmit = async () => {
    if (selectedAssets.length === 0) {
      setError('Please select at least one asset to assign');
      return;
    }

    try {
      setSubmitting(true);
      setError('');

      await api.post(`/assets/requests/${request.id}/fulfill`, {
        asset_assignments: selectedAssets,
        notes: notes
      });

      onComplete();
    } catch (error) {
      console.error('Error fulfilling request:', error);
      setError(error.response?.data?.detail || 'Failed to fulfill request');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2">Loading available assets...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-2xl font-bold text-gray-900">
            Fulfill Asset Request #{request.id}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl"
          >
            ×
          </button>
        </div>

        <div className="p-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          {/* Request Details */}
          <div className="bg-blue-50 p-4 rounded-lg mb-6">
            <h3 className="font-semibold text-blue-900 mb-2">Request Details</h3>
            <p className="text-blue-800"><strong>Employee:</strong> {request.employee_name}</p>
            <p className="text-blue-800"><strong>Type:</strong> {request.request_type.replace('_', ' ').toUpperCase()}</p>
            <p className="text-blue-800"><strong>Reason:</strong> {request.reason}</p>
            {request.business_justification && (
              <p className="text-blue-800"><strong>Justification:</strong> {request.business_justification}</p>
            )}
          </div>

          {/* Asset Selection */}
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-900">Select Assets to Assign</h3>
            
            {request.requested_assets.map((assetType) => (
              <div key={assetType} className="border rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-3">{assetType}</h4>
                
                {availableAssets[assetType]?.length > 0 ? (
                  <div className="space-y-2">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {availableAssets[assetType].map((asset) => (
                        <label key={asset.id} className="flex items-center space-x-3 p-3 border rounded hover:bg-gray-50 cursor-pointer">
                          <input
                            type="radio"
                            name={`asset-${assetType}`}
                            value={asset.id}
                            onChange={(e) => handleAssetSelect(assetType, parseInt(e.target.value))}
                            className="text-blue-600 focus:ring-blue-500"
                          />
                          <div className="flex-1">
                            <p className="font-medium text-gray-900">{asset.name}</p>
                            <p className="text-sm text-gray-600">S/N: {asset.serial_number}</p>
                            {asset.specifications && (
                              <div className="text-xs text-gray-500 mt-1">
                                {Object.entries(asset.specifications).slice(0, 2).map(([key, value]) => (
                                  <span key={key} className="mr-3">{key}: {value}</span>
                                ))}
                              </div>
                            )}
                          </div>
                        </label>
                      ))}
                    </div>
                    
                    {/* Condition Selection */}
                    {selectedAssets.some(sa => availableAssets[assetType]?.some(a => a.id === sa.asset_id)) && (
                      <div className="mt-3">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Condition at Assignment
                        </label>
                        <select
                          onChange={(e) => {
                            const selectedAsset = selectedAssets.find(sa => 
                              availableAssets[assetType]?.some(a => a.id === sa.asset_id)
                            );
                            if (selectedAsset) {
                              handleAssetSelect(assetType, selectedAsset.asset_id, e.target.value);
                            }
                          }}
                          className="border border-gray-300 rounded px-3 py-2"
                        >
                          <option value="excellent">Excellent</option>
                          <option value="good" selected>Good</option>
                          <option value="fair">Fair</option>
                          <option value="poor">Poor</option>
                        </select>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-4 text-gray-500">
                    <p>No {assetType.toLowerCase()} assets available</p>
                    <p className="text-sm">Consider ordering new equipment or check maintenance status</p>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Notes */}
          <div className="mt-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Assignment Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Any special instructions or notes for the employee..."
            />
          </div>

          {/* Selected Assets Summary */}
          {selectedAssets.length > 0 && (
            <div className="mt-6 bg-green-50 p-4 rounded-lg">
              <h4 className="font-medium text-green-900 mb-2">Selected Assets ({selectedAssets.length})</h4>
              <ul className="text-sm text-green-800 space-y-1">
                {selectedAssets.map((selection) => {
                  const asset = Object.values(availableAssets).flat().find(a => a.id === selection.asset_id);
                  return asset ? (
                    <li key={selection.asset_id}>
                      {asset.name} - {asset.serial_number} (Condition: {selection.condition})
                    </li>
                  ) : null;
                })}
              </ul>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end space-x-4 p-6 border-t">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting || selectedAssets.length === 0}
            className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
          >
            {submitting ? 'Assigning...' : 'Assign Assets'}
          </button>
        </div>
      </div>
    </div>
  );
}