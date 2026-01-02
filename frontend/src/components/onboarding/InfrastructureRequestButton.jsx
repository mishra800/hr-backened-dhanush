import { useState } from 'react';
import api from '../../api/axios';

export default function InfrastructureRequestButton({ employee, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [requested, setRequested] = useState(false);

  const handleRequestInfrastructure = async () => {
    try {
      setLoading(true);
      
      const response = await api.post(`/onboarding/request-infrastructure/${employee.id}`);
      
      if (response.data.success) {
        setRequested(true);
        if (onSuccess) {
          onSuccess(response.data);
        }
        
        // Show detailed success message with specific items
        alert(`✅ Infrastructure setup requested successfully!

📋 Ticket: ${response.data.ticket_number}

📨 Request sent to Assets Team with the following items:
💻 Laptop - Provide company laptop with setup
📧 Email Setup - Create company email account  
📶 WiFi Setup - Configure network access
🆔 ID Card - Issue employee access card
👆 Biometric Setup - Enroll fingerprint/face recognition

The Assets Team will provide each item with photo documentation and notify you when complete.`);
      }
    } catch (error) {
      console.error('Error requesting infrastructure:', error);
      alert(error.response?.data?.detail || 'Failed to request infrastructure setup');
    } finally {
      setLoading(false);
    }
  };

  if (requested) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="flex items-center">
          <span className="text-green-600 text-xl mr-3">✅</span>
          <div>
            <p className="text-green-800 font-medium">Infrastructure Setup Requested</p>
            <p className="text-green-700 text-sm">Assets team has been notified with detailed requirements and will provide photo documentation</p>
          </div>
        </div>
        
        <div className="mt-3 grid grid-cols-2 md:grid-cols-5 gap-2 text-xs">
          <div className="flex items-center text-green-700 bg-green-100 px-2 py-1 rounded">
            <span className="mr-1">💻</span>
            <span>Laptop</span>
          </div>
          <div className="flex items-center text-green-700 bg-green-100 px-2 py-1 rounded">
            <span className="mr-1">📧</span>
            <span>Email Setup</span>
          </div>
          <div className="flex items-center text-green-700 bg-green-100 px-2 py-1 rounded">
            <span className="mr-1">📶</span>
            <span>WiFi Access</span>
          </div>
          <div className="flex items-center text-green-700 bg-green-100 px-2 py-1 rounded">
            <span className="mr-1">🆔</span>
            <span>ID Card</span>
          </div>
          <div className="flex items-center text-green-700 bg-green-100 px-2 py-1 rounded">
            <span className="mr-1">👆</span>
            <span>Biometric</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <span className="text-blue-600 text-xl mr-3">🏗️</span>
          <div>
            <p className="text-blue-800 font-medium">Provide Infrastructure to New Employee</p>
            <p className="text-blue-700 text-sm">
              Send detailed request to Assets Team for complete infrastructure setup
            </p>
          </div>
        </div>
        <button
          onClick={handleRequestInfrastructure}
          disabled={loading}
          className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
        >
          {loading ? 'Requesting...' : 'Request Infrastructure'}
        </button>
      </div>
      
      <div className="mt-3 p-3 bg-blue-100 rounded-lg">
        <p className="text-sm text-blue-800 font-medium mb-2">📋 This will request the following items:</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-blue-700">
          <div className="flex items-center">
            <span className="mr-2">💻</span>
            <span><strong>Laptop:</strong> Company laptop with software setup</span>
          </div>
          <div className="flex items-center">
            <span className="mr-2">📧</span>
            <span><strong>Email:</strong> Company email account creation</span>
          </div>
          <div className="flex items-center">
            <span className="mr-2">📶</span>
            <span><strong>WiFi:</strong> Network access configuration</span>
          </div>
          <div className="flex items-center">
            <span className="mr-2">🆔</span>
            <span><strong>ID Card:</strong> Employee access card</span>
          </div>
          <div className="flex items-center">
            <span className="mr-2">👆</span>
            <span><strong>Biometric:</strong> Fingerprint/face enrollment</span>
          </div>
        </div>
        <p className="text-xs text-blue-600 mt-2 font-medium">
          ✅ Assets Team will provide each item with photo documentation and notify when complete
        </p>
      </div>
    </div>
  );
}