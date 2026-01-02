import { useState } from 'react';
import api from '../../api/axios';

export default function ComplaintForm({ onClose, onSubmit, assets = [] }) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    complaint_type: 'hardware_issue',
    asset_id: '',
    priority: 'normal',
    impact_level: 'medium'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const complaintTypes = [
    { value: 'hardware_issue', label: '💻 Hardware Issue (Laptop, Monitor, etc.)' },
    { value: 'software_issue', label: '🖥️ Software Issue (Applications, Updates)' },
    { value: 'network_issue', label: '📶 Network Issue (WiFi, Internet)' },
    { value: 'email_issue', label: '📧 Email Issue (Access, Configuration)' },
    { value: 'performance', label: '⚡ Performance Issue (Slow, Freezing)' },
    { value: 'damage', label: '🔧 Physical Damage' },
    { value: 'theft', label: '🚨 Theft/Loss' },
    { value: 'other', label: '❓ Other IT Issue' }
  ];

  const priorities = [
    { value: 'low', label: 'Low - Can work around it' },
    { value: 'normal', label: 'Normal - Affects productivity' },
    { value: 'high', label: 'High - Blocks important work' },
    { value: 'urgent', label: 'Urgent - Cannot work at all' }
  ];

  const impactLevels = [
    { value: 'low', label: 'Low - Minor inconvenience' },
    { value: 'medium', label: 'Medium - Affects daily work' },
    { value: 'high', label: 'High - Blocks critical tasks' },
    { value: 'critical', label: 'Critical - Complete work stoppage' }
  ];

  const commonIssues = [
    'Laptop not starting up',
    'WiFi connection problems',
    'Email not working',
    'Software application crashes',
    'Slow computer performance',
    'Monitor display issues',
    'Keyboard/mouse not working',
    'Printer connection problems',
    'VPN access issues',
    'Software installation needed'
  ];

  const handleCommonIssueSelect = (issue) => {
    setFormData(prev => ({
      ...prev,
      title: issue,
      description: prev.description || `Issue: ${issue}\n\nPlease describe what happened and when it started:`
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.title.trim()) {
      setError('Please provide a title for the complaint');
      return;
    }

    if (!formData.description.trim()) {
      setError('Please provide a description of the issue');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const requestData = {
        ...formData,
        asset_id: formData.asset_id ? parseInt(formData.asset_id) : null
      };

      const response = await api.post('/assets/complaints', requestData);
      
      // Show success message with ticket number
      alert(`✅ IT Issue Reported Successfully!

🎫 Ticket Number: ${response.data.ticket_number}
📋 Issue: ${formData.title}
⚡ Priority: ${formData.priority.toUpperCase()}

The Assets Team has been notified and will investigate your issue. You will receive updates on the progress.`);
      
      onSubmit();
    } catch (error) {
      console.error('Error creating complaint:', error);
      setError(error.response?.data?.detail || 'Failed to create complaint');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-2xl font-bold text-gray-900">🚨 Report IT Issue</h2>
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

          {/* Quick Issue Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              🚀 Quick Issue Selection (Optional)
            </label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {commonIssues.map(issue => (
                <button
                  key={issue}
                  type="button"
                  onClick={() => handleCommonIssueSelect(issue)}
                  className="text-left p-2 text-sm border border-gray-300 rounded hover:bg-blue-50 hover:border-blue-300"
                >
                  {issue}
                </button>
              ))}
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Issue Title *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Brief description of the issue..."
            />
          </div>

          {/* Asset Selection */}
          {assets.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Related Equipment (Optional)
              </label>
              <select
                value={formData.asset_id}
                onChange={(e) => setFormData(prev => ({ ...prev, asset_id: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select equipment if related to specific device</option>
                {assets.map(asset => (
                  <option key={asset.id} value={asset.id}>
                    {asset.name} - {asset.serial_number}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Issue Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Issue Type
            </label>
            <select
              value={formData.complaint_type}
              onChange={(e) => setFormData(prev => ({ ...prev, complaint_type: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {complaintTypes.map(type => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          {/* Priority and Impact */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Impact Level
              </label>
              <select
                value={formData.impact_level}
                onChange={(e) => setFormData(prev => ({ ...prev, impact_level: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {impactLevels.map(level => (
                  <option key={level.value} value={level.value}>
                    {level.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Detailed Description *
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              rows={6}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Please provide detailed information about the issue:

• What exactly happened?
• When did it start?
• What were you doing when it occurred?
• Any error messages you saw?
• Steps to reproduce the issue?
• Have you tried any troubleshooting steps?"
            />
          </div>

          {/* Help Text */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 mb-2">💡 Tips for faster resolution:</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Be specific about error messages</li>
              <li>• Mention when the issue started</li>
              <li>• Include steps to reproduce the problem</li>
              <li>• Note if it affects other colleagues</li>
              <li>• Mention any recent changes or updates</li>
            </ul>
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
              className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
            >
              {loading ? 'Submitting...' : '🚨 Report Issue'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}