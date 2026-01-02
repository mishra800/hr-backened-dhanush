import { useState, useEffect } from 'react';
import api from '../../api/axios';

export default function InfrastructureSetupModal({ request, onClose, onComplete }) {
  const [requestDetails, setRequestDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeStep, setActiveStep] = useState('laptop');
  const [completionNotes, setCompletionNotes] = useState('');
  const [showCompletion, setShowCompletion] = useState(false);

  const setupSteps = [
    { id: 'laptop', name: 'Laptop Setup', icon: '💻', required: true },
    { id: 'email', name: 'Email Setup', icon: '📧', required: true },
    { id: 'wifi', name: 'WiFi Setup', icon: '📶', required: true },
    { id: 'id_card', name: 'ID Card', icon: '🆔', required: true },
    { id: 'biometric', name: 'Biometric', icon: '👆', required: true }
  ];

  useEffect(() => {
    fetchRequestDetails();
    startSetupIfNeeded();
  }, [request.id]);

  const fetchRequestDetails = async () => {
    try {
      const response = await api.get(`/infrastructure/requests/${request.id}`);
      setRequestDetails(response.data);
      
      // Check if all items are completed
      if (response.data.progress === 100) {
        setShowCompletion(true);
      }
    } catch (error) {
      console.error('Error fetching request details:', error);
    } finally {
      setLoading(false);
    }
  };

  const startSetupIfNeeded = async () => {
    if (request.status === 'assigned') {
      try {
        await api.post(`/infrastructure/requests/${request.id}/start`);
      } catch (error) {
        console.error('Error starting setup:', error);
      }
    }
  };

  const handleStepUpdate = async (stepId, completed, photo, additionalInfo = '') => {
    try {
      const formData = new FormData();
      formData.append('setup_type', stepId);
      formData.append('completed', completed);
      if (additionalInfo) {
        formData.append('additional_info', additionalInfo);
      }
      if (photo) {
        formData.append('photo', photo);
      }

      await api.post(`/infrastructure/requests/${request.id}/update-progress`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      // Refresh request details
      await fetchRequestDetails();
      
      // Move to next step if this one is completed
      if (completed) {
        const currentIndex = setupSteps.findIndex(step => step.id === stepId);
        if (currentIndex < setupSteps.length - 1) {
          setActiveStep(setupSteps[currentIndex + 1].id);
        } else {
          setShowCompletion(true);
        }
      }
    } catch (error) {
      console.error('Error updating step:', error);
    }
  };

  const handleCompleteSetup = async (completionPhoto, handoverPhoto) => {
    try {
      const formData = new FormData();
      formData.append('completion_notes', completionNotes);
      if (completionPhoto) {
        formData.append('completion_photo', completionPhoto);
      }
      if (handoverPhoto) {
        formData.append('handover_photo', handoverPhoto);
      }

      await api.post(`/infrastructure/requests/${request.id}/complete`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      onComplete();
    } catch (error) {
      console.error('Error completing setup:', error);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2">Loading setup details...</span>
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
            Infrastructure Setup - {requestDetails?.employee_name}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl"
          >
            ×
          </button>
        </div>

        <div className="p-6">
          {/* Employee Info */}
          <div className="bg-blue-50 p-4 rounded-lg mb-6">
            <h3 className="font-semibold text-blue-900 mb-2">Employee Information</h3>
            <p className="text-blue-800">
              <strong>Name:</strong> {requestDetails?.employee_name}
            </p>
            <p className="text-blue-800">
              <strong>Ticket:</strong> {requestDetails?.ticket_number}
            </p>
            <p className="text-blue-800">
              <strong>Progress:</strong> {requestDetails?.progress}% Complete
            </p>
          </div>

          {!showCompletion ? (
            <>
              {/* Step Navigation */}
              <div className="flex justify-center mb-6">
                <div className="flex space-x-4">
                  {setupSteps.map((step, index) => {
                    const isCompleted = requestDetails?.[`${step.id}_${step.id === 'id_card' ? 'provided' : step.id === 'biometric' ? 'setup_completed' : step.id === 'laptop' ? 'provided' : 'setup_completed'}`];
                    const isActive = activeStep === step.id;
                    
                    return (
                      <button
                        key={step.id}
                        onClick={() => setActiveStep(step.id)}
                        className={`flex flex-col items-center p-3 rounded-lg border-2 transition-all ${
                          isCompleted ? 'border-green-500 bg-green-50' :
                          isActive ? 'border-blue-500 bg-blue-50' :
                          'border-gray-300 bg-white hover:border-gray-400'
                        }`}
                      >
                        <span className="text-2xl mb-1">{step.icon}</span>
                        <span className={`text-xs font-medium ${
                          isCompleted ? 'text-green-700' :
                          isActive ? 'text-blue-700' :
                          'text-gray-600'
                        }`}>
                          {step.name}
                        </span>
                        {isCompleted && (
                          <span className="text-green-600 text-xs mt-1">✓</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Active Step Content */}
              <div className="bg-white border rounded-lg p-6">
                <SetupStepContent
                  step={setupSteps.find(s => s.id === activeStep)}
                  requestDetails={requestDetails}
                  onUpdate={handleStepUpdate}
                />
              </div>
            </>
          ) : (
            /* Completion Form */
            <CompletionForm
              completionNotes={completionNotes}
              setCompletionNotes={setCompletionNotes}
              onComplete={handleCompleteSetup}
              requestDetails={requestDetails}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// Individual Step Content Component
function SetupStepContent({ step, requestDetails, onUpdate }) {
  const [photo, setPhoto] = useState(null);
  const [additionalInfo, setAdditionalInfo] = useState('');
  const [uploading, setUploading] = useState(false);

  const isCompleted = requestDetails?.[`${step.id}_${step.id === 'id_card' ? 'provided' : step.id === 'biometric' ? 'setup_completed' : step.id === 'laptop' ? 'provided' : 'setup_completed'}`];
  const existingPhoto = requestDetails?.[`${step.id}_photo_url`];

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setPhoto(file);
    }
  };

  const handleSubmit = async () => {
    if (!photo && !isCompleted) {
      alert('Please take a photo to document the setup');
      return;
    }

    setUploading(true);
    try {
      await onUpdate(step.id, true, photo, additionalInfo);
      setPhoto(null);
      setAdditionalInfo('');
    } finally {
      setUploading(false);
    }
  };

  const getStepInstructions = (stepId) => {
    const instructions = {
      laptop: 'Provide laptop to employee and take a photo showing the laptop with employee. Enter serial number.',
      email: 'Set up company email account and take a screenshot of the email setup. Enter the email address.',
      wifi: 'Configure WiFi access and take a photo of successful connection.',
      id_card: 'Provide ID card to employee and take a photo of the card. Enter card number.',
      biometric: 'Set up biometric access (fingerprint/face) and take a photo of the setup process.'
    };
    return instructions[stepId] || 'Complete this setup step and document with a photo.';
  };

  return (
    <div>
      <div className="flex items-center mb-4">
        <span className="text-3xl mr-3">{step.icon}</span>
        <div>
          <h3 className="text-xl font-semibold text-gray-900">{step.name}</h3>
          <p className="text-sm text-gray-600">{getStepInstructions(step.id)}</p>
        </div>
        {isCompleted && (
          <span className="ml-auto text-green-600 text-2xl">✅</span>
        )}
      </div>

      {existingPhoto && (
        <div className="mb-4">
          <p className="text-sm font-medium text-gray-700 mb-2">Existing Photo:</p>
          <img 
            src={existingPhoto} 
            alt={`${step.name} setup`}
            className="max-w-xs rounded border"
          />
        </div>
      )}

      {!isCompleted && (
        <div className="space-y-4">
          {/* Additional Info Input */}
          {(step.id === 'laptop' || step.id === 'email' || step.id === 'id_card') && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {step.id === 'laptop' ? 'Serial Number' : 
                 step.id === 'email' ? 'Email Address' : 'Card Number'}
              </label>
              <input
                type="text"
                value={additionalInfo}
                onChange={(e) => setAdditionalInfo(e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2"
                placeholder={`Enter ${step.id === 'laptop' ? 'laptop serial number' : 
                            step.id === 'email' ? 'created email address' : 'ID card number'}`}
              />
            </div>
          )}

          {/* Photo Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Take Photo *
            </label>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handlePhotoChange}
              className="w-full border border-gray-300 rounded px-3 py-2"
            />
            {photo && (
              <p className="text-sm text-green-600 mt-1">
                Photo selected: {photo.name}
              </p>
            )}
          </div>

          {/* Submit Button */}
          <button
            onClick={handleSubmit}
            disabled={uploading}
            className="w-full bg-green-600 text-white py-2 px-4 rounded hover:bg-green-700 disabled:opacity-50"
          >
            {uploading ? 'Uploading...' : `Complete ${step.name}`}
          </button>
        </div>
      )}

      {isCompleted && (
        <div className="bg-green-50 border border-green-200 rounded p-3">
          <p className="text-green-800 font-medium">✅ {step.name} completed successfully!</p>
          {requestDetails?.[`${step.id}_serial_number`] && (
            <p className="text-green-700 text-sm">Serial: {requestDetails[`${step.id}_serial_number`]}</p>
          )}
          {requestDetails?.[`email_address_created`] && step.id === 'email' && (
            <p className="text-green-700 text-sm">Email: {requestDetails.email_address_created}</p>
          )}
          {requestDetails?.[`id_card_number`] && step.id === 'id_card' && (
            <p className="text-green-700 text-sm">Card: {requestDetails.id_card_number}</p>
          )}
        </div>
      )}
    </div>
  );
}

// Completion Form Component
function CompletionForm({ completionNotes, setCompletionNotes, onComplete, requestDetails }) {
  const [completionPhoto, setCompletionPhoto] = useState(null);
  const [handoverPhoto, setHandoverPhoto] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!completionNotes.trim()) {
      alert('Please provide completion notes');
      return;
    }

    setSubmitting(true);
    try {
      await onComplete(completionPhoto, handoverPhoto);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <h3 className="text-lg font-semibold text-green-900 mb-2">🎉 Setup Complete!</h3>
        <p className="text-green-800">All required infrastructure items have been set up successfully.</p>
      </div>

      {/* Summary */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h4 className="font-medium text-gray-900 mb-3">Setup Summary</h4>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center">
            <span className="text-green-600 mr-2">✅</span>
            <span>Laptop Provided</span>
          </div>
          <div className="flex items-center">
            <span className="text-green-600 mr-2">✅</span>
            <span>Email Setup Complete</span>
          </div>
          <div className="flex items-center">
            <span className="text-green-600 mr-2">✅</span>
            <span>WiFi Access Configured</span>
          </div>
          <div className="flex items-center">
            <span className="text-green-600 mr-2">✅</span>
            <span>ID Card Provided</span>
          </div>
          <div className="flex items-center">
            <span className="text-green-600 mr-2">✅</span>
            <span>Biometric Setup Complete</span>
          </div>
        </div>
      </div>

      {/* Completion Notes */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Completion Notes *
        </label>
        <textarea
          value={completionNotes}
          onChange={(e) => setCompletionNotes(e.target.value)}
          rows={4}
          className="w-full border border-gray-300 rounded px-3 py-2"
          placeholder="Provide details about the setup completion, any issues encountered, and instructions given to the employee..."
        />
      </div>

      {/* Final Photos */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Setup Completion Photo
          </label>
          <input
            type="file"
            accept="image/*"
            capture="environment"
            onChange={(e) => setCompletionPhoto(e.target.files[0])}
            className="w-full border border-gray-300 rounded px-3 py-2"
          />
          <p className="text-xs text-gray-500 mt-1">Photo showing all equipment set up</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Employee Handover Photo
          </label>
          <input
            type="file"
            accept="image/*"
            capture="environment"
            onChange={(e) => setHandoverPhoto(e.target.files[0])}
            className="w-full border border-gray-300 rounded px-3 py-2"
          />
          <p className="text-xs text-gray-500 mt-1">Photo with employee receiving equipment</p>
        </div>
      </div>

      {/* Submit Button */}
      <button
        onClick={handleSubmit}
        disabled={submitting}
        className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
      >
        {submitting ? 'Completing Setup...' : 'Complete Infrastructure Setup'}
      </button>
    </div>
  );
}