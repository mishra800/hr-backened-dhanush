import { useState, useEffect } from 'react';
import api from '../../api/axios';

export default function ITProvisioningDashboard() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [processingModal, setProcessingModal] = useState(false);

  useEffect(() => {
    fetchTickets();
  }, []);

  const fetchTickets = async () => {
    try {
      setLoading(true);
      const response = await api.get('/onboarding/it-tickets?status=open');
      setTickets(response.data);
    } catch (err) {
      console.error('Error fetching IT tickets:', err);
    } finally {
      setLoading(false);
    }
  };

  const openProcessingModal = (ticket) => {
    setSelectedTicket(ticket);
    setProcessingModal(true);
  };

  const handleProcessTicket = async () => {
    try {
      const response = await api.post(`/onboarding/process-it-ticket/${selectedTicket.id}`);
      
      if (response.data.success) {
        alert(`✅ IT resources provisioned successfully for ${selectedTicket.verified_full_name}!`);
        setProcessingModal(false);
        fetchTickets(); // Refresh the list
      } else {
        alert('Error: ' + response.data.message);
      }
    } catch (err) {
      console.error('Error processing ticket:', err);
      alert('Error processing ticket: ' + (err.response?.data?.detail || err.message));
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'normal': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTicketAge = (createdAt) => {
    const created = new Date(createdAt);
    const now = new Date();
    const diffHours = Math.floor((now - created) / (1000 * 60 * 60));
    
    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${Math.floor(diffHours / 24)}d ago`;
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-20 bg-gray-200 rounded"></div>
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
          🎫 IT Provisioning Dashboard
        </h2>
        <p className="text-sm text-gray-600 mt-1">
          Process IT resource requests for approved employees
        </p>
      </div>

      {tickets.length === 0 ? (
        <div className="p-6 text-center">
          <div className="text-gray-400 text-6xl mb-4">🎯</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Open Tickets</h3>
          <p className="text-gray-500">All IT provisioning requests have been processed.</p>
        </div>
      ) : (
        <div className="divide-y divide-gray-200">
          {tickets.map((ticket) => (
            <div key={ticket.id} className="p-6 hover:bg-gray-50">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center">
                    <h3 className="text-lg font-medium text-gray-900">
                      {ticket.verified_full_name}
                    </h3>
                    <span className={`ml-3 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(ticket.priority)}`}>
                      {ticket.priority.toUpperCase()} PRIORITY
                    </span>
                    <span className="ml-2 text-sm text-gray-500">
                      Ticket #{ticket.ticket_number}
                    </span>
                  </div>
                  
                  <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
                    <div>
                      <span className="font-medium">Department:</span> {ticket.verified_department}
                    </div>
                    <div>
                      <span className="font-medium">Position:</span> {ticket.verified_position}
                    </div>
                    <div>
                      <span className="font-medium">Email:</span> {ticket.verified_email_prefix}@company.com
                    </div>
                    <div>
                      <span className="font-medium">Created:</span> {getTicketAge(ticket.created_at)}
                    </div>
                  </div>

                  <div className="mt-4 bg-gray-50 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-gray-900 mb-3">Resources to Provision:</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div className="flex items-center text-sm">
                        <span className="text-blue-600 mr-2">📧</span>
                        Company Email
                      </div>
                      <div className="flex items-center text-sm">
                        <span className="text-green-600 mr-2">🔐</span>
                        VPN Access
                      </div>
                      <div className="flex items-center text-sm">
                        <span className="text-purple-600 mr-2">🏢</span>
                        Access Card
                      </div>
                      <div className="flex items-center text-sm">
                        <span className="text-orange-600 mr-2">💻</span>
                        Hardware Assets
                      </div>
                    </div>
                  </div>
                </div>

                <div className="ml-4">
                  <button
                    onClick={() => openProcessingModal(ticket)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700"
                  >
                    🚀 Process Ticket
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Processing Modal */}
      {processingModal && selectedTicket && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  🚀 Process IT Provisioning Ticket
                </h3>
                <button
                  onClick={() => setProcessingModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <h4 className="font-medium text-blue-900 mb-2">📋 Ticket Details</h4>
                <div className="text-sm text-blue-800 space-y-1">
                  <p><strong>Employee:</strong> {selectedTicket.verified_full_name}</p>
                  <p><strong>Ticket:</strong> #{selectedTicket.ticket_number}</p>
                  <p><strong>Email:</strong> {selectedTicket.verified_email_prefix}@company.com</p>
                  <p><strong>Department:</strong> {selectedTicket.verified_department}</p>
                  <p><strong>Position:</strong> {selectedTicket.verified_position}</p>
                </div>
              </div>

              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                <h4 className="font-medium text-green-900 mb-3">✅ Resources to be Provisioned</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-green-800">
                  <div className="flex items-center">
                    <span className="text-blue-600 mr-2">📧</span>
                    <div>
                      <p className="font-medium">Company Email Account</p>
                      <p className="text-xs">{selectedTicket.verified_email_prefix}@company.com</p>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <span className="text-green-600 mr-2">🔐</span>
                    <div>
                      <p className="font-medium">VPN Credentials</p>
                      <p className="text-xs">OpenVPN with 1-year validity</p>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <span className="text-purple-600 mr-2">🏢</span>
                    <div>
                      <p className="font-medium">Access Card</p>
                      <p className="text-xs">Standard level, main building</p>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <span className="text-orange-600 mr-2">💻</span>
                    <div>
                      <p className="font-medium">Hardware Assets</p>
                      <p className="text-xs">Laptop, monitor, keyboard, mouse</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                <h4 className="font-medium text-yellow-900 mb-2">⚠️ Important Notes</h4>
                <ul className="text-sm text-yellow-800 space-y-1">
                  <li>• Employee credentials will be sent to their personal email</li>
                  <li>• Access card will be marked for physical delivery</li>
                  <li>• Hardware assets will be assigned and logged</li>
                  <li>• Employee will be notified when resources are ready</li>
                </ul>
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setProcessingModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleProcessTicket}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700"
                >
                  🚀 Provision All Resources
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}