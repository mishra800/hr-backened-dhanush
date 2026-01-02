import { useState, useEffect } from 'react';
import api from '../../api/axios';
import InfrastructureRequestButton from './InfrastructureRequestButton';

export default function ComplianceReviewDashboard() {
  const [pendingApprovals, setPendingApprovals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [reviewModal, setReviewModal] = useState(false);
  const [approvalData, setApprovalData] = useState({
    verified_full_name: '',
    verified_email_prefix: '',
    verified_department: '',
    verified_position: '',
    priority: 'normal',
    review_notes: ''
  });

  useEffect(() => {
    fetchPendingApprovals();
  }, []);

  const fetchPendingApprovals = async () => {
    try {
      setLoading(true);
      const response = await api.get('/onboarding/pending-approvals');
      setPendingApprovals(response.data);
    } catch (err) {
      console.error('Error fetching pending approvals:', err);
    } finally {
      setLoading(false);
    }
  };

  const openReviewModal = (employee) => {
    setSelectedEmployee(employee);
    setApprovalData({
      verified_full_name: employee.employee_name,
      verified_email_prefix: employee.employee_name.toLowerCase().replace(/\s+/g, '.'),
      verified_department: employee.department,
      verified_position: employee.position,
      priority: 'normal',
      review_notes: ''
    });
    setReviewModal(true);
  };

  const handleApproveAndRequestIT = async () => {
    try {
      const response = await api.post('/onboarding/approve-and-request-it', {
        employee_id: selectedEmployee.employee_id,
        ...approvalData
      });

      if (response.data.success) {
        // Also request infrastructure setup
        try {
          const infraResponse = await api.post(`/onboarding/request-infrastructure/${selectedEmployee.employee_id}`);
          
          alert(`✅ Compliance approved! 
IT Ticket ${response.data.ticket_number} created.
Infrastructure setup requested: ${infraResponse.data.ticket_number}`);
        } catch (infraError) {
          console.error('Error requesting infrastructure:', infraError);
          alert(`✅ Compliance approved! IT Ticket ${response.data.ticket_number} created.
⚠️ Please manually request infrastructure setup.`);
        }
        
        setReviewModal(false);
        fetchPendingApprovals(); // Refresh the list
      } else {
        alert('Error: ' + response.data.message);
      }
    } catch (err) {
      console.error('Error approving compliance:', err);
      alert('Error approving compliance: ' + (err.response?.data?.detail || err.message));
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="px-6 py-4 border-b border-gray-200">
        <h2 className="text-xl font-semibold text-gray-900">
          🔍 Compliance Review Dashboard - Gatekeeper Model
        </h2>
        <p className="text-sm text-gray-600 mt-1">
          Review and approve employee data before IT provisioning
        </p>
      </div>

      {pendingApprovals.length === 0 ? (
        <div className="p-6 text-center">
          <div className="text-gray-400 text-6xl mb-4">✅</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">All Caught Up!</h3>
          <p className="text-gray-500">No employees pending compliance review.</p>
        </div>
      ) : (
        <div className="divide-y divide-gray-200">
          {pendingApprovals.map((employee) => (
            <div key={employee.employee_id} className="p-6 hover:bg-gray-50">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center">
                    <h3 className="text-lg font-medium text-gray-900">
                      {employee.employee_name}
                    </h3>
                    <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                      Pending Review
                    </span>
                  </div>
                  
                  <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
                    <div>
                      <span className="font-medium">Department:</span> {employee.department}
                    </div>
                    <div>
                      <span className="font-medium">Position:</span> {employee.position}
                    </div>
                    <div>
                      <span className="font-medium">Days Pending:</span> {employee.days_pending}
                    </div>
                    <div>
                      <span className="font-medium">Documents:</span> {employee.documents_count}
                    </div>
                  </div>

                  <div className="mt-3 flex items-center space-x-4">
                    <div className={`flex items-center text-sm ${employee.form_completed ? 'text-green-600' : 'text-red-600'}`}>
                      <span className="mr-1">{employee.form_completed ? '✅' : '❌'}</span>
                      Form {employee.form_completed ? 'Complete' : 'Incomplete'}
                    </div>
                    <div className={`flex items-center text-sm ${employee.documents_verified ? 'text-green-600' : 'text-red-600'}`}>
                      <span className="mr-1">{employee.documents_verified ? '✅' : '❌'}</span>
                      Documents {employee.documents_verified ? 'Verified' : 'Pending'}
                    </div>
                  </div>
                </div>

                <div className="ml-4">
                  <button
                    onClick={() => openReviewModal(employee)}
                    disabled={!employee.form_completed || !employee.documents_verified}
                    className={`px-4 py-2 rounded-md text-sm font-medium ${
                      employee.form_completed && employee.documents_verified
                        ? 'bg-green-600 text-white hover:bg-green-700'
                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    }`}
                  >
                    {employee.form_completed && employee.documents_verified 
                      ? '🔓 Approve & Request IT' 
                      : '⏳ Waiting for Data'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Review Modal */}
      {reviewModal && selectedEmployee && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  🔓 Approve Compliance & Request IT Provisioning
                </h3>
                <button
                  onClick={() => setReviewModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                <h4 className="font-medium text-yellow-900 mb-2">🔄 Gatekeeper Model</h4>
                <p className="text-sm text-yellow-800">
                  By approving this compliance review, you will:
                  <br />• Lock the employee's form data (no further edits)
                  <br />• Create an IT provisioning ticket with verified information
                  <br />• Trigger email, VPN, and hardware provisioning
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Verified Full Name</label>
                  <input
                    type="text"
                    value={approvalData.verified_full_name}
                    onChange={(e) => setApprovalData({...approvalData, verified_full_name: e.target.value})}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Email Prefix (for company email)</label>
                  <div className="mt-1 flex">
                    <input
                      type="text"
                      value={approvalData.verified_email_prefix}
                      onChange={(e) => setApprovalData({...approvalData, verified_email_prefix: e.target.value})}
                      className="block w-full border border-gray-300 rounded-l-md px-3 py-2"
                    />
                    <span className="inline-flex items-center px-3 py-2 border border-l-0 border-gray-300 bg-gray-50 text-gray-500 rounded-r-md">
                      @company.com
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Verified Department</label>
                    <input
                      type="text"
                      value={approvalData.verified_department}
                      onChange={(e) => setApprovalData({...approvalData, verified_department: e.target.value})}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Verified Position</label>
                    <input
                      type="text"
                      value={approvalData.verified_position}
                      onChange={(e) => setApprovalData({...approvalData, verified_position: e.target.value})}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">IT Ticket Priority</label>
                  <select
                    value={approvalData.priority}
                    onChange={(e) => setApprovalData({...approvalData, priority: e.target.value})}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  >
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Review Notes</label>
                  <textarea
                    value={approvalData.review_notes}
                    onChange={(e) => setApprovalData({...approvalData, review_notes: e.target.value})}
                    rows={3}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                    placeholder="Optional notes about the approval..."
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setReviewModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleApproveAndRequestIT}
                  className="px-4 py-2 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-700"
                >
                  🔓 Approve & Request IT Provisioning
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}