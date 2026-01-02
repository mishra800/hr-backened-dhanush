import { useState, useEffect } from 'react';
import ResumePopup from './resumepopup';

export default function ResumeViewer({ application }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [fileType, setFileType] = useState(null);
  const [showResumePopup, setShowResumePopup] = useState(false);

  useEffect(() => {
    if (application?.resume_url) {
      const ext = application.resume_url.toLowerCase().split('.').pop();
      setFileType(ext);
      setLoading(false);
    }
  }, [application]);

  const getResumeUrl = () => {
    return `/api/recruitment/applications/${application.id}/resume`;
  };

  const getDirectResumeUrl = () => {
    if (!application?.resume_url) return null;
    // Extract filename from the stored path
    const fileName = application.resume_url.split('/').pop() || application.resume_url.split('\\').pop();
    return `/uploads/resumes/${fileName}`;
  };

  const getLocalResumeUrl = () => {
    if (!application?.resume_url) return null;
    // Extract filename from the stored path
    const fileName = application.resume_url.split('/').pop() || application.resume_url.split('\\').pop();
    return `/uploads/resumes/${fileName}`;
  };

  const handleDownload = async () => {
    const fileName = application.resume_url?.split('/').pop() || application.resume_url?.split('\\').pop();
    const fileExt = fileName?.split('.').pop() || '';
    const apiUrl = getResumeUrl();
    const directUrl = getDirectResumeUrl();
    
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

  const handleOpenInNewTab = async () => {
    const fileName = application.resume_url?.split('/').pop() || application.resume_url?.split('\\').pop();
    const fileExt = fileName?.split('.').pop()?.toLowerCase() || '';
    
    // For Word documents, we need to download them since browsers can't display them
    if (fileExt === 'docx' || fileExt === 'doc') {
      // Show a message and automatically download
      alert(`Word documents cannot be displayed in the browser. The file will be downloaded automatically so you can open it in Microsoft Word.`);
      await handleDownload();
      return;
    }
    
    // For PDFs, try to open in browser
    if (fileExt === 'pdf') {
      const apiUrl = getResumeUrl();
      const directUrl = getDirectResumeUrl();
      const localUrl = getLocalResumeUrl();
      
      const urlsToTry = [apiUrl, directUrl, localUrl];
      
      for (const url of urlsToTry) {
        try {
          const response = await fetch(url, { method: 'HEAD' });
          if (response.ok) {
            window.open(url, '_blank');
            return;
          }
        } catch (error) {
          console.log(`Failed to access ${url}:`, error);
        }
      }
      
      // If all fail, try opening the local URL anyway
      window.open(localUrl, '_blank');
    } else {
      // For other file types, download them
      await handleDownload();
    }
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!application?.resume_url) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50 border border-gray-300 rounded">
        <div className="text-center">
          <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="text-gray-500">No resume uploaded</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {fileType === 'pdf' ? (
        <div className="flex-1">
          <iframe
            src={getResumeUrl()}
            className="w-full h-full border border-gray-300 rounded"
            title="Resume Preview"
            onLoad={() => setLoading(false)}
            onError={() => setError('Failed to load PDF')}
          />
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center bg-gray-50 border border-gray-300 rounded">
          <div className="text-center max-w-md">
            <div className="mb-6">
              {fileType === 'docx' || fileType === 'doc' ? (
                <svg className="w-20 h-20 text-blue-600 mx-auto mb-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" />
                </svg>
              ) : (
                <svg className="w-20 h-20 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              )}
            </div>
            
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {application.candidate_name}'s Resume
            </h3>
            
            <p className="text-gray-600 mb-6">
              {fileType === 'docx' || fileType === 'doc' 
                ? 'Microsoft Word document - Cannot be displayed in browser. Click "Open Resume" to download and view in Word.' 
                : fileType === 'pdf'
                ? 'PDF document - Click below to view or download'
                : `${fileType?.toUpperCase()} file - Click below to download`}
            </p>
            
            <div className="space-y-3">
              <button
                onClick={handleOpenInNewTab}
                className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                {fileType === 'docx' || fileType === 'doc' 
                  ? '📄 Download Resume' 
                  : fileType === 'pdf'
                  ? '📄 Open Resume'
                  : '📄 Download File'}
              </button>
              
              <button
                onClick={handleDownload}
                className="w-full px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
              >
                💾 Download Resume
              </button>
            </div>
            
            {showResumePopup && (
              <ResumePopup
                application={application}
                onClose={() => setShowResumePopup(false)}
              />
            )}
            
            <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm text-blue-800">
                <strong>Tip:</strong> For best viewing experience, download the file and open it with the appropriate application.
              </p>
            </div>
          </div>
        </div>
      )}
      
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800 text-sm">{error}</p>
          <div className="mt-2 space-x-2">
            <button
              onClick={handleOpenInNewTab}
              className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
            >
              Try Opening in New Tab
            </button>
            <button
              onClick={handleDownload}
              className="px-3 py-1 bg-gray-600 text-white text-sm rounded hover:bg-gray-700"
            >
              Download Instead
            </button>
          </div>
        </div>
      )}
      
      {showResumePopup && (
        <ResumePopup
          application={application}
          onClose={() => setShowResumePopup(false)}
        />
      )}
    </div>
  );
}