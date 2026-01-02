import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/authcontext';

const AcknowledgmentAdminDashboard = () => {
  const { user } = useAuth();
  const [acknowledgments, setAcknowledgments] = useState([]);
  const [selectedAck, setSelectedAck] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reviewModal, setReviewModal] = useState(false);
  const [reviewData, setReviewData] = useState({
    review_status: 'approved',
    admin_comments: ''
  });

  useEffect(() => {
    loadPendingAcknowledgments();
  }, []);

  const loadPendingAcknowledgments = async () => {
    try {
      const response = await fetch('/api/acknowledgments/pending', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setAcknowledgments(data);
      }
    } catch (error) {
      console.error('Error loading acknowledgments:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAcknowledmentDetails = async (ackId) => {
    try {
      const response = await fetch(`/api/acknowledgments/${ackId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setSelectedAck(data);
      }
    } catch (error) {
      console.error('Error loading acknowledgment details:', error);
    }
  };

  const handleReviewSubmit = async () => {
    if (!selectedAck) return;

    try {
      const response = await fetch(`/api/acknowledgments/${selectedAck.id}/review`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(reviewData)
      });

      if (response.ok) {
        setReviewModal(false);
        setSelectedAck(null);
        setReviewData({ review_status: 'approved', admin_comments: '' });
        loadPendingAcknowledgments();
      }
    } catch (error) {
      console.error('Error submitting review:', error);
    }
  };

  const getStatusBadge = (status, reviewStatus) => {
    if (reviewStatus === 'approved') {
      return <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-sm">Approved</span>;
    } else if (reviewStatus === 'needs_action') {
      return <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-sm">Needs Action</span>;
    } else if (status === 'submitted') {
      return <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm">Pending Review</span>;
    }
    return <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded-full text-sm">{status}</span>;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Asset Acknowledgments</h2>
        <div className="text-sm text-gray-500">
          {acknowledgments.length} pending review{acknowledgments.length !== 1 ? 's' : ''}
        </div>
      </div>

      {acknowledgments.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No pending acknowledgments</h3>
          <p className="mt-1 text-sm text-gray-500">
            All asset acknowledgments have been reviewed.
          </p>
        </div>
      ) : (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Employee
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Reference
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Department
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Submitted
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Issues
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {acknowledgments.map((ack) => (
                  <tr key={ack.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{ack.employee_name}</div>
                        <div className="text-sm text-gray-500">ID: {ack.employee_id_number}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {ack.reference_number}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {ack.department}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(ack.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(ack.status, ack.review_status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {ack.has_issues ? (
                        <span className="px-2 py-1 bg-orange-100 text-orange-800 rounded-full text-sm">
                          Has Issues
                        </span>
                      ) : (
                        <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-sm">
                          No Issues
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => {
                          loadAcknowledmentDetails(ack.id);
                          setReviewModal(true);
                        }}
                        className="text-blue-600 hover:text-blue-900 mr-3"
                      >
                        Review
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Review Modal */}
      {reviewModal && selectedAck && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Review Asset Acknowledgment - {selectedAck.reference_number}
                </h3>
                <button
                  onClick={() => {
                    setReviewModal(false);
                    setSelectedAck(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="max-h-96 overflow-y-auto mb-6">
                {/* Employee Information */}
                <div className="bg-gray-50 p-4 rounded-lg mb-4">
                  <h4 className="font-medium text-gray-900 mb-2">Employee Information</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div><strong>Name:</strong> {selectedAck.employee_name}</div>
                    <div><strong>ID:</strong> {selectedAck.employee_id_number}</div>
                    <div><strong>Department:</strong> {selectedAck.department}</div>
                    <div><strong>Date of Joining:</strong> {new Date(selectedAck.date_of_joining).toLocaleDateString()}</div>
                  </div>
                </div>

                {/* Equipment Received */}
                <div className="bg-blue-50 p-4 rounded-lg mb-4">
                  <h4 className="font-medium text-gray-900 mb-2">Equipment Received</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="flex items-center">
                      <span className={`w-3 h-3 rounded-full mr-2 ${selectedAck.laptop_received ? 'bg-green-500' : 'bg-red-500'}`}></span>
                      Laptop {selectedAck.laptop_received && selectedAck.laptop_model && `(${selectedAck.laptop_model})`}
                    </div>
                    <div className="flex items-center">
                      <span className={`w-3 h-3 rounded-full mr-2 ${selectedAck.monitor_received ? 'bg-green-500' : 'bg-red-500'}`}></span>
                      Monitor
                    </div>
                    <div className="flex items-center">
                      <span className={`w-3 h-3 rounded-full mr-2 ${selectedAck.keyboard_received ? 'bg-green-500' : 'bg-red-500'}`}></span>
                      Keyboard
                    </div>
                    <div className="flex items-center">
                      <span className={`w-3 h-3 rounded-full mr-2 ${selectedAck.mouse_received ? 'bg-green-500' : 'bg-red-500'}`}></span>
                      Mouse
                    </div>
                    <div className="flex items-center">
                      <span className={`w-3 h-3 rounded-full mr-2 ${selectedAck.headset_received ? 'bg-green-500' : 'bg-red-500'}`}></span>
                      Headset
                    </div>
                    <div className="flex items-center">
                      <span className={`w-3 h-3 rounded-full mr-2 ${selectedAck.mobile_received ? 'bg-green-500' : 'bg-red-500'}`}></span>
                      Mobile Device
                    </div>
                  </div>
                </div>

                {/* Access & Credentials */}
                <div className="bg-green-50 p-4 rounded-lg mb-4">
                  <h4 className="font-medium text-gray-900 mb-2">Access & Credentials</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="flex items-center">
                      <span className={`w-3 h-3 rounded-full mr-2 ${selectedAck.email_received ? 'bg-green-500' : 'bg-red-500'}`}></span>
                      Email Setup {selectedAck.email_address && `(${selectedAck.email_address})`}
                    </div>
                    <div className="flex items-center">
                      <span className={`w-3 h-3 rounded-full mr-2 ${selectedAck.wifi_access_received ? 'bg-green-500' : 'bg-red-500'}`}></span>
                      WiFi Access
                    </div>
                    <div className="flex items-center">
                      <span className={`w-3 h-3 rounded-full mr-2 ${selectedAck.id_card_received ? 'bg-green-500' : 'bg-red-500'}`}></span>
                      ID Card {selectedAck.id_card_number && `(${selectedAck.id_card_number})`}
                    </div>
                    <div className="flex items-center">
                      <span className={`w-3 h-3 rounded-full mr-2 ${selectedAck.biometric_setup_completed ? 'bg-green-500' : 'bg-red-500'}`}></span>
                      Biometric Setup
                    </div>
                  </div>
                </div>

                {/* Login Status */}
                <div className="bg-yellow-50 p-4 rounded-lg mb-4">
                  <h4 className="font-medium text-gray-900 mb-2">Login Status</h4>
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <div className="flex items-center">
                      <span className={`w-3 h-3 rounded-full mr-2 ${selectedAck.system_login_working ? 'bg-green-500' : 'bg-red-500'}`}></span>
                      System Login
                    </div>
                    <div className="flex items-center">
                      <span className={`w-3 h-3 rounded-full mr-2 ${selectedAck.email_login_working ? 'bg-green-500' : 'bg-red-500'}`}></span>
                      Email Login
                    </div>
                    <div className="flex items-center">
                      <span className={`w-3 h-3 rounded-full mr-2 ${selectedAck.vpn_access_working ? 'bg-green-500' : 'bg-red-500'}`}></span>
                      VPN Access
                    </div>
                  </div>
                </div>

                {/* Comments & Issues */}
                {(selectedAck.employee_comments || selectedAck.issues_reported || selectedAck.additional_requirements) && (
                  <div className="bg-red-50 p-4 rounded-lg mb-4">
                    <h4 className="font-medium text-gray-900 mb-2">Comments & Issues</h4>
                    {selectedAck.employee_comments && (
                      <div className="mb-2">
                        <strong className="text-sm">General Comments:</strong>
                        <p className="text-sm text-gray-700">{selectedAck.employee_comments}</p>
                      </div>
                    )}
                    {selectedAck.issues_reported && (
                      <div className="mb-2">
                        <strong className="text-sm text-red-700">Issues Reported:</strong>
                        <p className="text-sm text-red-600">{selectedAck.issues_reported}</p>
                      </div>
                    )}
                    {selectedAck.additional_requirements && (
                      <div className="mb-2">
                        <strong className="text-sm">Additional Requirements:</strong>
                        <p className="text-sm text-gray-700">{selectedAck.additional_requirements}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Review Form */}
              <div className="border-t pt-4">
                <h4 className="font-medium text-gray-900 mb-3">Admin Review</h4>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Review Status
                    </label>
                    <select
                      value={reviewData.review_status}
                      onChange={(e) => setReviewData(prev => ({ ...prev, review_status: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="approved">Approved</option>
                      <option value="needs_action">Needs Action</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Admin Comments
                    </label>
                    <textarea
                      value={reviewData.admin_comments}
                      onChange={(e) => setReviewData(prev => ({ ...prev, admin_comments: e.target.value }))}
                      rows="3"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Add any comments or instructions..."
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => {
                    setReviewModal(false);
                    setSelectedAck(null);
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleReviewSubmit}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Submit Review
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AcknowledgmentAdminDashboard;