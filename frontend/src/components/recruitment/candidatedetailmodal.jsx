import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import api from '../../api/axios';
import { useToast } from '../../hooks/usetoast';

export default function CandidateDetailModal({ application, onClose, onRefresh }) {
  const [activeTab, setActiveTab] = useState('overview');
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [stageHistory, setStageHistory] = useState([]);
  const [scoreBreakdown, setScoreBreakdown] = useState(null);
  const [loading, setLoading] = useState(false);
  const [tags, setTags] = useState([]);
  const [newTag, setNewTag] = useState('');
  
  const { success, error: showError } = useToast();

  useEffect(() => {
    fetchDetails();
  }, [application.id]);

  const fetchDetails = async () => {
    try {
      setLoading(true);
      
      // Fetch comments
      const commentsRes = await api.get(`/recruitment/applications/${application.id}/comments`);
      setComments(commentsRes.data || []);
      
      // Fetch stage history
      const historyRes = await api.get(`/recruitment/applications/${application.id}/history`);
      setStageHistory(historyRes.data || []);
      
      // Fetch score breakdown
      try {
        const scoreRes = await api.get(`/recruitment/applications/${application.id}/score-breakdown`);
        setScoreBreakdown(scoreRes.data);
      } catch (err) {
        console.log('Score breakdown not available');
      }
      
      // Parse tags
      setTags(JSON.parse(application.tags || '[]'));
    } catch (err) {
      console.error('Error fetching details:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    
    try {
      await api.post(`/recruitment/applications/${application.id}/comments`, {
        comment: newComment,
        is_private: false
      });
      
      setNewComment('');
      fetchDetails();
      success('Comment added');
    } catch (err) {
      showError('Failed to add comment');
    }
  };

  const handleAddTag = async () => {
    if (!newTag.trim() || tags.includes(newTag)) return;
    
    const updatedTags = [...tags, newTag];
    
    try {
      await api.post(`/recruitment/applications/${application.id}/tags`, {
        tags: updatedTags
      });
      
      setTags(updatedTags);
      setNewTag('');
      success('Tag added');
      onRefresh();
    } catch (err) {
      showError('Failed to add tag');
    }
  };

  const handleRemoveTag = async (tagToRemove) => {
    const updatedTags = tags.filter(t => t !== tagToRemove);
    
    try {
      await api.post(`/recruitment/applications/${application.id}/tags`, {
        tags: updatedTags
      });
      
      setTags(updatedTags);
      success('Tag removed');
      onRefresh();
    } catch (err) {
      showError('Failed to remove tag');
    }
  };

  const handleToggleStar = async () => {
    try {
      await api.post(`/recruitment/applications/${application.id}/star`);
      success(application.is_starred ? 'Unstarred' : 'Starred');
      onRefresh();
      onClose();
    } catch (err) {
      showError('Failed to update');
    }
  };

  const handleStatusChange = async (newStatus) => {
    try {
      await api.patch(`/recruitment/applications/${application.id}/status?status=${newStatus}`);
      success(`Moved to ${newStatus}`);
      onRefresh();
      onClose();
    } catch (err) {
      showError('Failed to update status');
    }
  };

  const handleScheduleInterview = () => {
    // TODO: Open interview scheduler
    showError('Interview scheduler coming soon');
  };

  const handleSendEmail = () => {
    // TODO: Open email composer
    showError('Email composer coming soon');
  };

  const getScoreColor = (score) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4">
              {/* Avatar */}
              <div className="w-16 h-16 rounded-full bg-white bg-opacity-20 flex items-center justify-center text-2xl font-bold">
                {application.candidate_name?.charAt(0).toUpperCase()}
              </div>
              
              <div>
                <h2 className="text-2xl font-bold">{application.candidate_name}</h2>
                <p className="text-blue-100">{application.candidate_email}</p>
                <div className="flex items-center gap-2 mt-2">
                  <span className="px-3 py-1 bg-white bg-opacity-20 rounded-full text-sm">
                    {application.status || 'Applied'}
                  </span>
                  <span className={`px-3 py-1 bg-white bg-opacity-20 rounded-full text-sm font-bold`}>
                    AI Score: {application.ai_fit_score?.toFixed(0)}%
                  </span>
                </div>
              </div>
            </div>
            
            <button
              onClick={onClose}
              className="text-white hover:bg-white hover:bg-opacity-20 rounded-full p-2 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="border-b border-gray-200 p-4 bg-gray-50">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => handleStatusChange('interview')}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium"
            >
              ✓ Shortlist
            </button>
            <button
              onClick={() => handleStatusChange('rejected')}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium"
            >
              ✗ Reject
            </button>
            <button
              onClick={handleScheduleInterview}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
            >
              📅 Schedule Interview
            </button>
            <button
              onClick={handleSendEmail}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm font-medium"
            >
              ✉️ Send Email
            </button>
            <button
              onClick={handleToggleStar}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${
                application.is_starred
                  ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {application.is_starred ? '⭐ Starred' : '☆ Star'}
            </button>
            <button
              onClick={() => window.open(application.resume_url, '_blank')}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 text-sm font-medium"
            >
              📄 View Resume
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            {[
              { id: 'overview', label: 'Overview', icon: '📋' },
              { id: 'score', label: 'AI Score', icon: '🎯' },
              { id: 'history', label: 'History', icon: '📜' },
              { id: 'comments', label: 'Comments', icon: '💬', count: comments.length }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.icon} {tab.label}
                {tab.count !== undefined && (
                  <span className="ml-2 px-2 py-0.5 bg-gray-200 rounded-full text-xs">
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Applied Date</label>
                  <p className="text-gray-900">{format(new Date(application.applied_date), 'MMM d, yyyy')}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Source</label>
                  <p className="text-gray-900">{application.source || 'Direct'}</p>
                </div>
                {application.salary_expectation && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Salary Expectation</label>
                    <p className="text-gray-900">{application.salary_expectation}</p>
                  </div>
                )}
                {application.notice_period && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Notice Period</label>
                    <p className="text-gray-900">{application.notice_period}</p>
                  </div>
                )}
                {application.availability_date && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Available From</label>
                    <p className="text-gray-900">{format(new Date(application.availability_date), 'MMM d, yyyy')}</p>
                  </div>
                )}
              </div>

              {/* Tags */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Tags</label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {tags.map((tag, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm"
                    >
                      {tag}
                      <button
                        onClick={() => handleRemoveTag(tag)}
                        className="hover:text-blue-900"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
                    placeholder="Add tag..."
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <button
                    onClick={handleAddTag}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Add
                  </button>
                </div>
              </div>

              {/* Notes */}
              {application.notes && (
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">Notes</label>
                  <p className="text-gray-600 bg-gray-50 p-4 rounded-lg">{application.notes}</p>
                </div>
              )}
            </div>
          )}

          {/* AI Score Tab */}
          {activeTab === 'score' && (
            <div className="space-y-6">
              <div className="text-center">
                <div className={`text-6xl font-bold ${getScoreColor(application.ai_fit_score)}`}>
                  {application.ai_fit_score?.toFixed(0)}%
                </div>
                <p className="text-gray-500 mt-2">Overall AI Fit Score</p>
              </div>

              {scoreBreakdown && !scoreBreakdown.error && (
                <div className="space-y-4">
                  {Object.entries(scoreBreakdown).map(([key, value]) => {
                    if (key === 'overall_score' || typeof value !== 'object') return null;
                    
                    return (
                      <div key={key} className="bg-gray-50 p-4 rounded-lg">
                        <div className="flex justify-between items-center mb-2">
                          <span className="font-medium text-gray-900 capitalize">
                            {key.replace(/_/g, ' ')}
                          </span>
                          <span className={`font-bold ${getScoreColor(value.score || 0)}`}>
                            {value.score || 0}%
                          </span>
                        </div>
                        {value.details && (
                          <p className="text-sm text-gray-600">{value.details}</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {scoreBreakdown?.error && (
                <div className="text-center text-gray-500 py-8">
                  {scoreBreakdown.error}
                </div>
              )}
            </div>
          )}

          {/* History Tab */}
          {activeTab === 'history' && (
            <div className="space-y-4">
              {stageHistory.length > 0 ? (
                <div className="relative">
                  <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200"></div>
                  {stageHistory.map((entry, idx) => (
                    <div key={idx} className="relative flex gap-4 pb-6">
                      <div className="relative z-10 flex-shrink-0 w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-bold">
                        {idx + 1}
                      </div>
                      <div className="flex-1 bg-gray-50 p-4 rounded-lg">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <span className="font-medium text-gray-900">
                              {entry.from_stage} → {entry.to_stage}
                            </span>
                            {entry.changed_by && (
                              <p className="text-sm text-gray-500">by User #{entry.changed_by}</p>
                            )}
                          </div>
                          <span className="text-sm text-gray-500">
                            {format(new Date(entry.created_at), 'MMM d, h:mm a')}
                          </span>
                        </div>
                        {entry.notes && (
                          <p className="text-sm text-gray-600">{entry.notes}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-gray-500 py-8">
                  No history available
                </div>
              )}
            </div>
          )}

          {/* Comments Tab */}
          {activeTab === 'comments' && (
            <div className="space-y-4">
              {/* Add Comment */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Add a comment..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                />
                <div className="flex justify-end mt-2">
                  <button
                    onClick={handleAddComment}
                    disabled={!newComment.trim()}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Add Comment
                  </button>
                </div>
              </div>

              {/* Comments List */}
              {comments.length > 0 ? (
                <div className="space-y-3">
                  {comments.map((comment) => (
                    <div key={comment.id} className="bg-white border border-gray-200 p-4 rounded-lg">
                      <div className="flex justify-between items-start mb-2">
                        <span className="font-medium text-gray-900">
                          User #{comment.user_id}
                        </span>
                        <span className="text-sm text-gray-500">
                          {format(new Date(comment.created_at), 'MMM d, h:mm a')}
                        </span>
                      </div>
                      <p className="text-gray-700">{comment.comment}</p>
                      {comment.is_private && (
                        <span className="inline-block mt-2 px-2 py-1 bg-yellow-100 text-yellow-700 text-xs rounded">
                          🔒 Private
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-gray-500 py-8">
                  No comments yet
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
