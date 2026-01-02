import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../../api/axios';
import { format } from 'date-fns';
import { useToast } from '../../hooks/usetoast';
import { ToastContainer } from '../../components/toast';

export default function CandidateDashboard() {
  const [searchParams] = useSearchParams();
  const email = searchParams.get('email') || localStorage.getItem('candidate_email');
  
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedApp, setSelectedApp] = useState(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  
  const { toasts, removeToast, success, error: showError } = useToast();

  useEffect(() => {
    if (email) {
      localStorage.setItem('candidate_email', email);
      fetchApplications();
    }
  }, [email]);

  const fetchApplications = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/recruitment/candidate/applications?email=${email}`);
      setApplications(response.data);
    } catch (err) {
      console.error('Error fetching applications:', err);
      showError('Failed to load applications');
    } finally {
      setLoading(false);
    }
  };

  const getStatusInfo = (status) => {
    const statusMap = {
      applied: { label: 'Applied', color: 'bg-gray-100 text-gray-700', icon: '📝', step: 1 },
      screening: { label: 'Under Review', color: 'bg-blue-100 text-blue-700', icon: '🔍', step: 2 },
      assessment: { label: 'Assessment', color: 'bg-purple-100 text-purple-700', icon: '📊', step: 3 },
      interview: { label: 'Interview', color: 'bg-yellow-100 text-yellow-700', icon: '💬', step: 4 },
      offer: { label: 'Offer', color: 'bg-green-100 text-green-700', icon: '📄', step: 5 },
      hired: { label: 'Hired', color: 'bg-emerald-100 text-emerald-700', icon: '✅', step: 6 },
      rejected: { label: 'Not Selected', color: 'bg-red-100 text-red-700', icon: '❌', step: 0 }
    };
    return statusMap[status] || statusMap.applied;
  };

  const getProgressPercentage = (status) => {
    const statusInfo = getStatusInfo(status);
    return (statusInfo.step / 6) * 100;
  };

  if (!email) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-2xl p-8 max-w-md w-full">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Candidate Portal</h2>
          <p className="text-gray-600 mb-4">Enter your email to track your applications</p>
          <form onSubmit={(e) => {
            e.preventDefault();
            const formEmail = e.target.email.value;
            window.location.href = `?email=${formEmail}`;
          }}>
            <input
              type="email"
              name="email"
              required
              placeholder="your.email@example.com"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-4"
            />
            <button
              type="submit"
              className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 font-medium"
            >
              Access Portal
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <>
      <ToastContainer toasts={toasts} removeToast={removeToast} />
      
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Candidate Portal</h1>
                <p className="text-gray-600 mt-1">{email}</p>
              </div>
              <button
                onClick={() => {
                  localStorage.removeItem('candidate_email');
                  window.location.href = '/candidate/dashboard';
                }}
                className="px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors"
              >
                Switch Account
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-3xl font-bold text-blue-600">{applications.length}</div>
              <div className="text-sm text-gray-600 mt-1">Total Applications</div>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-3xl font-bold text-yellow-600">
                {applications.filter(a => a.status === 'interview').length}
              </div>
              <div className="text-sm text-gray-600 mt-1">Interviews</div>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-3xl font-bold text-green-600">
                {applications.filter(a => a.status === 'offer').length}
              </div>
              <div className="text-sm text-gray-600 mt-1">Offers</div>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-3xl font-bold text-emerald-600">
                {applications.filter(a => a.status === 'hired').length}
              </div>
              <div className="text-sm text-gray-600 mt-1">Hired</div>
            </div>
          </div>

          {/* Applications */}
          {applications.length === 0 ? (
            <div className="bg-white rounded-xl shadow-lg p-12 text-center">
              <div className="text-6xl mb-4">📭</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No Applications Yet</h3>
              <p className="text-gray-600">You haven't applied to any positions yet.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {applications.map((app) => {
                const statusInfo = getStatusInfo(app.status || 'applied');
                const progress = getProgressPercentage(app.status || 'applied');
                
                return (
                  <div
                    key={app.id}
                    className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow"
                  >
                    <div className="p-6">
                      {/* Header */}
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <h3 className="text-xl font-bold text-gray-900 mb-1">
                            {app.job?.title || 'Position'}
                          </h3>
                          <p className="text-gray-600">
                            Applied on {format(new Date(app.applied_date), 'MMM d, yyyy')}
                          </p>
                        </div>
                        <span className={`px-4 py-2 rounded-full text-sm font-medium ${statusInfo.color}`}>
                          {statusInfo.icon} {statusInfo.label}
                        </span>
                      </div>

                      {/* Progress Bar */}
                      {app.status !== 'rejected' && (
                        <div className="mb-4">
                          <div className="flex justify-between text-xs text-gray-600 mb-2">
                            <span>Application Progress</span>
                            <span>{Math.round(progress)}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-gradient-to-r from-blue-500 to-green-500 h-2 rounded-full transition-all duration-500"
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                        </div>
                      )}

                      {/* Timeline */}
                      <div className="flex items-center justify-between text-xs mb-4">
                        {['Applied', 'Review', 'Assessment', 'Interview', 'Offer', 'Hired'].map((step, idx) => {
                          const isActive = statusInfo.step >= idx + 1;
                          return (
                            <div key={step} className="flex flex-col items-center">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center mb-1 ${
                                isActive ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-400'
                              }`}>
                                {isActive ? '✓' : idx + 1}
                              </div>
                              <span className={isActive ? 'text-gray-900 font-medium' : 'text-gray-400'}>
                                {step}
                              </span>
                            </div>
                          );
                        })}
                      </div>

                      {/* Details */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 pt-4 border-t border-gray-100">
                        {app.ai_fit_score > 0 && (
                          <div>
                            <div className="text-xs text-gray-500">Match Score</div>
                            <div className="text-lg font-bold text-blue-600">
                              {app.ai_fit_score.toFixed(0)}%
                            </div>
                          </div>
                        )}
                        {app.job?.department && (
                          <div>
                            <div className="text-xs text-gray-500">Department</div>
                            <div className="text-sm font-medium text-gray-900">
                              {app.job.department}
                            </div>
                          </div>
                        )}
                        {app.job?.location && (
                          <div>
                            <div className="text-xs text-gray-500">Location</div>
                            <div className="text-sm font-medium text-gray-900">
                              {app.job.location}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2 pt-4 border-t border-gray-100">
                        <button
                          onClick={() => setSelectedApp(app)}
                          className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                        >
                          View Details
                        </button>
                        {app.resume_url && (
                          <button
                            onClick={() => window.open(app.resume_url, '_blank')}
                            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium"
                          >
                            📄 Resume
                          </button>
                        )}
                        {app.status === 'interview' && (
                          <button
                            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
                          >
                            📅 Schedule
                          </button>
                        )}
                        {app.status === 'offer' && (
                          <button
                            className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium"
                          >
                            📄 View Offer
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Detail Modal */}
      {selectedApp && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">
                    {selectedApp.job?.title || 'Position'}
                  </h2>
                  <p className="text-gray-600">Application #{selectedApp.id}</p>
                </div>
                <button
                  onClick={() => setSelectedApp(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Status</label>
                  <p className="text-lg font-semibold text-gray-900">
                    {getStatusInfo(selectedApp.status).label}
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-500">Applied Date</label>
                  <p className="text-gray-900">
                    {format(new Date(selectedApp.applied_date), 'MMMM d, yyyy')}
                  </p>
                </div>

                {selectedApp.ai_fit_score > 0 && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Match Score</label>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-gray-200 rounded-full h-3">
                        <div
                          className="bg-gradient-to-r from-blue-500 to-green-500 h-3 rounded-full"
                          style={{ width: `${selectedApp.ai_fit_score}%` }}
                        />
                      </div>
                      <span className="text-lg font-bold text-blue-600">
                        {selectedApp.ai_fit_score.toFixed(0)}%
                      </span>
                    </div>
                  </div>
                )}

                {selectedApp.job?.description && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Job Description</label>
                    <p className="text-gray-700 whitespace-pre-wrap">
                      {selectedApp.job.description}
                    </p>
                  </div>
                )}

                <div className="pt-4 border-t border-gray-200">
                  <p className="text-sm text-gray-600">
                    Need help? Contact us at <a href="mailto:recruitment@company.com" className="text-blue-600 hover:underline">recruitment@company.com</a>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
