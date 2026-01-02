import { useState, useEffect } from 'react';
import api from '../../api/axios';

export default function OnboardingProgress({ employeeId }) {
  const [progress, setProgress] = useState(null);
  const [complianceStatus, setComplianceStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (employeeId) {
      fetchProgress();
      fetchComplianceStatus();
    }
  }, [employeeId]);

  const fetchProgress = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/onboarding/progress/${employeeId}`);
      setProgress(response.data);
    } catch (err) {
      console.error('Error fetching progress:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchComplianceStatus = async () => {
    try {
      const response = await api.get(`/onboarding/compliance-status/${employeeId}`);
      setComplianceStatus(response.data);
    } catch (err) {
      console.error('Error fetching compliance status:', err);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-2 bg-gray-200 rounded w-full mb-4"></div>
          <div className="space-y-2">
            <div className="h-3 bg-gray-200 rounded w-3/4"></div>
            <div className="h-3 bg-gray-200 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!progress) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <p className="text-gray-500">Unable to load progress information.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Onboarding Progress - Gatekeeper Model</h3>
        <span className="text-2xl font-bold text-blue-600">{progress.completion_percentage}%</span>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-gray-200 rounded-full h-3 mb-6">
        <div
          className="bg-gradient-to-r from-blue-500 to-green-500 h-3 rounded-full transition-all duration-500"
          style={{ width: `${progress.completion_percentage}%` }}
        ></div>
      </div>

      {/* Employee Info */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-blue-50 p-4 rounded-lg">
          <p className="text-sm font-medium text-blue-900">Current Phase</p>
          <p className="text-lg font-bold text-blue-700">Phase {progress.current_phase}</p>
          <p className="text-xs text-blue-600">{progress.phase_name}</p>
        </div>

        <div className="bg-gray-50 p-4 rounded-lg">
          <p className="text-sm font-medium text-gray-900">Days Since Joining</p>
          <p className="text-lg font-bold text-gray-700">{progress.days_since_joining}</p>
          <p className="text-xs text-gray-600">
            {progress.is_immediate_joiner ? 'Immediate Joiner (Expedited)' : 'Standard Timeline'}
          </p>
        </div>

        <div className={`p-4 rounded-lg ${getComplianceStatusColor(progress.compliance_gate_status)}`}>
          <p className="text-sm font-medium">Compliance Gate</p>
          <p className="text-lg font-bold">{getComplianceStatusText(progress.compliance_gate_status)}</p>
          <p className="text-xs">
            {progress.form_data_locked ? '🔒 Data Locked' : '📝 Editable'}
          </p>
        </div>
      </div>

      {/* Gatekeeper Model Flow */}
      <div className="space-y-4">
        <h4 className="font-medium text-gray-900">Gatekeeper Flow Status</h4>
        
        {/* Phase 3: Compliance Gate */}
        <div className={`p-4 rounded-lg border-2 ${getPhaseStatusStyle(progress.current_phase, 3, progress.compliance_gate_status)}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <span className="text-2xl mr-3">
                {progress.current_phase > 3 || progress.compliance_gate_status === 'approved' ? '✅' : 
                 progress.current_phase === 3 ? '🔄' : '📋'}
              </span>
              <div>
                <p className="text-sm font-semibold text-gray-700">Phase 3: Compliance Gate</p>
                <p className="text-xs text-gray-500">Employee Info Form + Document Upload</p>
                {complianceStatus && (
                  <div className="mt-1 text-xs">
                    <span className={complianceStatus.form_completed ? 'text-green-600' : 'text-gray-500'}>
                      Form: {complianceStatus.form_completed ? 'Complete' : 'Pending'}
                    </span>
                    {' • '}
                    <span className={complianceStatus.documents_verified ? 'text-green-600' : 'text-gray-500'}>
                      Docs: {complianceStatus.documents_verified ? 'Verified' : 'Pending'}
                    </span>
                  </div>
                )}
              </div>
            </div>
            {progress.compliance_gate_status === 'approved' && (
              <div className="text-right">
                <p className="text-xs text-green-600 font-medium">✓ APPROVED</p>
                <p className="text-xs text-gray-500">Gate Passed</p>
              </div>
            )}
          </div>
        </div>

        {/* Phase 4: IT Fulfillment (Only after compliance approval) */}
        <div className={`p-4 rounded-lg border-2 ${getPhaseStatusStyle(progress.current_phase, 4, progress.it_provisioning_status)}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <span className="text-2xl mr-3">
                {progress.it_provisioning_status === 'completed' ? '✅' : 
                 progress.current_phase === 4 ? '🔄' : 
                 progress.compliance_gate_status === 'approved' ? '⏳' : '🔒'}
              </span>
              <div>
                <p className="text-sm font-semibold text-gray-700">Phase 4: IT Fulfillment</p>
                <p className="text-xs text-gray-500">Email, VPN, Access Card, Hardware</p>
                <p className="text-xs text-blue-600">
                  {progress.compliance_gate_status !== 'approved' ? 
                    '🔒 Locked until compliance approval' : 
                    `Status: ${progress.it_provisioning_status}`}
                </p>
              </div>
            </div>
            {progress.compliance_gate_status === 'approved' && (
              <div className="text-right">
                <p className="text-xs text-blue-600 font-medium">🎫 IT Ticket Created</p>
                <p className="text-xs text-gray-500">Resources Provisioning</p>
              </div>
            )}
          </div>
        </div>

        {/* Phase 5: Induction & Activation */}
        <div className={`p-4 rounded-lg border-2 ${getPhaseStatusStyle(progress.current_phase, 5, 'pending')}`}>
          <div className="flex items-center">
            <span className="text-2xl mr-3">
              {progress.current_phase >= 5 ? '✅' : 
               progress.it_provisioning_status === 'completed' ? '⏳' : '🔒'}
            </span>
            <div>
              <p className="text-sm font-semibold text-gray-700">Phase 5: Induction & Activation</p>
              <p className="text-xs text-gray-500">Training + Final Employee Activation</p>
              <p className="text-xs text-blue-600">
                {progress.it_provisioning_status !== 'completed' ? 
                  '🔒 Locked until IT provisioning complete' : 
                  'Ready for induction training'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Next Steps */}
      {progress.completion_percentage < 100 && (
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h4 className="font-medium text-blue-900 mb-2">Next Steps</h4>
          <div className="text-sm text-blue-800">
            {getNextStepsGatekeeper(progress, complianceStatus)}
          </div>
        </div>
      )}

      {/* Gatekeeper Model Explanation */}
      <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <h4 className="font-medium text-yellow-900 mb-2">🔄 Gatekeeper Model</h4>
        <p className="text-sm text-yellow-800">
          IT resources (email, VPN, hardware) are only provisioned <strong>after</strong> compliance approval. 
          This ensures company resources are only allocated to legally verified employees.
        </p>
      </div>
    </div>
  );
}

function getComplianceStatusColor(status) {
  switch (status) {
    case 'approved': return 'bg-green-50 text-green-900';
    case 'rejected': return 'bg-red-50 text-red-900';
    case 'pending': return 'bg-yellow-50 text-yellow-900';
    default: return 'bg-gray-50 text-gray-900';
  }
}

function getComplianceStatusText(status) {
  switch (status) {
    case 'approved': return 'Approved ✓';
    case 'rejected': return 'Rejected ✗';
    case 'pending': return 'Pending Review';
    default: return 'Not Started';
  }
}

function getPhaseStatusStyle(currentPhase, targetPhase, status) {
  if (currentPhase > targetPhase || status === 'approved' || status === 'completed') {
    return 'bg-green-50 border-green-200';
  } else if (currentPhase === targetPhase) {
    return 'bg-blue-50 border-blue-200';
  } else {
    return 'bg-gray-50 border-gray-200';
  }
}

function getNextStepsGatekeeper(progress, complianceStatus) {
  const { current_phase, compliance_gate_status, it_provisioning_status } = progress;
  
  if (current_phase === 1) {
    return "Sign your offer letter to proceed to Day 1 welcome.";
  }
  
  if (current_phase === 2) {
    return "Proceed to Phase 3: Complete your employee information form and upload required documents.";
  }
  
  if (current_phase === 3) {
    if (!complianceStatus?.form_completed) {
      return "Complete your employee information form (7 steps).";
    }
    if (!complianceStatus?.documents_verified) {
      return "Upload and verify your documents (PAN, Aadhaar, etc.).";
    }
    if (compliance_gate_status === 'pending') {
      return "Your data is under admin review. Please wait for compliance approval.";
    }
    return "Submit your completed form and documents for admin review.";
  }
  
  if (current_phase === 4) {
    if (it_provisioning_status === 'pending' || it_provisioning_status === 'requested') {
      return "IT team is provisioning your resources (email, VPN, hardware). Please wait.";
    }
    return "IT provisioning in progress. You'll receive credentials via personal email.";
  }
  
  if (current_phase === 5) {
    return "Complete induction training modules and await final activation.";
  }
  
  return "Onboarding complete! Welcome to the team.";
}