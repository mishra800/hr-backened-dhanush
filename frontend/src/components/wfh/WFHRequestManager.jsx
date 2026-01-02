import { useState, useEffect } from 'react';
import { useRoleCheck } from '../RoleGuard';
import api from '../../api/axios';

export default function WFHRequestManager() {
  const { user, isEmployee, isManager, isHR, isAdmin } = useRoleCheck();
  const [myRequests, setMyRequests] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    request_date: '',
    reason: ''
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch user's own requests
      const myRequestsRes = await api.get('/attendance/wfh-requests');
      setMyRequests(myRequestsRes.data);
      
      // Fetch pending requests for managers/HR/admin
      if (isManager() || isHR() || isAdmin()) {
        const pendingRes = await api.get('/attendance/wfh-requests/pending');
        setPendingRequests(pendingRes.data);
      }
    } catch (error) {
      console.error('Error fetching WFH requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      await api.post('/attendance/wfh-request', {
        request_date: formData.request_date,
        reason: formData.reason
      });
      
      // Show success message
      alert('✅ WFH request submitted successfully! You will be notified once it\'s reviewed.');
      
      // Reset form and refresh data
      setFormData({ request_date: '', reason: '' });
      setShowForm(false);
      fetchData();
    } catch (error) {
      const errorMessage = error.response?.data?.detail || 'Failed to submit WFH request';
      alert(`❌ ${errorMessage}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleApproval = async (requestId, approved, comments = '') => {
    try {
      await api.put(`/attendance/wfh-requests/${requestId}/approve`, {
        status: approved ? 'approved' : 'rejected',
        comments
      });
      
      alert(`✅ WFH request ${approved ? 'approved' : 'rejected'} successfully!`);
      fetchData(); // Refresh data
    } catch (error) {
      alert('❌ Failed to update WFH request');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'rejected':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'approved':
        return '✅';
      case 'rejected':
        return '❌';
      default:
        return '⏳';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center">
              🏠 Work From Home Requests
            </h1>
            <p className="text-gray-600 mt-1">
              {isEmployee() && 'Submit and track your WFH requests'}
              {(isManager() || isHR() || isAdmin()) && 'Manage team WFH requests and approvals'}
            </p>
          </div>
          {isEmployee() && (
            <button
              onClick={() => setShowForm(!showForm)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors"
            >
              {showForm ? 'Cancel' : '+ New WFH Request'}
            </button>
          )}
        </div>
      </div>

      {/* New Request Form */}
      {showForm && isEmployee() && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold mb-4 text-blue-900">📝 Submit New WFH Request</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  📅 WFH Date *
                </label>
                <input
                  type="date"
                  value={formData.request_date}
                  onChange={(e) => setFormData({ ...formData, request_date: e.target.value })}
                  min={new Date().toISOString().split('T')[0]}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                📝 Reason for WFH *
              </label>
              <textarea
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                required
                rows={4}
                placeholder="Please provide a detailed reason for your WFH request (e.g., personal appointment, home maintenance, health reasons, etc.)"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-medium text-blue-900 mb-2">📋 WFH Guidelines</h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Submit requests at least 24 hours in advance</li>
                <li>• Ensure stable internet connection for video calls</li>
                <li>• Be available during regular working hours</li>
                <li>• Mark attendance as usual on WFH days</li>
                <li>• Keep your team informed about your availability</li>
              </ul>
            </div>

            <div className="flex space-x-3">
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                {submitting ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin h-4 w-4 mr-2" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Submitting...
                  </span>
                ) : (
                  '📤 Submit WFH Request'
                )}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Pending Approvals (Manager/HR/Admin View) */}
      {(isManager() || isHR() || isAdmin()) && pendingRequests.length > 0 && (
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-orange-600 flex items-center">
              ⚠️ Pending Approvals ({pendingRequests.length})
            </h2>
          </div>
          <div className="divide-y divide-gray-200">
            {pendingRequests.map((request) => (
              <PendingRequestCard 
                key={request.id} 
                request={request} 
                onApprove={(comments) => handleApproval(request.id, true, comments)}
                onReject={(comments) => handleApproval(request.id, false, comments)}
              />
            ))}
          </div>
        </div>
      )}

      {/* My Requests */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold flex items-center">
            📋 {isEmployee() ? 'My WFH Requests' : 'All WFH Requests'}
          </h2>
        </div>

        <div className="divide-y divide-gray-200">
          {myRequests.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <div className="text-4xl mb-4">🏠</div>
              <p>No WFH requests yet.</p>
              {isEmployee() && (
                <p className="mt-2">Click "New WFH Request" to submit your first request.</p>
              )}
            </div>
          ) : (
            myRequests.map((request) => (
              <RequestCard key={request.id} request={request} />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// Component for individual request cards
function RequestCard({ request }) {
  return (
    <div className="p-6 hover:bg-gray-50 transition-colors">
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h3 className="font-semibold text-gray-900 flex items-center">
              📅 {new Date(request.request_date).toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </h3>
            <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(request.status)}`}>
              {getStatusIcon(request.status)} {request.status.toUpperCase()}
            </span>
          </div>
          <p className="text-gray-600 text-sm mb-2">
            <strong>Reason:</strong> {request.reason}
          </p>
          <div className="text-xs text-gray-500">
            Requested on {new Date(request.created_at).toLocaleDateString()}
            {request.reviewed_at && ` • Reviewed on ${new Date(request.reviewed_at).toLocaleDateString()}`}
          </div>
        </div>
      </div>

      {request.manager_comments && (
        <div className="mt-3 bg-gray-50 rounded-lg p-3 border-l-4 border-blue-500">
          <p className="text-xs text-gray-500 mb-1 font-medium">💬 Manager Comments:</p>
          <p className="text-sm text-gray-700">{request.manager_comments}</p>
        </div>
      )}
    </div>
  );
}

