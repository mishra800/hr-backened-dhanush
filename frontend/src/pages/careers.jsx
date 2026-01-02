import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import logo from '../assets/logo.png';

export default function Careers() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedJob, setSelectedJob] = useState(null);
  const [showApplicationForm, setShowApplicationForm] = useState(false);
  const [applicationData, setApplicationData] = useState({
    candidate_name: '',
    candidate_email: '',
    phone: '',
    resume_file: null,
    cover_letter: ''
  });

  useEffect(() => {
    fetchJobs();
  }, []);

  const fetchJobs = async () => {
    try {
      const response = await api.get('/recruitment/jobs/active');
      setJobs(response.data);
    } catch (error) {
      console.error('Error fetching jobs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApply = (job) => {
    setSelectedJob(job);
    setShowApplicationForm(true);
  };

  const handleSubmitApplication = async (e) => {
    e.preventDefault();
    try {
      const formData = new FormData();
      formData.append('job_id', selectedJob.id);
      formData.append('candidate_name', applicationData.candidate_name);
      formData.append('candidate_email', applicationData.candidate_email);
      formData.append('phone', applicationData.phone);
      formData.append('cover_letter', applicationData.cover_letter);
      
      if (applicationData.resume_file) {
        formData.append('resume', applicationData.resume_file);
      }

      await api.post('/recruitment/apply', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      alert('Application submitted successfully! We will contact you soon.');
      setShowApplicationForm(false);
      setApplicationData({
        candidate_name: '',
        candidate_email: '',
        phone: '',
        resume_file: null,
        cover_letter: ''
      });
    } catch (error) {
      alert('Error submitting application. Please try again.');
      console.error('Error:', error);
    }
  };

  const handleFileChange = (e) => {
    setApplicationData({
      ...applicationData,
      resume_file: e.target.files[0]
    });
  };

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
                to="/"
                className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium transition duration-150"
              >
                Home
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

      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-16">
          <h1 className="text-5xl font-extrabold text-gray-900 sm:text-6xl leading-tight">
            <span className="block">Join Our</span>
            <span className="block bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent">
              Amazing Team
            </span>
          </h1>
          <p className="mt-6 max-w-3xl mx-auto text-xl text-gray-600 leading-relaxed">
            Build your career with us. We're looking for passionate individuals who want to make a difference in healthcare technology.
          </p>
        </div>

        {/* Company Values */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          <div className="text-center p-6 bg-white rounded-xl shadow-lg">
            <div className="text-4xl mb-4">🚀</div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Innovation</h3>
            <p className="text-gray-600">We embrace cutting-edge technology to revolutionize healthcare</p>
          </div>
          <div className="text-center p-6 bg-white rounded-xl shadow-lg">
            <div className="text-4xl mb-4">🤝</div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Collaboration</h3>
            <p className="text-gray-600">We believe in teamwork and supporting each other's growth</p>
          </div>
          <div className="text-center p-6 bg-white rounded-xl shadow-lg">
            <div className="text-4xl mb-4">💡</div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Excellence</h3>
            <p className="text-gray-600">We strive for excellence in everything we do</p>
          </div>
        </div>

        {/* Job Listings */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">Open Positions</h2>
          
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading opportunities...</p>
            </div>
          ) : jobs.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-xl shadow-lg">
              <div className="text-6xl mb-4">🔍</div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">No Open Positions</h3>
              <p className="text-gray-600 mb-6">We don't have any open positions right now, but we're always looking for great talent!</p>
              <p className="text-sm text-gray-500">Send us your resume at careers@dhanushhealthcare.com</p>
            </div>
          ) : (
            <div className="grid gap-6">
              {jobs.map((job) => (
                <div key={job.id} className="bg-white rounded-xl shadow-lg p-8 hover:shadow-xl transition-shadow">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                    <div className="flex-1">
                      <h3 className="text-2xl font-bold text-gray-900 mb-2">{job.title}</h3>
                      <div className="flex flex-wrap gap-4 text-sm text-gray-600 mb-4">
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
                      <p className="text-gray-700 mb-4 line-clamp-3">{job.description}</p>
                      
                      {job.required_skills && job.required_skills.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-4">
                          {job.required_skills.slice(0, 5).map((skill, index) => (
                            <span key={index} className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                              {skill}
                            </span>
                          ))}
                          {job.required_skills.length > 5 && (
                            <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-sm">
                              +{job.required_skills.length - 5} more
                            </span>
                          )}
                        </div>
                      )}
                      
                      {(job.salary_range_min || job.salary_range_max) && (
                        <p className="text-green-600 font-semibold mb-4">
                          💰 ₹{job.salary_range_min?.toLocaleString()} - ₹{job.salary_range_max?.toLocaleString()} per year
                        </p>
                      )}
                    </div>
                    
                    <div className="mt-4 md:mt-0 md:ml-6">
                      <button
                        onClick={() => handleApply(job)}
                        className="w-full md:w-auto px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all duration-150 shadow-lg hover:shadow-xl transform hover:-translate-y-1"
                      >
                        Apply Now
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Benefits Section */}
        <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 rounded-3xl shadow-2xl p-12 text-white">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Why Work With Us?</h2>
            <p className="text-blue-100">We offer competitive benefits and a great work environment</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="text-4xl mb-4">🏥</div>
              <h3 className="font-bold mb-2">Health Insurance</h3>
              <p className="text-blue-100 text-sm">Comprehensive medical coverage for you and your family</p>
            </div>
            <div className="text-center">
              <div className="text-4xl mb-4">🏠</div>
              <h3 className="font-bold mb-2">Work From Home</h3>
              <p className="text-blue-100 text-sm">Flexible remote work options</p>
            </div>
            <div className="text-center">
              <div className="text-4xl mb-4">📚</div>
              <h3 className="font-bold mb-2">Learning & Development</h3>
              <p className="text-blue-100 text-sm">Continuous learning opportunities and skill development</p>
            </div>
            <div className="text-center">
              <div className="text-4xl mb-4">🎉</div>
              <h3 className="font-bold mb-2">Team Events</h3>
              <p className="text-blue-100 text-sm">Regular team building activities and celebrations</p>
            </div>
          </div>
        </div>
      </div>

      {/* Application Modal */}
      {showApplicationForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-8">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Apply for {selectedJob?.title}</h2>
                <button
                  onClick={() => setShowApplicationForm(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <form onSubmit={handleSubmitApplication} className="space-y-6">
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
                
                <div className="flex gap-4 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowApplicationForm(false)}
                    className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all duration-150 shadow-lg"
                  >
                    Submit Application
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="bg-gray-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center">
            <h3 className="text-lg font-semibold mb-4">Ready to Join Us?</h3>
            <p className="text-gray-400 mb-6">
              Don't see a position that fits? Send us your resume at{' '}
              <a href="mailto:careers@dhanushhealthcare.com" className="text-blue-400 hover:text-blue-300">
                careers@dhanushhealthcare.com
              </a>
            </p>
            <div className="flex justify-center space-x-6">
              <Link to="/" className="text-gray-400 hover:text-white">Home</Link>
              <Link to="/login" className="text-gray-400 hover:text-white">Employee Login</Link>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-gray-800 text-center text-gray-400">
            <p>&copy; 2024 Dhanush Healthcare Pvt. Ltd. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}