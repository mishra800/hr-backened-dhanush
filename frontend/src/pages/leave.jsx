import { useState, useEffect } from 'react';
import api from '../api/axios';
import { useAuth } from '../context/authcontext';

export default function Leave() {
  const { user } = useAuth();
  const [leaves, setLeaves] = useState([]);
  const [balances, setBalances] = useState([]);
  const [holidays, setHolidays] = useState([]);
  const [pendingLeaves, setPendingLeaves] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [employeeId, setEmployeeId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [newLeave, setNewLeave] = useState({
    start_date: '',
    end_date: '',
    reason: ''
  });
  
  const isManager = user && ['admin', 'hr', 'manager'].includes(user.role);

  useEffect(() => {
    if (user) {
      fetchEmployeeId();
    }
  }, [user]);

  const fetchEmployeeId = async () => {
    try {
      const response = await api.get('/users/me/profile');
      if (response.data && response.data.id) {
        setEmployeeId(response.data.id);
      } else {
        console.error('No employee ID found in profile response');
        // Fallback: try to get user ID directly
        const userResponse = await api.get('/users/me');
        if (userResponse.data && userResponse.data.id) {
          setEmployeeId(userResponse.data.id);
        }
      }
      setLoading(false);
    } catch (error) {
      console.error('Error fetching employee profile:', error);
      // Try fallback approach
      try {
        const userResponse = await api.get('/users/me');
        if (userResponse.data && userResponse.data.id) {
          setEmployeeId(userResponse.data.id);
        }
      } catch (fallbackError) {
        console.error('Fallback also failed:', fallbackError);
      }
      setLoading(false);
    }
  };

  useEffect(() => {
    if (employeeId) {
      fetchData();
    }
  }, [employeeId]);

  const fetchData = async () => {
    try {
      setError(''); // Clear any previous errors
      const requests = [
        api.get(`/leave/employee/${employeeId}`),
        api.get(`/leave/balances/${employeeId}`),
        api.get(`/leave/holidays`)
      ];
      
      // Add pending leaves request for managers
      if (isManager) {
        requests.push(api.get('/leave/pending'));
      }
      
      const responses = await Promise.all(requests);
      setLeaves(responses[0].data || []);
      setBalances(responses[1].data || []);
      setHolidays(responses[2].data || []);
      
      if (isManager && responses[3]) {
        setPendingLeaves(responses[3].data || []);
      }
    } catch (error) {
      console.error('Error fetching leave data:', error);
      setError('Unable to load leave data. Please check your connection and try again.');
      // Set empty arrays to prevent UI errors
      setLeaves([]);
      setBalances([]);
      setHolidays([]);
      setPendingLeaves([]);
    }
  };
  
  const handleApprove = async (leaveId) => {
    try {
      await api.put(`/leave/approve/${leaveId}`);
      alert('Leave approved successfully!');
      fetchData();
    } catch (error) {
      console.error('Error approving leave:', error);
      alert('Failed to approve leave.');
    }
  };
  
  const handleReject = async (leaveId) => {
    try {
      await api.put(`/leave/reject/${leaveId}`);
      alert('Leave rejected successfully!');
      fetchData();
    } catch (error) {
      console.error('Error rejecting leave:', error);
      alert('Failed to reject leave.');
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewLeave(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Convert datetime-local format to ISO format for backend
      const payload = {
        start_date: new Date(newLeave.start_date).toISOString(),
        end_date: new Date(newLeave.end_date).toISOString(),
        reason: newLeave.reason
      };
      await api.post(`/leave/request/${employeeId}`, payload);
      setShowForm(false);
      setNewLeave({ start_date: '', end_date: '', reason: '' });
      fetchData(); // Refresh all
      alert("Leave requested successfully!");
    } catch (error) {
      console.error('Error requesting leave:', error);
      alert("Failed to request leave.");
    }
  };

  if (loading || !employeeId) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Leave & Holidays</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-primary text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 shadow-sm"
        >
          {showForm ? 'Cancel Request' : '+ Request Leave'}
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-800">{error}</p>
              <button
                onClick={() => {
                  setError('');
                  if (employeeId) fetchData();
                }}
                className="mt-2 text-sm text-red-600 hover:text-red-500 underline"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        {/* Leave Balances */}
        <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-4">
          {balances.map((b) => (
            <div key={b.id} className="bg-white overflow-hidden shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <dt className="text-sm font-medium text-gray-500 truncate">{b.leave_type}</dt>
                <dd className="mt-1 text-3xl font-semibold text-gray-900">{b.balance}</dd>
                <dd className="text-xs text-green-600 mt-1">Available Days</dd>
              </div>
            </div>
          ))}
        </div>

        {/* Upcoming Holidays */}
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Upcoming Holidays</h3>
          <ul className="space-y-4">
            {holidays.slice(0, 3).map((h) => (
              <li key={h.id} className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">{h.name}</p>
                  <p className="text-xs text-gray-500">{new Date(h.date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                </div>
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                  {h.type}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Manager Approval Section */}
      {isManager && pendingLeaves.length > 0 && (
        <div className="bg-white shadow overflow-hidden sm:rounded-lg mb-8">
          <div className="px-4 py-5 sm:px-6 border-b border-gray-200 bg-orange-50">
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              Pending Leave Approvals ({pendingLeaves.length})
            </h3>
            <p className="mt-1 text-sm text-gray-500">Review and approve/reject leave requests from your team</p>
          </div>
          <ul className="divide-y divide-gray-200">
            {pendingLeaves.map((leave) => (
              <li key={leave.id} className="px-4 py-4 sm:px-6 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-gray-900">
                        {leave.employee?.first_name} {leave.employee?.last_name}
                      </p>
                      <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                        Pending
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {leave.employee?.department} • {leave.employee?.position}
                    </p>
                    <p className="text-sm text-primary mt-2">
                      {new Date(leave.start_date).toLocaleDateString()} - {new Date(leave.end_date).toLocaleDateString()}
                      <span className="text-gray-500 ml-2">
                        ({Math.ceil((new Date(leave.end_date) - new Date(leave.start_date)) / (1000 * 60 * 60 * 24)) + 1} days)
                      </span>
                    </p>
                    <p className="text-sm text-gray-600 mt-1">
                      <span className="font-medium">Reason:</span> {leave.reason}
                    </p>
                    <p className="text-xs text-gray-400 mt-2">
                      Requested on: {new Date(leave.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="ml-4 flex space-x-2">
                    <button
                      onClick={() => handleApprove(leave.id)}
                      className="bg-green-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-green-700"
                    >
                      ✓ Approve
                    </button>
                    <button
                      onClick={() => handleReject(leave.id)}
                      className="bg-red-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-red-700"
                    >
                      ✗ Reject
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {showForm && (
        <div className="bg-white shadow sm:rounded-lg mb-8 p-6 border-l-4 border-primary">
          <h2 className="text-lg font-medium text-gray-900 mb-4">New Leave Request</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700">Start Date</label>
                <input
                  type="datetime-local"
                  name="start_date"
                  value={newLeave.start_date}
                  onChange={handleInputChange}
                  required
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">End Date</label>
                <input
                  type="datetime-local"
                  name="end_date"
                  value={newLeave.end_date}
                  onChange={handleInputChange}
                  required
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary focus:border-primary"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Reason</label>
              <textarea
                name="reason"
                value={newLeave.reason}
                onChange={handleInputChange}
                required
                rows={3}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary focus:border-primary"
                placeholder="e.g. Family vacation, Medical emergency..."
              />
            </div>
            <div className="flex justify-end">
              <button
                type="submit"
                className="bg-primary text-white px-6 py-2 rounded-md text-sm font-medium hover:bg-blue-700"
              >
                Submit Request
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
          <h3 className="text-lg leading-6 font-medium text-gray-900">My Leave History</h3>
        </div>
        <ul className="divide-y divide-gray-200">
          {leaves.map((leave) => (
            <li key={leave.id} className="px-4 py-4 sm:px-6 hover:bg-gray-50">
              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <p className="text-sm font-medium text-primary">
                    {new Date(leave.start_date).toLocaleDateString()} - {new Date(leave.end_date).toLocaleDateString()}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">{leave.reason}</p>
                </div>
                <div className="flex items-center">
                  <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${leave.status === 'approved' ? 'bg-green-100 text-green-800' :
                      leave.status === 'rejected' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                    }`}>
                    {leave.status.charAt(0).toUpperCase() + leave.status.slice(1)}
                  </span>
                </div>
              </div>
              <div className="mt-2 text-xs text-gray-400">
                Requested on: {new Date(leave.created_at).toLocaleDateString()}
              </div>
            </li>
          ))}
          {leaves.length === 0 && (
            <li className="px-4 py-8 text-center text-gray-500">
              No leave requests found.
            </li>
          )}
        </ul>
      </div>
    </div>
  );
}