// Component for pending request cards with approval actions
function PendingRequestCard({ request, onApprove, onReject }) {
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState('');

  const handleApprove = () => {
    onApprove(comments);
    setComments('');
    setShowComments(false);
  };

  const handleReject = () => {
    if (!comments.trim()) {
      alert('Please provide a reason for rejection');
      return;
    }
    onReject(comments);
    setComments('');
    setShowComments(false);
  };

  return (
    <div className="p-6 bg-orange-50 border-l-4 border-orange-400">
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h3 className="font-semibold text-gray-900">
              👤 {request.employee?.first_name} {request.employee?.last_name}
            </h3>
            <span className="text-sm text-gray-600">
              {request.employee?.department} • {request.employee?.position}
            </span>
          </div>
          <div className="text-sm text-gray-700 mb-2">
            <strong>📅 WFH Date:</strong> {new Date(request.request_date).toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </div>
          <div className="text-sm text-gray-700 mb-2">
            <strong>📝 Reason:</strong> {request.reason}
          </div>
          <div className="text-xs text-gray-500">
            Submitted on {new Date(request.created_at).toLocaleDateString()} at {new Date(request.created_at).toLocaleTimeString()}
          </div>
        </div>
      </div>

      {showComments && (
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            💬 Comments (optional for approval, required for rejection)
          </label>
          <textarea
            value={comments}
            onChange={(e) => setComments(e.target.value)}
            rows={3}
            placeholder="Add any comments about this WFH request..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      )}

      <div className="flex space-x-3">
        {!showComments ? (
          <>
            <button
              onClick={() => {
                setShowComments(true);
                setComments('');
              }}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium transition-colors"
            >
              ✅ Approve
            </button>
            <button
              onClick={() => {
                setShowComments(true);
                setComments('');
              }}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium transition-colors"
            >
              ❌ Reject
            </button>
          </>
        ) : (
          <>
            <button
              onClick={handleApprove}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium transition-colors"
            >
              ✅ Confirm Approval
            </button>
            <button
              onClick={handleReject}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium transition-colors"
            >
              ❌ Confirm Rejection
            </button>
            <button
              onClick={() => {
                setShowComments(false);
                setComments('');
              }}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium"
            >
              Cancel
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// Helper function (moved outside component to avoid re-creation)
function getStatusColor(status) {
  switch (status) {
    case 'approved':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'rejected':
      return 'bg-red-100 text-red-800 border-red-200';
    default:
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
  }
}

function getStatusIcon(status) {
  switch (status) {
    case 'approved':
      return '✅';
    case 'rejected':
      return '❌';
    default:
      return '⏳';
  }
}