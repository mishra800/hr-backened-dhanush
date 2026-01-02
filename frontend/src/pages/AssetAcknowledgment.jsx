import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/authcontext';
import AssetAcknowledgmentForm from '../components/assets/AssetAcknowledgmentForm';

const AssetAcknowledgment = () => {
  const { user } = useAuth();
  const [pendingSetup, setPendingSetup] = useState(null);
  const [acknowledgments, setAcknowledgments] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submissionResult, setSubmissionResult] = useState(null);

  useEffect(() => {
    checkPendingSetup();
    loadAcknowledments();
  }, []);

  const checkPendingSetup = async () => {
    try {
      const response = await fetch('/api/acknowledgments/check-pending', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setPendingSetup(data);
        if (data.has_pending) {
          setShowForm(true);
        }
      }
    } catch (error) {
      console.error('Error checking pending setup:', error);
    }
  };

  const loadAcknowledments = async () => {
    try {
      const response = await fetch('/api/acknowledgments/my-acknowledgments', {
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

  const handleSubmitAcknowledgment = async (formData) => {
    try {
      const response = await fetch('/api/acknowledgments/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        const result = await response.json();
        setSubmissionResult({
          success: true,
          message: result.message,
          referenceNumber: result.reference_number
        });
        setShowForm(false);
        loadAcknowledments();
        checkPendingSetup();
      } else {
        const error = await response.json();
        setSubmissionResult({
          success: false,
          message: error.detail || 'Failed to submit acknowledgment'
        });
      }
    } catch (error) {
      console.error('Error submitting acknowledgment:', error);
      setSubmissionResult({
        success: false,
        message: 'Network error occurred while submitting'
      });
    }
  };

  const getInitialFormData = () => {
    if (!pendingSetup?.setup_details) return null;
    
    const setup = pendingSetup.setup_details;
    return {
      laptop_received: setup.laptop_provided || false,
      email_received: setup.email_setup_completed || false,
      email_address: setup.email_address_created || '',
      wifi_access_received: setup.wifi_setup_completed || false,
      id_card_received: setup.id_card_provided || false,
      id_card_number: setup.id_card_number || '',
      biometric_setup_completed: setup.biometric_setup_completed || false
    };
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
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Asset Acknowledgment</h1>
          <p className="text-gray-600 mt-2">Confirm receipt of IT equipment and setup completion</p>
        </div>

        {/* Submission Result */}
        {submissionResult && (
          <div className={`mb-6 p-4 rounded-lg ${
            submissionResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
          }`}>
            <div className="flex items-center">
              <div className={`flex-shrink-0 ${
                submissionResult.success ? 'text-green-400' : 'text-red-400'
              }`}>
                {submissionResult.success ? (
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
              <div className="ml-3">
                <p className={`text-sm font-medium ${
                  submissionResult.success ? 'text-green-800' : 'text-red-800'
                }`}>
                  {submissionResult.message}
                </p>
                {submissionResult.referenceNumber && (
                  <p className="text-sm text-green-600 mt-1">
                    Reference Number: {submissionResult.referenceNumber}
                  </p>
                )}
              </div>
              <button
                onClick={() => setSubmissionResult(null)}
                className="ml-auto text-gray-400 hover:text-gray-600"
              >
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* Pending Setup Alert */}
        {pendingSetup?.has_pending && !showForm && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium text-blue-800">IT Setup Completed</h3>
                <p className="text-blue-600 mt-1">
                  Your IT infrastructure setup has been completed. Please fill out the acknowledgment form to confirm receipt of equipment and access.
                </p>
              </div>
              <button
                onClick={() => setShowForm(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Fill Acknowledgment Form
              </button>
            </div>
          </div>
        )}

        {/* Acknowledgment Form */}
        {showForm && (
          <div className="mb-8">
            <AssetAcknowledgmentForm
              onSubmit={handleSubmitAcknowledgment}
              onCancel={() => setShowForm(false)}
              initialData={getInitialFormData()}
            />
          </div>
        )}

        {/* Previous Acknowledgments */}
        {!showForm && (
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">My Acknowledgments</h2>
                {!pendingSetup?.has_pending && (
                  <button
                    onClick={() => setShowForm(true)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    New Acknowledgment
                  </button>
                )}
              </div>
            </div>
            
            <div className="p-6">
              {acknowledgments.length === 0 ? (
                <div className="text-center py-8">
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No acknowledgments</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    You haven't submitted any asset acknowledgments yet.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {acknowledgments.map((ack) => (
                    <div key={ack.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <h3 className="text-lg font-medium text-gray-900">
                            {ack.reference_number}
                          </h3>
                          <p className="text-sm text-gray-500">
                            Submitted on {new Date(ack.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex items-center space-x-2">
                          {getStatusBadge(ack.status, ack.review_status)}
                          {ack.has_issues && (
                            <span className="px-2 py-1 bg-orange-100 text-orange-800 rounded-full text-sm">
                              Has Issues
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <div className="text-sm text-gray-600">
                        <p><strong>Department:</strong> {ack.department}</p>
                        {ack.reviewed_at && (
                          <p><strong>Reviewed:</strong> {new Date(ack.reviewed_at).toLocaleDateString()}</p>
                        )}
                        {ack.reviewer_name && (
                          <p><strong>Reviewed by:</strong> {ack.reviewer_name}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AssetAcknowledgment;