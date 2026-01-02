import { useState } from 'react';
import { format } from 'date-fns';
import CandidateDetailModal from './candidatedetailmodal';
import api from '../../api/axios';

export default function CandidateCard({ application, isSelected, onSelect, isDragging, onRefresh }) {
  const [showDetails, setShowDetails] = useState(false);

  const getScoreColor = (score) => {
    if (score >= 80) return 'text-green-600 bg-green-100';
    if (score >= 60) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const getSourceIcon = (source) => {
    const icons = {
      linkedin: '💼',
      indeed: '🔍',
      referral: '👥',
      direct: '📧',
      github: '💻'
    };
    return icons[source?.toLowerCase()] || '📝';
  };

  return (
    <>
      <div
        className={`bg-white rounded-lg border-2 p-4 cursor-pointer transition-all hover:shadow-lg ${
          isDragging ? 'shadow-2xl rotate-2 opacity-90' : 'shadow-sm'
        } ${
          isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
        }`}
        onClick={() => setShowDetails(true)}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-start gap-2 flex-1">
            {/* Checkbox */}
            <input
              type="checkbox"
              checked={isSelected}
              onChange={(e) => {
                e.stopPropagation();
                onSelect();
              }}
              onClick={(e) => e.stopPropagation()}
              className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            
            {/* Avatar */}
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-bold text-sm">
              {application.candidate_name?.charAt(0).toUpperCase()}
            </div>
            
            {/* Name & Email */}
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold text-gray-900 truncate">
                {application.candidate_name}
              </h4>
              <p className="text-xs text-gray-500 truncate">
                {application.candidate_email}
              </p>
            </div>
          </div>

          {/* AI Score Badge */}
          <div className={`px-2 py-1 rounded-full text-xs font-bold ${getScoreColor(application.ai_fit_score)}`}>
            {application.ai_fit_score?.toFixed(0)}%
          </div>
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-1 mb-3">
          {/* Source */}
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-700">
            {getSourceIcon(application.source)}
            {application.source || 'Direct'}
          </span>
          
          {/* Date */}
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-700">
            📅 {format(new Date(application.applied_date), 'MMM d')}
          </span>

          {/* Starred */}
          {application.is_starred && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-yellow-100 text-yellow-700">
              ⭐ Starred
            </span>
          )}
        </div>

        {/* Quick Info */}
        <div className="space-y-1 text-xs text-gray-600">
          {application.salary_expectation && (
            <div className="flex items-center gap-1">
              <span>💰</span>
              <span>{application.salary_expectation}</span>
            </div>
          )}
          
          {application.notice_period && (
            <div className="flex items-center gap-1">
              <span>⏱️</span>
              <span>{application.notice_period} notice</span>
            </div>
          )}

          {application.availability_date && (
            <div className="flex items-center gap-1">
              <span>📆</span>
              <span>Available: {format(new Date(application.availability_date), 'MMM d, yyyy')}</span>
            </div>
          )}
        </div>

        {/* Tags */}
        {application.tags && JSON.parse(application.tags || '[]').length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {JSON.parse(application.tags).slice(0, 3).map((tag, idx) => (
              <span
                key={idx}
                className="inline-block px-2 py-0.5 rounded text-xs bg-blue-100 text-blue-700"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="mt-3 pt-3 border-t border-gray-100 flex gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowDetails(true);
            }}
            className="flex-1 px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 rounded hover:bg-blue-100 transition-colors"
          >
            View Details
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              window.open(application.resume_url, '_blank');
            }}
            className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 rounded hover:bg-gray-200 transition-colors"
          >
            📄 Resume
          </button>
        </div>
        
        {/* Quick Actions */}
        {application.status !== 'rejected' && application.status !== 'hired' && (
          <div className="mt-2 flex gap-2">
            <button
              onClick={async (e) => {
                e.stopPropagation();
                try {
                  await api.patch(`/recruitment/applications/${application.id}/status?status=interview`);
                  onRefresh();
                } catch (err) {
                  console.error('Error shortlisting:', err);
                }
              }}
              className="flex-1 px-3 py-1.5 text-xs font-medium text-green-600 bg-green-50 rounded hover:bg-green-100 transition-colors"
            >
              ✓ Shortlist
            </button>
            <button
              onClick={async (e) => {
                e.stopPropagation();
                if (confirm(`Reject ${application.candidate_name}?`)) {
                  try {
                    await api.patch(`/recruitment/applications/${application.id}/status?status=rejected`);
                    onRefresh();
                  } catch (err) {
                    console.error('Error rejecting:', err);
                  }
                }
              }}
              className="flex-1 px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 rounded hover:bg-red-100 transition-colors"
            >
              ✗ Reject
            </button>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {showDetails && (
        <CandidateDetailModal
          application={application}
          onClose={() => setShowDetails(false)}
          onRefresh={onRefresh}
        />
      )}
    </>
  );
}
