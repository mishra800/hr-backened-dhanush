import { useState } from 'react';

export default function ResumePopup({ application, onClose }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [debugInfo, setDebugInfo] = useState(null);

  const getResumeUrl = () => {
    return `/api/recruitment/applications/${application.id}/resume`;
  };

  const handleOpenResume = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // First, get debug info (optional)
      try {
        const debugResponse = await fetch(`/api/recruitment/applications/${application.id}/debug`);
        if (debugResponse.ok) {
          const debug = await debugResponse.json();
          setDebugInfo(debug);
        }
      } catch (debugError) {
        console.log('Debug info not available:', debugError);
      }
      
      // Extract filename and extension
      const fileName = application.resume_url?.split('/').pop() || application.resume_url?.split('\\').pop();
      const fileExt = fileName?.split('.').pop()?.toLowerCase() || '';
      
      // For Word documents, we need to download them since browsers can't display them
      if (fileExt === 'docx' || fileExt === 'doc') {
        setError('Word documents cannot be displayed in the browser. Please use the download button to save the file and open it in Microsoft Word.');
        return;
      }
      
      // For PDFs, try to open in browser
      if (fileExt === 'pdf') {
        const urlsToTry = [
          getResumeUrl(), // API endpoint
          `/uploads/resumes/${fileName}`, // Direct backend URL
          `/uploads/resumes/${fileName}` // Local frontend URL
        ];
        
        let success = false;
        
        for (const url of urlsToTry) {
          try {
            const response = await fetch(url, { method: 'HEAD' });
            if (response.ok) {
              window.open(url, '_blank');
              success = true;
              onClose();
              break;
            }
          } catch (urlError) {
            console.log(`Failed to access ${url}:`, urlError);
          }
        }
        
        if (!success) {
          setError('Unable to access the PDF file. Please try downloading it instead.');
        }
      } else {
        // For other file types, suggest download
        setError('This file type cannot be displayed in the browser. Please use the download button to save the file.');
      }
      
    } catch (err) {
      setError(`Network error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    const fileName = application.resume_url?.split('/').pop() || application.resume_url?.split('\\').pop();
    const fileExt = fileName?.split('.').pop() || '';
    const apiUrl = getResumeUrl();
    const directUrl = `/uploads/resumes/${fileName}`;
    
    // Try to download from API first, then direct URL
    const urlsToTry = [apiUrl, directUrl];
    
    for (const url of urlsToTry) {
      try {
        const response = await fetch(url);
        if (response.ok) {
          const blob = await response.blob();
          
          // Create proper blob with correct MIME type
          let mimeType = 'application/octet-stream';
          if (fileExt === 'docx') {
            mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
          } else if (fileExt === 'doc') {
            mimeType = 'application/msword';
          } else if (fileExt === 'pdf') {
            mimeType = 'application/pdf';
          }
          
          const properBlob = new Blob([blob], { type: mimeType });
          const downloadUrl = window.URL.createObjectURL(properBlob);
          
          const link = document.createElement('a');
          link.href = downloadUrl;
          link.download = `${application.candidate_name}_Resume.${fileExt}`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          window.URL.revokeObjectURL(downloadUrl);
          return;
        }
      } catch (error) {
        console.log(`Download failed from ${url}:`, error);
      }
    }
    
    // Fallback: try direct link download
    const link = document.createElement('a');
    link.href = directUrl;
    link.download = `${application.candidate_name}_Resume.${fileExt}`;
    link.click();
  };

  const handleDirectOpen = () => {
    // Try multiple fallback approaches
    const fileName = application.resume_url?.split('/').pop() || application.resume_url?.split('\\').pop();
    
    if (fileName) {
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
      // Try different possible paths
      const possiblePaths = [
        `/uploads/${fileName}`,
        `/uploads/resumes/${fileName}`,
        `${API_BASE_URL}/uploads/${fileName}`,
        `${API_BASE_URL}/uploads/resumes/${fileName}`,
        application.resume_url // Original path
      ];
      
      // Try each path
      possiblePaths.forEach((path, index) => {
        setTimeout(() => {
          window.open(path, '_blank');
        }, index * 500); // Stagger the attempts
      });
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-2xl">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Open Resume</h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
              <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" />
            </svg>
          </div>
          <h4 className="text-lg font-medium text-gray-900 mb-2">
            {application.candidate_name}'s Resume
          </h4>
          <p className="text-sm text-gray-600">
            Choose how you'd like to view the resume
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-800 mb-2">
              <strong>Error:</strong> {error}
            </p>
            <p className="text-xs text-red-600">
              Try the download option or contact IT support if the issue persists.
            </p>
          </div>
        )}

        <div className="space-y-3">
          <button
            onClick={handleOpenResume}
            disabled={loading}
            className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
          >
            {loading ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Opening...
              </div>
            ) : (
              '📄 Open in New Tab'
            )}
          </button>

          <button
            onClick={handleDownload}
            className="w-full px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium transition-colors"
          >
            💾 Download Resume
          </button>

          <button
            onClick={handleDirectOpen}
            className="w-full px-4 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 font-medium transition-colors"
          >
            🔗 Try Direct Access
          </button>
        </div>

        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
          <p className="text-xs text-gray-600">
            <strong>Debug Info:</strong><br/>
            File: {application.resume_url}<br/>
            API URL: {getResumeUrl()}<br/>
            {debugInfo && (
              <>
                File Exists: {debugInfo.file_exists ? 'Yes' : 'No'}<br/>
                Working Dir: {debugInfo.current_working_directory}<br/>
                Absolute Path: {debugInfo.resume_url_absolute}
              </>
            )}
          </p>
        </div>

        <div className="mt-4 text-center">
          <button
            onClick={onClose}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}