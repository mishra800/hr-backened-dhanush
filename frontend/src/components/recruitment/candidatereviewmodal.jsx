import { useState, useEffect } from 'react';
import api from '../../api/axios';
import ResumeViewer from './resumeviewer';

export default function CandidateReviewModal({ application, onClose, onStatusUpdate }) {
  const [loading, setLoading] = useState(false);
  const [scoreBreakdown, setScoreBreakdown] = useState(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [selectedStatus, setSelectedStatus] = useState(application?.status || 'applied');

  useEffect(() => {
    if (application) {
      fetchScoreBreakdown();
    }
  }, [application]);

  const fetchScoreBreakdown = async () => {
    try {
      const response = await api.get(`/recruitment/applications/${application.id}/score-breakdown`);
      setScoreBreakdown(response.data);
    } catch (error) {
      console.error('Error fetching score breakdown:', error);
    }
  };

  const handleStatusUpdate = async (newStatus) => {
    setLoading(true);
    try {
      await api.patch(`/recruitment/applications/${application.id}/status?status=${newStatus}`);
      
      // Add review notes if provided
      if (reviewNotes.trim()) {
        await api.post(`/recruitment/applications/${application.id}/notes`, {
          notes: reviewNotes,
          action: newStatus
        });
      }

      onStatusUpdate(application.id, newStatus);
      onClose();
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Failed to update candidate status');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'shortlisted': return 'bg-green-600 hover:bg-green-700';
      case 'rejected': return 'bg-red-600 hover:bg-red-700';
      case 'under_review': return 'bg-yellow-600 hover:bg-yellow-700';
      default: return 'bg-gray-600 hover:bg-gray-700';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'shortlisted': return 'Shortlist';
      case 'rejected': return 'Reject';
      case 'under_review': return 'Hold';
      default: return 'Update';
    }
  };

  if (!application) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-6xl h-[90vh] flex overflow-hidden shadow-2xl">
        
        {/* Left Panel - Candidate Info & Actions */}
        <div className="w-1/3 bg-gray-50 p-6 border-r border-gray-200 overflow-y-auto">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-gray-900">Candidate Review</h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Candidate Information */}
          <div className="bg-white rounded-lg p-4 mb-6 shadow-sm">
            <h3 className="font-semibold text-gray-800 mb-3">Candidate Information</h3>
            <div className="space-y-2 text-sm">
              <div>
                <span className="font-medium text-gray-600">Name:</span>
                <span className="ml-2 text-gray-900">{application.candidate_name}</span>
              </div>
              <div>
                <span className="font-medium text-gray-600">Email:</span>
                <span className="ml-2 text-gray-900">{application.candidate_email}</span>
              </div>
              {application.phone && (
                <div>
                  <span className="font-medium text-gray-600">Phone:</span>
                  <span className="ml-2 text-gray-900">{application.phone}</span>
                </div>
              )}
              <div>
                <span className="font-medium text-gray-600">Applied:</span>
                <span className="ml-2 text-gray-900">
                  {new Date(application.applied_date).toLocaleDateString()}
                </span>
              </div>
              <div>
                <span className="font-medium text-gray-600">Current Status:</span>
                <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${
                  application.status === 'shortlisted' ? 'bg-green-100 text-green-800' :
                  application.status === 'rejected' ? 'bg-red-100 text-red-800' :
                  application.status === 'under_review' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {application.status === 'shortlisted' ? 'Shortlisted' :
                   application.status === 'rejected' ? 'Rejected' :
                   application.status === 'under_review' ? 'Under Review' :
                   'Received'}
                </span>
              </div>
            </div>
          </div>

          {/* AI Score */}
          {application.ai_fit_score > 0 && (
            <div className="bg-white rounded-lg p-4 mb-6 shadow-sm">
              <h3 className="font-semibold text-gray-800 mb-3">AI Assessment</h3>
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600 mb-2">
                  {application.ai_fit_score}%
                </div>
                <p className="text-sm text-gray-600">Overall Fit Score</p>
              </div>
              
              {scoreBreakdown && !scoreBreakdown.error && (
                <div className="mt-4 space-y-2">
                  <div className="flex justify-between text-xs">
                    <span>Keywords:</span>
                    <span className="font-medium">{scoreBreakdown.keyword_match}%</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span>Skills:</span>
                    <span className="font-medium">{scoreBreakdown.skills_match}%</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span>Experience:</span>
                    <span className="font-medium">{scoreBreakdown.experience_match}%</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Review Notes */}
          <div className="bg-white rounded-lg p-4 mb-6 shadow-sm">
            <h3 className="font-semibold text-gray-800 mb-3">Review Notes</h3>
            <textarea
              value={reviewNotes}
              onChange={(e) => setReviewNotes(e.target.value)}
              placeholder="Add your review comments here..."
              rows={4}
              className="w-full p-3 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <button
              onClick={() => handleStatusUpdate('shortlisted')}
              disabled={loading || application.status === 'shortlisted'}
              className={`w-full py-3 px-4 rounded-md text-white font-medium transition-colors ${
                application.status === 'shortlisted' 
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'bg-green-600 hover:bg-green-700'
              }`}
            >
              {loading ? 'Processing...' : '✓ Shortlist Candidate'}
            </button>
            
            <button
              onClick={() => handleStatusUpdate('under_review')}
              disabled={loading || application.status === 'under_review'}
              className={`w-full py-3 px-4 rounded-md text-white font-medium transition-colors ${
                application.status === 'under_review' 
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'bg-yellow-600 hover:bg-yellow-700'
              }`}
            >
              {loading ? 'Processing...' : '⏸ Put on Hold'}
            </button>
            
            <button
              onClick={() => handleStatusUpdate('rejected')}
              disabled={loading || application.status === 'rejected'}
              className={`w-full py-3 px-4 rounded-md text-white font-medium transition-colors ${
                application.status === 'rejected' 
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'bg-red-600 hover:bg-red-700'
              }`}
            >
              {loading ? 'Processing...' : '✗ Reject Candidate'}
            </button>
          </div>
        </div>

        {/* Right Panel - Resume Viewer */}
        <div className="w-2/3 bg-white flex flex-col">
          <div className="p-4 border-b border-gray-200 flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-800">Resume Preview</h3>
            <div className="flex space-x-2">
              <button
                onClick={async () => {
                  const fileName = application.resume_url?.split('/').pop() || application.resume_url?.split('\\').pop();
                  const fileExt = fileName?.split('.').pop()?.toLowerCase() || '';
                  
                  // For Word documents, show message and download
                  if (fileExt === 'docx' || fileExt === 'doc') {
                    alert('Word documents cannot be displayed in the browser. The file will be downloaded so you can open it in Microsoft Word.');
                    
                    // Trigger download
                    const apiUrl = `/api/recruitment/applications/${application.id}/resume`;
                    const directUrl = `/uploads/resumes/${fileName}`;
                    
                    try {
                      const response = await fetch(apiUrl);
                      if (response.ok) {
                        const blob = await response.blob();
                        const url = window.URL.createObjectURL(new Blob([blob], { 
                          type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' 
                        }));
                        const link = document.createElement('a');
                        link.href = url;
                        link.download = `${application.candidate_name}_Resume.${fileExt}`;
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                        window.URL.revokeObjectURL(url);
                      } else {
                        // Fallback to direct download
                        const link = document.createElement('a');
                        link.href = directUrl;
                        link.download = `${application.candidate_name}_Resume.${fileExt}`;
                        link.click();
                      }
                    } catch (error) {
                      // Fallback to direct download
                      const link = document.createElement('a');
                      link.href = directUrl;
                      link.download = `${application.candidate_name}_Resume.${fileExt}`;
                      link.click();
                    }
                    return;
                  }
                  
                  // For PDFs, try to open in browser
                  const urlsToTry = [
                    `/api/recruitment/applications/${application.id}/resume`,
                    `/uploads/resumes/${fileName}`
                  ];
                  
                  let success = false;
                  
                  for (const url of urlsToTry) {
                    try {
                      const response = await fetch(url, { method: 'HEAD' });
                      if (response.ok) {
                        window.open(url, '_blank');
                        success = true;
                        break;
                      }
                    } catch (error) {
                      console.log(`Failed to access ${url}:`, error);
                    }
                  }
                  
                  if (!success) {
                    alert('Unable to open the file. Please try downloading it instead.');
                  }
                }}
                className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
              >
                📄 Open Full Resume
              </button>
              <button
                onClick={async () => {
                  const fileName = application.resume_url?.split('/').pop() || application.resume_url?.split('\\').pop();
                  const apiUrl = `/api/recruitment/applications/${application.id}/resume`;
                  const directUrl = `/uploads/resumes/${fileName}`;
                  
                  // Try API first, then fallback to direct URL
                  let downloadUrl = apiUrl;
                  
                  try {
                    const response = await fetch(apiUrl, { method: 'HEAD' });
                    if (!response.ok) {
                      downloadUrl = directUrl;
                    }
                  } catch (error) {
                    downloadUrl = directUrl;
                  }
                  
                  const link = document.createElement('a');
                  link.href = downloadUrl;
                  link.download = `${application.candidate_name}_Resume`;
                  link.click();
                }}
                className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
              >
                💾 Download
              </button>
              <button
                onClick={async () => {
                  const fileName = application.resume_url?.split('/').pop() || application.resume_url?.split('\\').pop();
                  let debugInfo = `Debug Info for ${application.candidate_name}:\n\n`;
                  
                  // Test API endpoint
                  try {
                    const apiResponse = await fetch(`/api/recruitment/applications/${application.id}/debug`);
                    if (apiResponse.ok) {
                      const debug = await apiResponse.json();
                      debugInfo += `Backend Debug:\n`;
                      debugInfo += `- File exists: ${debug.file_exists}\n`;
                      debugInfo += `- Path: ${debug.resume_url}\n`;
                      debugInfo += `- Absolute: ${debug.resume_url_absolute}\n`;
                      debugInfo += `- Working Dir: ${debug.current_working_directory}\n\n`;
                    } else {
                      debugInfo += `Backend Debug: API failed (${apiResponse.status})\n\n`;
                    }
                  } catch (err) {
                    debugInfo += `Backend Debug: Error - ${err.message}\n\n`;
                  }
                  
                  // Test direct file access
                  const directUrl = `/uploads/resumes/${fileName}`;
                  try {
                    const directResponse = await fetch(directUrl, { method: 'HEAD' });
                    debugInfo += `Direct File Access:\n`;
                    debugInfo += `- URL: ${directUrl}\n`;
                    debugInfo += `- Status: ${directResponse.status}\n`;
                    debugInfo += `- Accessible: ${directResponse.ok ? 'Yes' : 'No'}\n\n`;
                  } catch (err) {
                    debugInfo += `Direct File Access: Error - ${err.message}\n\n`;
                  }
                  
                  debugInfo += `Application Data:\n`;
                  debugInfo += `- ID: ${application.id}\n`;
                  debugInfo += `- Resume URL: ${application.resume_url}\n`;
                  debugInfo += `- Filename: ${fileName}`;
                  
                  alert(debugInfo);
                }}
                className="px-3 py-1 bg-yellow-600 text-white text-sm rounded hover:bg-yellow-700"
              >
                🔍 Debug
              </button>
            </div>
          </div>
          
          <div className="flex-1 p-4">
            <ResumeViewer application={application} />
          </div>
        </div>
      </div>
    </div>
  );
}