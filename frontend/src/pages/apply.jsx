import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api/axios';
import logo from '../assets/logo.png';

export default function Apply() {
  const { linkCode } = useParams();
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  
  const [applicationData, setApplicationData] = useState({
    candidate_name: '',
    candidate_email: '',
    phone: '',
    resume_file: null,
    cover_letter: ''
  });

  useEffect(() => {
    fetchJobByLink();
  }, [linkCode]);

  const fetchJobByLink = async () => {
    try {
      const response = await api.get(`/recruitment/apply/${linkCode}`);
      setJob(response.data);
    } catch (error) {
      console.error('Error fetching job:', error);
      if (error.response?.status === 404) {
        setError('Job not found or no longer active. Please check the link or contact the employer.');
      } else {
        setError('Failed to load job details. Please try again later.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitApplication = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    
    try {
      const formData = new FormData();
      formData.append('candidate_name', applicationData.candidate_name);
      formData.append('candidate_email', applicationData.candidate_email);
      formData.append('phone', applicationData.phone);
      formData.append('cover_letter', applicationData.cover_letter);
      
      if (applicationData.resume_file) {
        formData.append('resume', applicationData.resume_file);
      }

      await api.post(`/recruitment/apply/${linkCode}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setSubmitted(true);
    } catch (error) {
      console.error('Error submitting application:', error);
      if (error.response?.status === 400) {
        alert('You have already applied for this position.');
      } else {
        alert('Error submitting application. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleFileChange = (e) => {
    setApplicationData({
      ...applicationData,
      resume_file: e.target.files[0]
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading job details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
        {/* Navigation */}
        <nav className="bg-white shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <Link to="/" className="flex items-center">
                <img src={logo} alt="Company Logo" className="h-10 w-auto" />
                <span className="ml-3 text-xl font-bold text-gray-900">Dhanush Healthcare</span>
              </Link>
            </div>
          </div>
        </nav>

        <div className="flex items-center justify-center min-h-[80vh]">
          <div className="text-center max-w-md mx-auto p-8">
            <div className="text-6xl mb-4">😞</div>
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Job Not Found</h1>
            <p className="text-gray-600 mb-6">{error}</p>
            <Link
              to="/careers"
              className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Browse All Jobs
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
        {/* Navigation */}
        <nav className="bg-white shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <Link to="/" className="flex items-center">
                <img src={logo} alt="Company Logo" className="h-10 w-auto" />
                <span className="ml-3 text-xl font-bold text-gray-900">Dhanush Healthcare</span>
              </Link>
            </div>
          </div>
        </nav>

        <div className="flex items-center justify-center min-h-[80vh]">
          <div className="text-center max-w-md mx-auto p-8">
            <div className="text-6xl mb-4">🎉</div>
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Application Submitted!</h1>
            <p className="text-gray-600 mb-6">
              Thank you for applying to <strong>{job.title}</strong>. 
              We have received your application and will review it shortly.
            </p>
            <p className="text-sm text-gray-500 mb-6">
              You will receive an email confirmation at <strong>{applicationData.candidate_email}</strong>
            </p>
            <div className="space-y-3">
              <Link
                to="/careers"
                className="block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Browse More Jobs
              </Link>
              <Link
                to="/"
                className="block text-gray-600 hover:text-gray-800 transition-colors"
              >
                Back to Home
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Navigation */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link to="/" className="flex items-center">
              <img src={logo} alt="Company Logo" className="h-10 w-auto" />
              <span className="ml-3 text-xl font-bold text-gray-900">Dhanush Healthcare</span>
            </Link>
            <div className="flex items-center space-x-4">
              <Link
                to="/careers"
                className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium transition duration-150"
              >
                All Jobs
              </Link>
              <Link
                to="/login"
                className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium transition duration-150"
              >
                Employee Login
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Job Details */}
        <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{job.title}</h1>
            <div className="flex flex-wrap gap-4 text-sm text-gray-600">
              <span className="flex items-center">
                <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                </svg>
                {job.location}
              </span>
              <span className="flex items-center">
                <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M6 6V5a3 3 0 013-3h2a3 3 0 013 3v1h2a2 2 0 012 2v3.57A22.952 22.952 0 0110 13a22.95 22.95 0 01-8-1.43V8a2 2 0 012-2h2zm2-1a1 1 0 011-1h2a1 1 0 011 1v1H8V5zm1 5a1 1 0 011-1h.01a1 1 0 110 2H10a1 1 0 01-1-1z" clipRule="evenodd" />
                </svg>
                {job.department}
              </span>
              <span className="flex items-center">
                <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                </svg>
                Posted {new Date(job.posted_date).toLocaleDateString()}
              </span>
            </div>
          </div>
          
          <div className="prose max-w-none">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Job Description</h3>
            <div className="text-gray-700 whitespace-pre-wrap">{job.description}</div>
          </div>
        </div>

        {/* Application Form */}
        <div className="bg-white rounded-xl shadow-lg p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Apply for this Position</h2>
          
          <form onSubmit={handleSubmitApplication} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Full Name *</label>
                <input
                  type="text"
                  required
                  value={applicationData.candidate_name}
                  onChange={(e) => setApplicationData({...applicationData, candidate_name: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter your full name"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email Address *</label>
                <input
                  type="email"
                  required
                  value={applicationData.candidate_email}
                  onChange={(e) => setApplicationData({...applicationData, candidate_email: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter your email address"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number *</label>
              <input
                type="tel"
                required
                value={applicationData.phone}
                onChange={(e) => setApplicationData({...applicationData, phone: e.target.value})}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter your phone number"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Resume *</label>
              <input
                type="file"
                required
                accept=".pdf,.doc,.docx"
                onChange={handleFileChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="text-sm text-gray-500 mt-1">Accepted formats: PDF, DOC, DOCX (Max 5MB)</p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Cover Letter</label>
              <textarea
                rows={4}
                value={applicationData.cover_letter}
                onChange={(e) => setApplicationData({...applicationData, cover_letter: e.target.value})}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Tell us why you're interested in this position..."
              />
            </div>
            
            <div className="pt-4">
              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 px-6 rounded-lg font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all duration-150 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Submitting Application...' : 'Submit Application'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}