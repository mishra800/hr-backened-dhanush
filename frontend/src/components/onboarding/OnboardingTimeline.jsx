import { useState, useEffect } from 'react';
import api from '../../api/axios';

export default function OnboardingTimeline({ employeeId, onClose }) {
  const [timeline, setTimeline] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (employeeId) {
      fetchTimeline();
    }
  }, [employeeId]);

  const fetchTimeline = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/onboarding/timeline/${employeeId}`);
      setTimeline(response.data);
    } catch (err) {
      console.error('Error fetching timeline:', err);
      setError('Failed to load timeline');
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
            <span className="ml-2">Loading timeline...</span>
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
          <h2 className="text-2xl font-bold text-gray-900">
            Onboarding Timeline - {timeline?.employee_name}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl"
          >
            ×
          </button>
        </div>

        <div className="p-6">
          {timeline?.timeline && timeline.timeline.length > 0 ? (
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gray-200"></div>
              
              <div className="space-y-6">
                {timeline.timeline.map((event, index) => (
                  <div key={index} className="relative flex items-start">
                    {/* Timeline dot */}
                    <div className={`relative z-10 flex items-center justify-center w-16 h-16 rounded-full text-2xl ${getEventColor(event.type, event.status)}`}>
                      {event.icon}
                    </div>
                    
                    {/* Event content */}
                    <div className="ml-6 flex-1">
                      <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="text-lg font-semibold text-gray-900">{event.event}</h3>
                          <span className="text-sm text-gray-500">
                            {new Date(event.date).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-gray-600">{event.description}</p>
                        
                        {event.status && (
                          <div className="mt-2">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(event.status)}`}>
                              {event.status}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500">No timeline events found.</p>
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

function getEventColor(type, status) {
  if (type === 'milestone') {
    return 'bg-blue-100 text-blue-600';
  }
  
  if (type === 'it_provisioning') {
    return status === 'success' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600';
  }
  
  if (type === 'document') {
    return status === 'verified' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600';
  }
  
  return 'bg-gray-100 text-gray-600';
}

function getStatusColor(status) {
  const colors = {
    success: 'bg-green-100 text-green-800',
    verified: 'bg-green-100 text-green-800',
    failed: 'bg-red-100 text-red-800',
    rejected: 'bg-red-100 text-red-800',
    pending: 'bg-yellow-100 text-yellow-800'
  };
  
  return colors[status] || 'bg-gray-100 text-gray-800';
}