import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import Webcam from 'react-webcam';
import KanbanBoard from '../components/recruitment/kanbanboard';
import InterviewScheduler from '../components/recruitment/interviewscheduler';
import CandidateReviewModal from '../components/recruitment/candidatereviewmodal';

export default function Recruitment() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('dashboard'); // dashboard, create, jobs, board, kanban
  const [selectedJobForKanban, setSelectedJobForKanban] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [users, setUsers] = useState([]);

  // Workflow State
  const [workflowMode, setWorkflowMode] = useState('flexible'); // mandatory, flexible, smart
  const [currentStep, setCurrentStep] = useState(0);
  const [newJob, setNewJob] = useState({
    title: '',
    department: '',
    department_head: '',
    budget: '',
    location: '',
    description: '',
    requirements: '',
    workflow_mode: 'flexible'
  });

  // Sourcing State
  const [sourcingCandidates, setSourcingCandidates] = useState([]);
  const [isSourcing, setIsSourcing] = useState(false);

  // Application Form State (Candidate Side)
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [selectedJobForApply, setSelectedJobForApply] = useState(null);
  const [applicationData, setApplicationData] = useState({
    candidate_name: '',
    candidate_email: '',
    resume_url: '',
    resume_file: null
  });

  // Screening State
  const [viewingJobId, setViewingJobId] = useState(null);
  const [applications, setApplications] = useState([]);

  // Assessment State
  const [assessmentQuestions, setAssessmentQuestions] = useState([]);
  const [showAssessmentModal, setShowAssessmentModal] = useState(false);
  const [assessmentSettings, setAssessmentSettings] = useState({
    duration_minutes: 60,
    passing_score: 60.0,
    difficulty: 'medium',
    proctoring_enabled: true,
    instructions: 'Please read all questions carefully and answer to the best of your ability.'
  });

  // AI Interview State
  const [showInterviewModal, setShowInterviewModal] = useState(false);
  const [interviewQuestions, setInterviewQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [candidateAnswer, setCandidateAnswer] = useState('');
  const [conversationHistory, setConversationHistory] = useState([]);
  const [isRecording, setIsRecording] = useState(false);
  const [proctorWarnings, setProctorWarnings] = useState([]);
  const webcamRef = useRef(null);

  // Score Breakdown Modal
  const [showScoreBreakdown, setShowScoreBreakdown] = useState(false);
  const [scoreBreakdown, setScoreBreakdown] = useState(null);

  // Bulk Selection State
  const [selectedApplications, setSelectedApplications] = useState([]);
  const [showBulkActions, setShowBulkActions] = useState(false);

  // Interview Scheduler State
  const [showInterviewScheduler, setShowInterviewScheduler] = useState(false);
  const [selectedApplicationForInterview, setSelectedApplicationForInterview] = useState(null);

  // Candidate Review Modal State
  const [showCandidateReview, setShowCandidateReview] = useState(false);
  const [selectedApplicationForReview, setSelectedApplicationForReview] = useState(null);

  // Text-to-Speech Helper
  const speakText = (text) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel(); // Stop any previous speech
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      // Try to find a good English voice
      const voices = window.speechSynthesis.getVoices();
      const preferredVoice = voices.find(v => v.lang.includes('en-US') && v.name.includes('Google')) || voices[0];
      if (preferredVoice) utterance.voice = preferredVoice;

      window.speechSynthesis.speak(utterance);
    }
  };

  // Speak when a new question from Bot arrives
  useEffect(() => {
    if (showInterviewModal && conversationHistory.length > 0) {
      const lastMsg = conversationHistory[conversationHistory.length - 1];
      if (lastMsg.sender === 'bot') {
        speakText(lastMsg.text);
      }
    }
  }, [conversationHistory, showInterviewModal]);

  const handleViewDetails = async (jobId) => {
    if (viewingJobId === jobId) {
      setViewingJobId(null); // Toggle off
      setSelectedApplications([]); // Clear selections
      return;
    }
    setViewingJobId(jobId);
    setSelectedApplications([]); // Clear selections when switching jobs
    try {
      const response = await api.get(`/recruitment/jobs/${jobId}/applications`);
      setApplications(response.data);
    } catch (error) {
      console.error('Error fetching applications:', error);
      setApplications([]);
    }
  };

  const WORKFLOW_STEPS = [
    { id: 0, name: 'Requisition', desc: 'Create & Approve Job Request' },
    { id: 1, name: 'Job Posting', desc: 'Publish to Job Boards' },
    { id: 2, name: 'Sourcing', desc: 'AI Candidate Discovery' },
    { id: 3, name: 'Screening', desc: 'Resume Parsing & Ranking' },
    { id: 4, name: 'Assessment', desc: 'Technical/Skill Tests' },
    { id: 5, name: 'Interview', desc: 'Schedule & Conduct Interviews' },
    { id: 6, name: 'Ranking', desc: 'Compare Top Candidates' },
    { id: 7, name: 'Offer', desc: 'Generate & Send Offers' },
    { id: 8, name: 'Background', desc: 'Verify History' },
    { id: 9, name: 'Onboarding', desc: 'Initiate Employee Setup' },
  ];

  useEffect(() => {
    fetchJobs();
    fetchUsers();
  }, []);

  const fetchJobs = async () => {
    try {
      const response = await api.get('/recruitment/jobs/');
      setJobs(response.data);
    } catch (error) {
      console.error('Error fetching jobs:', error);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await api.get('/users/');
      setUsers(response.data);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewJob(prev => ({ ...prev, [name]: value }));
  };

  const handleOptimize = async () => {
    if (!newJob.description) return alert('Enter description first');
    try {
      const response = await api.post('/recruitment/jobs/optimize', { description: newJob.description });
      setNewJob(prev => ({ ...prev, description: response.data.description }));
    } catch (error) {
      console.error('Error optimizing:', error);
    }
  };

  const handleAutoGenerateJD = async () => {
    if (!newJob.title) return alert('Please enter a Job Title first.');
    try {
      // Mock AI Generation based on title
      const generatedJD = `Job Title: ${newJob.title}\n\nOverview:\nWe are looking for a talented ${newJob.title} to join our team.\n\nKey Responsibilities:\n- [AI Generated Responsibility 1]\n- [AI Generated Responsibility 2]\n- [AI Generated Responsibility 3]\n\nRequirements:\n- 3+ years of experience\n- Strong problem-solving skills\n- Team player`;
      setNewJob(prev => ({ ...prev, description: generatedJD }));
    } catch (error) {
      console.error('Error generating JD:', error);
    }
  };

  const handleCreateRequisition = async (e) => {
    e.preventDefault();
    try {
      const jobData = {
        title: newJob.title,
        description: newJob.description,
        department: newJob.department,
        location: newJob.location,
        workflow_mode: workflowMode,
        requisition_status: 'pending_approval'
      };
      
      await api.post('/recruitment/jobs/', jobData);
      alert('Requisition Created! Sent for Approval.');
      setNewJob({ title: '', department: '', location: '', description: '', requirements: '', budget: '', department_head: '' });
      setActiveTab('jobs');
      fetchJobs();
    } catch (error) {
      console.error('Error creating requisition:', error);
      alert('Failed to create requisition: ' + (error.response?.data?.detail || error.message));
    }
  };

  const handleApproveJob = async (jobId) => {
    try {
      await api.patch(`/recruitment/jobs/${jobId}/approve`);
      alert(`Job ${jobId} Approved! Now live on Job Board.`);

      // Update local state
      setJobs(prev => prev.map(j => j.id === jobId ? { ...j, requisition_status: 'approved', is_active: true, current_step: 1 } : j));
    } catch (error) {
      console.error('Error approving job:', error);
    }
  };

  const handleSourceCandidates = async () => {
    setIsSourcing(true);
    try {
      // Use the current job ID to get context-aware candidates
      // Find the job that is currently in step 2 (Sourcing)
      const sourcingJob = jobs.find(j => j.current_step === 2);
      if (!sourcingJob) return;

      const response = await api.get(`/recruitment/jobs/${sourcingJob.id}/sourcing/candidates`);
      setSourcingCandidates(response.data);
    } catch (error) {
      console.error('Error sourcing:', error);
    } finally {
      setIsSourcing(false);
    }
  };

  const handleAddCandidate = async (jobId, candidate) => {
    try {
      await api.post(`/recruitment/jobs/${jobId}/sourcing/add`, candidate);
      alert(`Candidate ${candidate.name} added to pipeline!`);
      // Optionally remove from the sourcing list or mark as added
      setSourcingCandidates(prev => prev.filter(c => c.email !== candidate.email));
    } catch (error) {
      console.error('Error adding candidate:', error);
      alert('Failed to add candidate.');
    }
  };

  const handleNextStep = async (jobId) => {
    try {
      console.log('Advancing step for job:', jobId);
      
      // Find the current job to check its step
      const currentJob = jobs.find(j => j.id === jobId);
      const currentStep = currentJob?.current_step || 0;
      
      // Don't advance beyond the final step (step 9 is Onboarding, the last step)
      if (currentStep >= 9) {
        console.log('Already at final step, cannot advance further');
        alert('This job has reached the final step (Onboarding). Use "Start Onboarding" to proceed.');
        return;
      }
      
      await api.patch(`/recruitment/jobs/${jobId}/advance`);
      // Update local state
      setJobs(prev => prev.map(j => {
        if (j.id === jobId) {
          const newStep = Math.min(9, (j.current_step || 0) + 1); // Cap at step 9
          console.log(`Job ${jobId} advanced to step ${newStep}`);
          return { ...j, current_step: newStep };
        }
        return j;
      }));
    } catch (error) {
      console.error('Error advancing step:', error);
    }
  };

  const handlePrevStep = async (jobId) => {
    try {
      await api.patch(`/recruitment/jobs/${jobId}/revert`);
      // Update local state
      setJobs(prev => prev.map(j => j.id === jobId ? { ...j, current_step: Math.max(0, (j.current_step || 0) - 1) } : j));
    } catch (error) {
      console.error('Error reverting step:', error);
    }
  };

  const handleShortlist = async (applicationId) => {
    try {
      await api.patch(`/recruitment/applications/${applicationId}/status?status=shortlisted`);
      // Update local state
      setApplications(prev => prev.map(app => app.id === applicationId ? { ...app, status: 'shortlisted' } : app));
    } catch (error) {
      console.error('Error shortlisting:', error);
    }
  };

  const handleReject = async (applicationId) => {
    try {
      await api.patch(`/recruitment/applications/${applicationId}/status?status=rejected`);
      // Update local state
      setApplications(prev => prev.map(app => app.id === applicationId ? { ...app, status: 'rejected' } : app));
    } catch (error) {
      console.error('Error rejecting:', error);
    }
  };

  const handleHold = async (applicationId) => {
    try {
      await api.patch(`/recruitment/applications/${applicationId}/status?status=under_review`);
      // Update local state
      setApplications(prev => prev.map(app => app.id === applicationId ? { ...app, status: 'under_review' } : app));
    } catch (error) {
      console.error('Error putting on hold:', error);
    }
  };

  const handleBulkAction = async (action, selectedIds) => {
    try {
      const promises = selectedIds.map(id => 
        api.patch(`/recruitment/applications/${id}/status?status=${action}`)
      );
      await Promise.all(promises);
      
      // Update local state
      setApplications(prev => prev.map(app => 
        selectedIds.includes(app.id) ? { ...app, status: action } : app
      ));
      
      alert(`${selectedIds.length} applications ${action} successfully!`);
    } catch (error) {
      console.error('Error with bulk action:', error);
      alert('Some actions failed. Please try again.');
    }
  };

  // --- Candidate Apply Logic ---
  const openApplyModal = (job) => {
    setSelectedJobForApply(job);
    setApplicationData({ candidate_name: '', candidate_email: '', resume_url: '', resume_file: null });
    setShowApplyModal(true);
  };

  const handleDeleteJob = async (jobId) => {
    if (!window.confirm('Are you sure you want to delete this job posting? This will also delete all associated applications.')) {
      return;
    }
    try {
      await api.delete(`/recruitment/jobs/${jobId}`);
      alert('Job deleted successfully!');
      fetchJobs();
    } catch (error) {
      console.error('Error deleting job:', error);
      alert('Failed to delete job: ' + (error.response?.data?.detail || error.message));
    }
  };

  const handleViewScoreBreakdown = async (applicationId) => {
    try {
      const response = await api.get(`/recruitment/applications/${applicationId}/score-breakdown`);
      setScoreBreakdown(response.data);
      setShowScoreBreakdown(true);
    } catch (error) {
      console.error('Error fetching score breakdown:', error);
      alert('Failed to fetch score breakdown');
    }
  };

  const handleApply = async (e) => {
    e.preventDefault();
    try {
      const formData = new FormData();
      formData.append('candidate_name', applicationData.candidate_name);
      formData.append('candidate_email', applicationData.candidate_email);
      if (applicationData.resume_url) formData.append('resume_url', applicationData.resume_url);
      if (applicationData.resume_file) formData.append('resume', applicationData.resume_file);

      await api.post(`/recruitment/jobs/${selectedJobForApply.id}/apply`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      alert("Application submitted successfully!");
      setShowApplyModal(false);
    } catch (error) {
      console.error("Error applying:", error);
      alert("Failed to apply.");
    }
  };

  // --- Step Specific Handlers (Mock) ---
  const handleGenerateAssessment = async (jobId) => {
    try {
      const response = await api.get(`/recruitment/jobs/${jobId}/assessment/generate`);
      setAssessmentQuestions(response.data);
      setShowAssessmentModal(true);
    } catch (error) {
      console.error('Error generating assessment:', error);
      alert('Failed to generate assessment.');
    }
  };

  const handleRegenerateQuestions = async (jobId, difficulty = 'medium') => {
    try {
      const response = await api.get(`/recruitment/jobs/${jobId}/assessment/generate?difficulty=${difficulty}`);
      setAssessmentQuestions(response.data);
    } catch (error) {
      console.error('Error regenerating questions:', error);
      alert('Failed to regenerate questions.');
    }
  };

  const handleSendAssessment = async (jobId) => {
    try {
      // Create assessment first
      const assessmentData = {
        title: `Assessment for ${jobs.find(j => j.id === jobId)?.title || 'Position'}`,
        description: assessmentSettings.instructions,
        job_id: jobId,
        duration_minutes: assessmentSettings.duration_minutes,
        passing_score: assessmentSettings.passing_score,
        questions: assessmentQuestions.map((q, idx) => ({
          question_text: q.q,
          question_type: q.options.length > 1 ? 'multiple_choice' : 'text',
          options: q.options,
          correct_answer: q.answer,
          points: 1
        }))
      };

      const createResponse = await api.post('/assessment/create', assessmentData);
      const assessmentId = createResponse.data.assessment_id;

      // Get shortlisted candidates for this job
      const applicationsResponse = await api.get(`/recruitment/jobs/${jobId}/applications`);
      const shortlistedCandidates = applicationsResponse.data.filter(app => app.status === 'shortlisted');

      if (shortlistedCandidates.length === 0) {
        alert('No shortlisted candidates found for this job.');
        return;
      }

      // Assign assessment to all shortlisted candidates
      const assignPromises = shortlistedCandidates.map(candidate =>
        api.post(`/assessment/assign/${candidate.id}`, null, {
          params: { assessment_id: assessmentId, deadline_hours: 48 }
        })
      );

      await Promise.all(assignPromises);

      alert(`Assessment sent to ${shortlistedCandidates.length} shortlisted candidates!`);
      setShowAssessmentModal(false);
      
      // Refresh applications to show updated status
      if (viewingJobId === jobId) {
        const updatedApps = await api.get(`/recruitment/jobs/${jobId}/applications`);
        setApplications(updatedApps.data);
      }
    } catch (error) {
      console.error('Error sending assessment:', error);
      alert('Failed to send assessment. Please try again.');
    }
  };

  const handleScheduleInterviews = (jobId) => {
    // Get applications for this job that have passed assessment
    const jobApplications = applications.filter(app => 
      app.job_id === jobId && 
      (app.status === 'shortlisted' || app.status === 'assessment_passed')
    );
    
    if (jobApplications.length === 0) {
      alert('No candidates available for interview scheduling. Please ensure candidates have passed the assessment phase.');
      return;
    }
    
    // For demo, select the first candidate. In real app, show a candidate selection modal
    setSelectedApplicationForInterview(jobApplications[0]);
    setShowInterviewScheduler(true);
  };

  const handleInterviewScheduled = () => {
    // Refresh applications to show updated status
    if (viewingJobId && selectedApplicationForInterview) {
      handleViewDetails(viewingJobId);
    }
    setShowInterviewScheduler(false);
    setSelectedApplicationForInterview(null);
  };

  const handleCandidateReview = (application) => {
    setSelectedApplicationForReview(application);
    setShowCandidateReview(true);
  };

  const handleStatusUpdateFromReview = (applicationId, newStatus) => {
    // Update local state
    setApplications(prev => prev.map(app => 
      app.id === applicationId ? { ...app, status: newStatus } : app
    ));
    setShowCandidateReview(false);
    setSelectedApplicationForReview(null);
  };

  const handleStartAIInterview = async (jobId, application = null) => {
    // Use provided application or pick the first one for backward compatibility
    const app = application || applications[0];
    if (!app) return alert("No candidates to interview yet");

    try {
      const response = await api.post(`/ai-interview/generate-questions/${app.id}`);
      setInterviewQuestions(response.data);
      setShowInterviewModal(true);
      setCurrentQuestionIndex(0);
      setConversationHistory([{ sender: 'bot', text: response.data[0] }]); // Start with first question
      setProctorWarnings([]);

      // Simulate Proctoring Events
      startProctoringSimulation();
    } catch (error) {
      console.error('Error starting interview:', error);
      alert('Failed to start AI Interview');
    }
  };

  const startProctoringSimulation = () => {
    const warnings = [
      "⚠️ Warning: Eye movement detected away from screen",
      "⚠️ Warning: Multiple faces detected",
      "⚠️ Warning: Suspicious hand movement",
      "⚠️ Warning: Tab switch detected"
    ];

    // Randomly trigger warnings every 10-20 seconds
    const interval = setInterval(() => {
      if (Math.random() > 0.85) { // Reduced frequency
        const warning = warnings[Math.floor(Math.random() * warnings.length)];
        triggerProctorWarning(warning);
      }
    }, 10000);

    // Add Event Listeners for Tab Switching and Focus Loss
    const handleVisibilityChange = () => {
      if (document.hidden) {
        triggerProctorWarning("⚠️ Warning: Tab switch detected! Stay on this tab.");
      }
    };

    const handleBlur = () => {
      triggerProctorWarning("⚠️ Warning: Focus lost! Please keep the interview window active.");
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleBlur);

    // Cleanup
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleBlur);
    };
  };

  const triggerProctorWarning = (warning) => {
    setProctorWarnings(prev => [warning, ...prev].slice(0, 3));
    // Log to backend
    api.post('/ai-interview/proctor/log', {
      interview_id: 1, // Mock ID
      type: warning,
      timestamp: new Date().toISOString()
    }).catch(err => console.error("Proctor log error", err));
  };

  const handleSubmitAnswer = async () => {
    // In voice mode, we don't check for text input
    // Simulate processing audio
    setIsRecording(false); // Stop recording if active

    // Add candidate answer placeholder to history (hidden in UI but good for logic)
    const newHistory = [...conversationHistory, { sender: 'user', text: '(Audio Response Recorded)' }];
    setConversationHistory(newHistory);

    // Move to next question
    const nextIndex = currentQuestionIndex + 1;
    if (nextIndex < interviewQuestions.length) {
      // Simulate Bot "Thinking" delay
      setTimeout(() => {
        setConversationHistory(prev => [...prev, { sender: 'bot', text: interviewQuestions[nextIndex] }]);
        setCurrentQuestionIndex(nextIndex);
      }, 1500);
    } else {
      // Finished
      setTimeout(() => {
        setConversationHistory(prev => [...prev, { sender: 'bot', text: "Thank you! The interview is complete. We will review your responses." }]);
        setCurrentQuestionIndex(nextIndex); // Move past last index to show finish button
      }, 1500);
    }
  };

  const toggleRecording = () => {
    if (isRecording) {
      // Stop Recording -> Submit
      setIsRecording(false);
      handleSubmitAnswer();
    } else {
      // Start Recording
      setIsRecording(true);
    }
  };

  const handleGenerateOffers = (jobId) => {
    alert(`Offers generated for top candidates in Job ${jobId}`);
  };

  const handleInitiateOnboarding = (jobId) => {
    console.log('Initiating onboarding for job:', jobId);
    // Navigate to the onboarding page
    navigate('/dashboard/onboarding');
  };

  const renderStepSpecificContent = (job) => {
    const step = job.current_step || 0;

    // Auto-expand applications for relevant steps if not already viewing
    // Note: In a real app we might want to fetch this data automatically

    switch (step) {
      case 3: // Screening
        return (
          <div className="bg-indigo-50 p-4 rounded border border-indigo-100 mb-4">
            <h5 className="font-semibold text-indigo-900 mb-2">🔍 AI Resume Screening</h5>
            <p className="text-sm text-indigo-700 mb-3">AI has analyzed received resumes. Review the ranking and shortlist candidates.</p>
            <div className="flex space-x-3">
              <button onClick={() => handleViewDetails(job.id)} className="bg-white text-indigo-600 border border-indigo-200 px-3 py-1.5 rounded text-sm font-medium hover:bg-indigo-50">
                {viewingJobId === job.id ? 'Hide Candidates' : 'Review Candidates'}
              </button>
            </div>
          </div>
        );
      case 4: // Assessment
        return (
          <div className="bg-orange-50 p-4 rounded border border-orange-100 mb-4">
            <h5 className="font-semibold text-orange-900 mb-2">📝 Technical Assessment</h5>
            <p className="text-sm text-orange-700 mb-3">Generate and send job-specific skill assessments to shortlisted candidates.</p>
            <div className="flex space-x-3">
              <button onClick={() => handleGenerateAssessment(job.id)} className="bg-white text-orange-600 border border-orange-200 px-3 py-1.5 rounded text-sm font-medium hover:bg-orange-50">
                ⚙️ Generate & Preview Exam
              </button>
              <button onClick={() => handleSendAssessment(job.id)} className="bg-orange-600 text-white px-3 py-1.5 rounded text-sm font-medium hover:bg-orange-700">
                ✉️ Send to Candidates
              </button>
            </div>
          </div>
        );
      case 5: // Interview
        return (
          <div className="bg-teal-50 p-4 rounded border border-teal-100 mb-4">
            <h5 className="font-semibold text-teal-900 mb-2">📅 Interview Scheduling</h5>
            <p className="text-sm text-teal-700 mb-3">Schedule AI or Human interviews for candidates who passed assessment.</p>
            <div className="flex space-x-3">
              <button onClick={() => handleScheduleInterviews(job.id)} className="bg-teal-600 text-white px-3 py-1.5 rounded text-sm font-medium hover:bg-teal-700">
                🗓️ Schedule Human Interview
              </button>
              <button onClick={() => handleStartAIInterview(job.id)} className="bg-purple-600 text-white px-3 py-1.5 rounded text-sm font-medium hover:bg-purple-700">
                🤖 Start AI Bot Interview
              </button>
            </div>
          </div>
        );
      case 6: // Ranking
        return (
          <div className="bg-pink-50 p-4 rounded border border-pink-100 mb-4">
            <h5 className="font-semibold text-pink-900 mb-2">📊 Candidate Ranking</h5>
            <p className="text-sm text-pink-700 mb-3">Compare final scores across Screening, Assessment, and Interview stages.</p>
            <button onClick={() => handleViewDetails(job.id)} className="bg-white text-pink-600 border border-pink-200 px-3 py-1.5 rounded text-sm font-medium">
              View Leaderboard
            </button>
          </div>
        );
      case 7: // Offer
        return (
          <div className="bg-green-50 p-4 rounded border border-green-100 mb-4">
            <h5 className="font-semibold text-green-900 mb-2">📜 Offer Management</h5>
            <p className="text-sm text-green-700 mb-3">Generate and send digital offer letters.</p>
            <button onClick={() => handleGenerateOffers(job.id)} className="bg-green-600 text-white px-3 py-1.5 rounded text-sm font-medium hover:bg-green-700">
              ✨ Generate Offers
            </button>
          </div>
        );
      case 8: // Background
        return (
          <div className="bg-gray-50 p-4 rounded border border-gray-200 mb-4">
            <h5 className="font-semibold text-gray-900 mb-2">🕵️ Background Verification</h5>
            <p className="text-sm text-gray-700 mb-3">Initiate automated background checks for accepted offers.</p>
            <button className="bg-gray-600 text-white px-3 py-1.5 rounded text-sm font-medium hover:bg-gray-700">
              Initiate BGV
            </button>
          </div>
        );
      case 9: // Onboarding
        return (
          <div className="bg-blue-50 p-4 rounded border border-blue-100 mb-4">
            <h5 className="font-semibold text-blue-900 mb-2">🚀 Onboarding</h5>
            <p className="text-sm text-blue-700 mb-3">Convert candidates to employees and start the onboarding journey.</p>
            <button onClick={() => handleInitiateOnboarding(job.id)} className="bg-blue-600 text-white px-3 py-1.5 rounded text-sm font-medium hover:bg-blue-700">
              Start Onboarding
            </button>
          </div>
        );
      default:
        // Handle any steps beyond 9 or invalid steps
        if (step > 9) {
          return (
            <div className="bg-green-50 p-4 rounded border border-green-100 mb-4">
              <h5 className="font-semibold text-green-900 mb-2">✅ Process Complete</h5>
              <p className="text-sm text-green-700 mb-3">This recruitment process has been completed.</p>
              <button onClick={() => handleInitiateOnboarding(job.id)} className="bg-green-600 text-white px-3 py-1.5 rounded text-sm font-medium hover:bg-green-700">
                View Onboarding
              </button>
            </div>
          );
        }
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header & Mode Selection */}
      <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Recruitment Hub</h1>
          <p className="text-gray-500 text-sm mt-1">End-to-End Talent Acquisition System</p>
        </div>
        <div className="mt-4 md:mt-0 flex bg-white rounded-lg shadow-sm p-1">
          {['mandatory', 'flexible', 'smart'].map((mode) => (
            <button
              key={mode}
              onClick={() => setWorkflowMode(mode)}
              className={`px-4 py-2 text-sm font-medium rounded-md capitalize transition-colors ${workflowMode === mode
                ? 'bg-primary text-white shadow-sm'
                : 'text-gray-500 hover:text-gray-900'
                }`}
            >
              {mode} Mode
            </button>
          ))}
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-gray-200 mb-6 overflow-x-auto">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'dashboard', label: 'Dashboard' },
            { id: 'create', label: 'Create Requisition' },
            { id: 'jobs', label: 'Active Pipelines' },
            { id: 'kanban', label: 'Kanban Board' },
            { id: 'board', label: 'Job Board (Public)' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === tab.id
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Content Area */}
      <div className="bg-white rounded-lg shadow min-h-[500px] p-6">

        {/* DASHBOARD */}
        {activeTab === 'dashboard' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-blue-50 p-6 rounded-lg border border-blue-100">
              <h3 className="text-lg font-semibold text-blue-900">Open Requisitions</h3>
              <p className="text-3xl font-bold text-blue-700 mt-2">{jobs.filter(j => j.is_active).length}</p>
            </div>
            <div className="bg-green-50 p-6 rounded-lg border border-green-100">
              <h3 className="text-lg font-semibold text-green-900">Candidates Sourced</h3>
              <p className="text-3xl font-bold text-green-700 mt-2">247</p>
              <p className="text-xs text-green-600 mt-1">Across LinkedIn, Indeed, GitHub</p>
            </div>
            <div className="bg-purple-50 p-6 rounded-lg border border-purple-100">
              <h3 className="text-lg font-semibold text-purple-900">Avg. Time to Hire</h3>
              <p className="text-3xl font-bold text-purple-700 mt-2">12 Days</p>
            </div>
          </div>
        )}

        {/* CREATE REQUISITION (Step 0) */}
        {activeTab === 'create' && (
          <div className="max-w-3xl mx-auto">
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900">New Job Requisition</h2>
                <span className="px-3 py-1 rounded-full bg-yellow-100 text-yellow-800 text-xs font-semibold">Step 1 of 10</span>
              </div>
              {/* Stepper Preview */}
              <div className="flex justify-between items-center mb-8 relative overflow-x-auto pb-2">
                <div className="absolute top-1/2 left-0 w-full h-0.5 bg-gray-200 -z-10"></div>
                {WORKFLOW_STEPS.slice(0, 5).map((step, idx) => (
                  <div key={step.id} className={`flex flex-col items-center bg-white px-2 ${idx === 0 ? 'text-primary' : 'text-gray-400'}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold mb-1 ${idx === 0 ? 'bg-primary text-white' : 'bg-gray-200 text-gray-500'
                      }`}>
                      {idx + 1}
                    </div>
                    <span className="text-xs font-medium">{step.name}</span>
                  </div>
                ))}
              </div>
            </div>

            <form onSubmit={handleCreateRequisition} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Job Title</label>
                  <input type="text" name="title" value={newJob.title} onChange={handleInputChange} required className="mt-1 block w-full border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-primary focus:border-primary" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Department</label>
                  <input type="text" name="department" value={newJob.department} onChange={handleInputChange} required className="mt-1 block w-full border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-primary focus:border-primary" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Hiring Manager</label>
                  <input type="text" name="department_head" value={newJob.department_head} onChange={handleInputChange} placeholder="e.g. John Doe" className="mt-1 block w-full border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-primary focus:border-primary" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Budget (Annual)</label>
                  <input type="text" name="budget" value={newJob.budget} onChange={handleInputChange} placeholder="$80,000 - $120,000" className="mt-1 block w-full border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-primary focus:border-primary" />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-sm font-medium text-gray-700">Job Description</label>
                  <div className="flex space-x-2">
                    <button type="button" onClick={handleAutoGenerateJD} className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center">⚡ Auto-Generate</button>
                    <button type="button" onClick={handleOptimize} className="text-xs text-purple-600 hover:text-purple-800 font-medium flex items-center">✨ AI Optimize</button>
                  </div>
                </div>
                <textarea name="description" value={newJob.description} onChange={handleInputChange} rows={4} required className="mt-1 block w-full border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-primary focus:border-primary" />
              </div>

              {/* Workflow Settings Display */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-blue-900 mb-2">Workflow Settings</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Workflow Mode:</span>
                    <span className="ml-2 font-medium text-blue-700 capitalize">{workflowMode}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Initial Status:</span>
                    <span className="ml-2 font-medium text-yellow-700">Pending Approval</span>
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Change workflow mode using the buttons at the top of the page
                </p>
              </div>

              <div className="flex justify-end pt-4">
                <button type="submit" className="bg-primary text-white px-6 py-2 rounded-md shadow-sm hover:bg-blue-600 font-medium">
                  Create Requisition & Send for Approval
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ACTIVE PIPELINES (Management) */}
        {activeTab === 'jobs' && (
          <div className="space-y-8">
            {jobs.map(job => (
              <div key={job.id} className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">{job.title}</h3>
                    <p className="text-sm text-gray-500">{job.department} • {job.location}</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-semibold rounded-full">
                      {WORKFLOW_STEPS[job.current_step || 0].name}
                    </span>
                    <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs font-semibold rounded-full capitalize">
                      {job.workflow_mode} Mode
                    </span>
                  </div>
                </div>

                <div className="p-6">
                  {/* Workflow Visualization */}
                  <div className="flex items-center justify-between mb-6 overflow-x-auto pb-4">
                    {WORKFLOW_STEPS.map((step, idx) => (
                      <div key={step.id} className={`flex flex-col items-center min-w-[80px] ${idx <= (job.current_step || 0) ? 'text-primary' : 'text-gray-300'
                        }`}>
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold mb-1 ${idx <= (job.current_step || 0) ? 'bg-primary text-white' : 'bg-gray-100 text-gray-400'
                          }`}>
                          {idx + 1}
                        </div>
                        <span className="text-[10px] font-medium text-center">{step.name}</span>
                      </div>
                    ))}
                  </div>

                  {/* Action Area based on Current Step */}
                  <div className="bg-gray-50 rounded-lg p-4 border border-dashed border-gray-300">
                    <h4 className="font-semibold text-gray-700 mb-3">Current Action: {WORKFLOW_STEPS[job.current_step || 0].desc}</h4>

                    {/* Approval Step */}
                    {job.requisition_status === 'pending_approval' && (
                      <div className="bg-yellow-50 p-4 rounded border border-yellow-200 mb-4">
                        <p className="text-sm text-yellow-800 mb-2">⚠️ This requisition is pending approval.</p>
                        <button
                          onClick={() => handleApproveJob(job.id)}
                          className="bg-green-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-green-700"
                        >
                          ✅ Approve Requisition
                        </button>
                      </div>
                    )}

                    {/* Sourcing Step UI */}
                    {(job.current_step || 0) === 2 && (
                      <div>
                        <button
                          onClick={handleSourceCandidates}
                          disabled={isSourcing}
                          className="bg-purple-600 text-white px-4 py-2 rounded-md text-sm hover:bg-purple-700 flex items-center"
                        >
                          {isSourcing ? 'AI Sourcing...' : '🤖 Auto-Source Candidates'}
                        </button>

                        {sourcingCandidates.length > 0 && (
                          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                            {sourcingCandidates.map((cand, i) => (
                              <div key={i} className="bg-white p-3 rounded shadow-sm flex justify-between items-center">
                                <div>
                                  <p className="font-medium text-gray-900">{cand.name}</p>
                                  <p className="text-xs text-gray-500">{cand.skills.join(', ')}</p>
                                </div>
                                <div className="text-right">
                                  <span className="block text-xs font-bold text-green-600">{cand.match_score}% Match</span>
                                  <span className="text-[10px] text-gray-400 block mb-2">{cand.source}</span>
                                  <button
                                    onClick={() => handleAddCandidate(job.id, cand)}
                                    className="text-xs bg-indigo-600 text-white px-2 py-1 rounded hover:bg-indigo-700"
                                  >
                                    + Add to Pipeline
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        <div className="mt-4 pt-4 border-t border-gray-200 flex justify-between">
                          <button
                            onClick={() => handlePrevStep(job.id)}
                            className="bg-gray-200 text-gray-700 px-4 py-2 rounded-md text-sm hover:bg-gray-300"
                          >
                            &larr; Back
                          </button>
                          {/* Hide Complete Step & Next button at final step (9) */}
                          {(job.current_step || 0) < 9 && (
                            <button
                              onClick={() => handleNextStep(job.id)}
                              className="bg-primary text-white px-4 py-2 rounded-md text-sm hover:bg-blue-600"
                            >
                              Complete Step & Next &rarr;
                            </button>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Default Action for other steps */}
                    {(job.current_step || 0) !== 2 && (
                      <div className="space-y-4">

                        {/* Render Step Specific Content */}
                        {renderStepSpecificContent(job)}

                        <div className="flex space-x-3">
                          <button
                            onClick={() => handlePrevStep(job.id)}
                            className="bg-gray-200 text-gray-700 px-4 py-2 rounded-md text-sm hover:bg-gray-300"
                          >
                            &larr; Back
                          </button>
                          {/* Only show View Applications if not already shown by step content */}
                          {(job.current_step || 0) !== 3 && (job.current_step || 0) !== 6 && (
                            <button
                              onClick={() => handleViewDetails(job.id)}
                              className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-md text-sm hover:bg-gray-50"
                            >
                              {viewingJobId === job.id ? 'Hide Candidates' : 'View Applications'}
                            </button>
                          )}

                          {/* Hide Complete Step & Next button at final step (9) */}
                          {(job.current_step || 0) < 9 && (
                            <button
                              onClick={() => handleNextStep(job.id)}
                              className="bg-primary text-white px-4 py-2 rounded-md text-sm hover:bg-blue-600"
                            >
                              Complete Step & Next &rarr;
                            </button>
                          )}
                        </div>

                        {/* Applications List (Screening View) */}
                        {viewingJobId === job.id && (
                          <div className="mt-4 border-t border-gray-200 pt-4">
                            <div className="flex justify-between items-center mb-3">
                              <h5 className="font-semibold text-gray-800">Received Applications</h5>
                              {applications.length > 0 && (
                                <div className="flex items-center space-x-2">
                                  <button
                                    onClick={() => {
                                      if (selectedApplications.length === applications.length) {
                                        setSelectedApplications([]);
                                      } else {
                                        setSelectedApplications(applications.map(app => app.id));
                                      }
                                    }}
                                    className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-2 py-1 rounded"
                                  >
                                    {selectedApplications.length === applications.length ? 'Deselect All' : 'Select All'}
                                  </button>
                                  {selectedApplications.length > 0 && (
                                    <div className="flex space-x-1">
                                      <button
                                        onClick={() => handleBulkAction('shortlisted', selectedApplications)}
                                        className="text-xs bg-green-600 hover:bg-green-700 text-white px-2 py-1 rounded"
                                      >
                                        Bulk Shortlist ({selectedApplications.length})
                                      </button>
                                      <button
                                        onClick={() => handleBulkAction('rejected', selectedApplications)}
                                        className="text-xs bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded"
                                      >
                                        Bulk Reject ({selectedApplications.length})
                                      </button>
                                      <button
                                        onClick={() => handleBulkAction('under_review', selectedApplications)}
                                        className="text-xs bg-yellow-600 hover:bg-yellow-700 text-white px-2 py-1 rounded"
                                      >
                                        Bulk Hold ({selectedApplications.length})
                                      </button>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                            {applications.length === 0 ? (
                              <p className="text-sm text-gray-500 italic">No applications received yet.</p>
                            ) : (
                              <div className="space-y-3">
                                {applications.map(app => (
                                  <div key={app.id} className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                                    <div className="flex items-start space-x-4">
                                      <input
                                        type="checkbox"
                                        checked={selectedApplications.includes(app.id)}
                                        onChange={(e) => {
                                          if (e.target.checked) {
                                            setSelectedApplications(prev => [...prev, app.id]);
                                          } else {
                                            setSelectedApplications(prev => prev.filter(id => id !== app.id));
                                          }
                                        }}
                                        className="mt-1 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                      />
                                      
                                      <div className="flex-1">
                                        <div className="flex items-center justify-between mb-2">
                                          <div>
                                            <h4 className="font-semibold text-gray-900 text-lg">{app.candidate_name}</h4>
                                            <p className="text-sm text-gray-600">{app.candidate_email}</p>
                                            {app.phone && (
                                              <p className="text-sm text-gray-600">📞 {app.phone}</p>
                                            )}
                                          </div>
                                          
                                          <div className="text-right">
                                            <div 
                                              className="inline-flex items-center bg-gradient-to-r from-green-50 to-blue-50 px-3 py-2 rounded-lg border border-green-200 cursor-pointer hover:from-green-100 hover:to-blue-100 transition-colors"
                                              onClick={() => handleViewScoreBreakdown(app.id)}
                                              title="Click to view detailed AI analysis"
                                            >
                                              <span className="text-sm font-bold text-green-700">AI Score: {app.ai_fit_score}%</span>
                                              <span className="ml-2 text-green-600">📊</span>
                                            </div>
                                          </div>
                                        </div>
                                        
                                        <div className="flex items-center justify-between">
                                          <div className="flex items-center space-x-2">
                                            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                                              app.status === 'shortlisted' ? 'bg-green-100 text-green-800' :
                                              app.status === 'rejected' ? 'bg-red-100 text-red-800' :
                                              app.status === 'under_review' ? 'bg-yellow-100 text-yellow-800' :
                                              app.status === 'assessment' ? 'bg-blue-100 text-blue-800' :
                                              app.status === 'interview_scheduled' ? 'bg-purple-100 text-purple-800' :
                                              app.status === 'interview_completed' ? 'bg-indigo-100 text-indigo-800' :
                                              'bg-gray-100 text-gray-800'
                                            }`}>
                                              {
                                                app.status === 'shortlisted' ? '✅ Shortlisted' :
                                                app.status === 'rejected' ? '❌ Rejected' :
                                                app.status === 'under_review' ? '⏸️ Under Review' :
                                                app.status === 'assessment' ? '📝 Assessment Sent' :
                                                app.status === 'interview_scheduled' ? '📅 Interview Scheduled' :
                                                app.status === 'interview_completed' ? '✅ Interview Completed' :
                                                '📥 Received'
                                              }
                                            </span>
                                            <span className="text-xs text-gray-500">
                                              Applied: {new Date(app.applied_date).toLocaleDateString()}
                                            </span>
                                          </div>
                                          
                                          <div className="flex space-x-2">
                                            {/* Primary Review Button */}
                                            <button 
                                              onClick={() => handleCandidateReview(app)}
                                              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors shadow-sm"
                                              title="Open comprehensive candidate review"
                                            >
                                              📋 Review Candidate
                                            </button>
                                            
                                            {/* Quick Actions */}
                                            <div className="flex space-x-1">
                                              <button
                                                onClick={() => handleShortlist(app.id)}
                                                disabled={app.status === 'shortlisted'}
                                                className={`px-3 py-2 text-sm rounded-lg transition-colors ${
                                                  app.status === 'shortlisted' 
                                                    ? 'bg-gray-200 text-gray-500 cursor-not-allowed' 
                                                    : 'bg-green-600 hover:bg-green-700 text-white shadow-sm'
                                                }`}
                                                title="Shortlist candidate"
                                              >
                                                ✅
                                              </button>
                                              <button
                                                onClick={() => handleHold(app.id)}
                                                disabled={app.status === 'under_review'}
                                                className={`px-3 py-2 text-sm rounded-lg transition-colors ${
                                                  app.status === 'under_review' 
                                                    ? 'bg-gray-200 text-gray-500 cursor-not-allowed' 
                                                    : 'bg-yellow-600 hover:bg-yellow-700 text-white shadow-sm'
                                                }`}
                                                title="Put on hold"
                                              >
                                                ⏸️
                                              </button>
                                              <button
                                                onClick={() => handleReject(app.id)}
                                                disabled={app.status === 'rejected'}
                                                className={`px-3 py-2 text-sm rounded-lg transition-colors ${
                                                  app.status === 'rejected' 
                                                    ? 'bg-gray-200 text-gray-500 cursor-not-allowed' 
                                                    : 'bg-red-600 hover:bg-red-700 text-white shadow-sm'
                                                }`}
                                                title="Reject candidate"
                                              >
                                                ❌
                                              </button>
                                            </div>
                                          </div>
                                        </div>
                                        
                                        {/* Interview Actions */}
                                        {(app.status === 'shortlisted' || app.status === 'assessment') && (
                                          <div className="mt-3 pt-3 border-t border-gray-100 flex space-x-2">
                                            <button
                                              onClick={() => {
                                                setSelectedApplicationForInterview(app);
                                                setShowInterviewScheduler(true);
                                              }}
                                              className="px-3 py-1 bg-teal-600 hover:bg-teal-700 text-white text-xs rounded-md transition-colors"
                                            >
                                              📅 Schedule Interview
                                            </button>
                                            <button
                                              onClick={() => handleStartAIInterview(app.job_id, app)}
                                              className="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white text-xs rounded-md transition-colors"
                                            >
                                              🤖 AI Interview
                                            </button>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* KANBAN BOARD */}
        {activeTab === 'kanban' && (
          <div>
            {/* Job Selector */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">Select Job to View Candidates:</label>
              <select
                value={selectedJobForKanban || ''}
                onChange={(e) => setSelectedJobForKanban(e.target.value ? parseInt(e.target.value) : null)}
                className="block w-full max-w-md border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-primary focus:border-primary"
              >
                <option value="">-- Select a Job --</option>
                {jobs.filter(j => j.is_active).map(job => (
                  <option key={job.id} value={job.id}>
                    {job.title} - {job.department}
                  </option>
                ))}
              </select>
            </div>

            {/* Kanban Board Component */}
            {selectedJobForKanban ? (
              <KanbanBoard jobId={selectedJobForKanban} />
            ) : (
              <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">No Job Selected</h3>
                <p className="mt-1 text-sm text-gray-500">Select a job from the dropdown above to view candidates in Kanban view</p>
              </div>
            )}
          </div>
        )}

        {/* JOB BOARD (Candidate) */}
        {activeTab === 'board' && (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {jobs.filter(j => j.is_active).map(job => (
              <div key={job.id} className="bg-white overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow border border-gray-100 relative">
                {/* Delete Button */}
                <button
                  onClick={() => handleDeleteJob(job.id)}
                  className="absolute top-3 right-3 w-8 h-8 bg-red-50 hover:bg-red-100 text-red-600 rounded-full flex items-center justify-center transition-colors z-10"
                  title="Delete Job"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>

                <div className="px-4 py-5 sm:p-6">
                  <h3 className="text-lg font-medium text-gray-900 truncate pr-8">{job.title}</h3>
                  <p className="mt-1 text-sm text-gray-500">{job.department} • {job.location}</p>
                  <p className="mt-2 text-sm text-gray-600 line-clamp-3">{job.description}</p>
                  
                  {/* Application Link Display */}
                  {job.application_link_code && (
                    <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <label className="block text-xs font-medium text-blue-900 mb-1">Unique Application Link:</label>
                      <div className="flex items-center space-x-2">
                        <input
                          type="text"
                          value={`${window.location.origin}/apply/${job.application_link_code}`}
                          readOnly
                          className="flex-1 text-xs bg-white border border-blue-300 rounded px-2 py-1 text-blue-800"
                        />
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(`${window.location.origin}/apply/${job.application_link_code}`);
                            alert('Link copied to clipboard!');
                          }}
                          className="px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
                          title="Copy Link"
                        >
                          📋
                        </button>
                        <button
                          onClick={() => window.open(`/apply/${job.application_link_code}`, '_blank')}
                          className="px-2 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700"
                          title="Open Link"
                        >
                          🔗
                        </button>
                      </div>
                    </div>
                  )}
                  
                  <div className="mt-4 flex space-x-2">
                    <button
                      onClick={() => openApplyModal(job)}
                      className="flex-1 bg-primary text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700"
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

      {/* Apply Modal */}
      {showApplyModal && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h2 className="text-xl font-bold mb-4">Apply for {selectedJobForApply?.title}</h2>
            <form onSubmit={handleApply} className="space-y-4">
              <input type="text" placeholder="Full Name" value={applicationData.candidate_name} onChange={(e) => setApplicationData({ ...applicationData, candidate_name: e.target.value })} required className="block w-full border-gray-300 rounded-md shadow-sm" />
              <input type="email" placeholder="Email Address" value={applicationData.candidate_email} onChange={(e) => setApplicationData({ ...applicationData, candidate_email: e.target.value })} required className="block w-full border-gray-300 rounded-md shadow-sm" />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Resume</label>
                <div className="space-y-2">
                  <input type="url" placeholder="Resume URL" value={applicationData.resume_url} onChange={(e) => setApplicationData({ ...applicationData, resume_url: e.target.value })} className="block w-full border-gray-300 rounded-md shadow-sm" />
                  <div className="text-center text-sm text-gray-500">- OR -</div>
                  <input type="file" accept=".pdf,.doc,.docx" onChange={(e) => setApplicationData({ ...applicationData, resume_file: e.target.files[0] })} className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-white hover:file:bg-blue-600" />
                </div>
              </div>
              <div className="flex justify-end space-x-3 mt-4">
                <button type="button" onClick={() => setShowApplyModal(false)} className="bg-gray-200 text-gray-700 px-4 py-2 rounded-md">Cancel</button>
                <button type="submit" className="bg-primary text-white px-4 py-2 rounded-md">Submit Application</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Enhanced Assessment Preview Modal */}
      {showAssessmentModal && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Assessment Preview & Configuration</h2>
              <button onClick={() => setShowAssessmentModal(false)} className="text-gray-400 hover:text-gray-500 text-2xl">✕</button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Settings Panel */}
              <div className="lg:col-span-1 bg-gray-50 p-4 rounded-lg border">
                <h3 className="font-semibold text-gray-900 mb-4">Assessment Settings</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Duration (minutes)</label>
                    <input
                      type="number"
                      value={assessmentSettings.duration_minutes}
                      onChange={(e) => setAssessmentSettings(prev => ({...prev, duration_minutes: parseInt(e.target.value)}))}
                      className="w-full border-gray-300 rounded-md shadow-sm text-sm"
                      min="15"
                      max="180"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Passing Score (%)</label>
                    <input
                      type="number"
                      value={assessmentSettings.passing_score}
                      onChange={(e) => setAssessmentSettings(prev => ({...prev, passing_score: parseFloat(e.target.value)}))}
                      className="w-full border-gray-300 rounded-md shadow-sm text-sm"
                      min="0"
                      max="100"
                      step="0.1"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Difficulty Level</label>
                    <select
                      value={assessmentSettings.difficulty}
                      onChange={(e) => {
                        setAssessmentSettings(prev => ({...prev, difficulty: e.target.value}));
                        handleRegenerateQuestions(jobs.find(j => j.current_step === 4)?.id, e.target.value);
                      }}
                      className="w-full border-gray-300 rounded-md shadow-sm text-sm"
                    >
                      <option value="easy">Easy</option>
                      <option value="medium">Medium</option>
                      <option value="hard">Hard</option>
                    </select>
                  </div>

                  <div>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={assessmentSettings.proctoring_enabled}
                        onChange={(e) => setAssessmentSettings(prev => ({...prev, proctoring_enabled: e.target.checked}))}
                        className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                      />
                      <span className="ml-2 text-sm text-gray-700">Enable Proctoring</span>
                    </label>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Instructions</label>
                    <textarea
                      value={assessmentSettings.instructions}
                      onChange={(e) => setAssessmentSettings(prev => ({...prev, instructions: e.target.value}))}
                      rows={3}
                      className="w-full border-gray-300 rounded-md shadow-sm text-sm"
                    />
                  </div>
                </div>

                {/* Assessment Stats */}
                <div className="mt-6 p-3 bg-blue-50 rounded border border-blue-200">
                  <h4 className="font-medium text-blue-900 mb-2">Assessment Overview</h4>
                  <div className="text-sm text-blue-800 space-y-1">
                    <p>• Total Questions: {assessmentQuestions.length}</p>
                    <p>• Estimated Time: {Math.ceil(assessmentQuestions.length * 2)} minutes</p>
                    <p>• Question Types: Multiple Choice, Text</p>
                    <p>• Auto-scoring: Enabled</p>
                  </div>
                </div>
              </div>

              {/* Questions Preview */}
              <div className="lg:col-span-2">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-semibold text-gray-900">Generated Questions</h3>
                  <button
                    onClick={() => handleRegenerateQuestions(jobs.find(j => j.current_step === 4)?.id, assessmentSettings.difficulty)}
                    className="text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1 rounded"
                  >
                    🔄 Regenerate
                  </button>
                </div>

                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {assessmentQuestions.map((q, idx) => (
                    <div key={idx} className="bg-white p-4 rounded border border-gray-200 shadow-sm">
                      <div className="flex justify-between items-start mb-2">
                        <p className="font-medium text-gray-900">{idx + 1}. {q.q}</p>
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                          {q.options && q.options.length > 1 ? 'Multiple Choice' : 'Text Answer'}
                        </span>
                      </div>
                      
                      {q.options && q.options.length > 1 ? (
                        <div className="space-y-1 ml-4">
                          {q.options.map((opt, i) => (
                            <div key={i} className="flex items-center">
                              <div className={`w-3 h-3 rounded-full mr-2 ${opt === q.answer ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                              <span className={`text-sm ${opt === q.answer ? 'text-green-700 font-medium' : 'text-gray-700'}`}>
                                {opt}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-600 ml-4 italic">Open-ended question</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="mt-6 flex justify-between items-center pt-4 border-t border-gray-200">
              <div className="text-sm text-gray-600">
                This assessment will be sent to all shortlisted candidates with a 48-hour deadline.
              </div>
              <div className="flex space-x-3">
                <button 
                  onClick={() => setShowAssessmentModal(false)} 
                  className="bg-gray-200 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => handleSendAssessment(jobs.find(j => j.current_step === 4)?.id)} 
                  className="bg-primary text-white px-6 py-2 rounded-md hover:bg-blue-600 font-medium"
                >
                  Send Assessment to Candidates
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Score Breakdown Modal */}
      {showScoreBreakdown && scoreBreakdown && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900">AI Resume Scoring Breakdown</h2>
              <button onClick={() => setShowScoreBreakdown(false)} className="text-gray-400 hover:text-gray-500 text-2xl">×</button>
            </div>

            {scoreBreakdown.error ? (
              <div className="bg-red-50 border border-red-200 rounded p-4 text-red-700">
                {scoreBreakdown.error}
              </div>
            ) : (
              <div className="space-y-6">
                {/* Overall Score */}
                <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-6 rounded-lg border border-blue-200">
                  <div className="text-center">
                    <p className="text-sm text-gray-600 mb-2">Overall AI Fit Score</p>
                    <p className="text-5xl font-bold text-blue-600">{scoreBreakdown.overall_score}%</p>
                  </div>
                </div>

                {/* Individual Scores */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <p className="text-xs text-gray-500 mb-1">Keyword Match</p>
                    <div className="flex items-center">
                      <div className="flex-1 bg-gray-200 rounded-full h-2 mr-2">
                        <div className="bg-blue-500 h-2 rounded-full" style={{width: `${scoreBreakdown.keyword_match}%`}}></div>
                      </div>
                      <span className="text-sm font-bold text-gray-700">{scoreBreakdown.keyword_match}%</span>
                    </div>
                  </div>

                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <p className="text-xs text-gray-500 mb-1">Skills Match</p>
                    <div className="flex items-center">
                      <div className="flex-1 bg-gray-200 rounded-full h-2 mr-2">
                        <div className="bg-green-500 h-2 rounded-full" style={{width: `${scoreBreakdown.skills_match}%`}}></div>
                      </div>
                      <span className="text-sm font-bold text-gray-700">{scoreBreakdown.skills_match}%</span>
                    </div>
                  </div>

                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <p className="text-xs text-gray-500 mb-1">Experience Match</p>
                    <div className="flex items-center">
                      <div className="flex-1 bg-gray-200 rounded-full h-2 mr-2">
                        <div className="bg-purple-500 h-2 rounded-full" style={{width: `${scoreBreakdown.experience_match}%`}}></div>
                      </div>
                      <span className="text-sm font-bold text-gray-700">{scoreBreakdown.experience_match}%</span>
                    </div>
                  </div>

                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <p className="text-xs text-gray-500 mb-1">Education Match</p>
                    <div className="flex items-center">
                      <div className="flex-1 bg-gray-200 rounded-full h-2 mr-2">
                        <div className="bg-yellow-500 h-2 rounded-full" style={{width: `${scoreBreakdown.education_match}%`}}></div>
                      </div>
                      <span className="text-sm font-bold text-gray-700">{scoreBreakdown.education_match}%</span>
                    </div>
                  </div>

                  <div className="bg-white border border-gray-200 rounded-lg p-4 col-span-2">
                    <p className="text-xs text-gray-500 mb-1">Resume Quality</p>
                    <div className="flex items-center">
                      <div className="flex-1 bg-gray-200 rounded-full h-2 mr-2">
                        <div className="bg-indigo-500 h-2 rounded-full" style={{width: `${scoreBreakdown.quality_score}%`}}></div>
                      </div>
                      <span className="text-sm font-bold text-gray-700">{scoreBreakdown.quality_score}%</span>
                    </div>
                  </div>
                </div>

                {/* Extracted Data */}
                {scoreBreakdown.extracted_data && (
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <h3 className="font-semibold text-gray-900 mb-3">Extracted Information</h3>
                    
                    {scoreBreakdown.extracted_data.technical_skills?.length > 0 && (
                      <div className="mb-3">
                        <p className="text-xs text-gray-600 mb-1">Technical Skills Found:</p>
                        <div className="flex flex-wrap gap-1">
                          {scoreBreakdown.extracted_data.technical_skills.map((skill, i) => (
                            <span key={i} className="bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded">{skill}</span>
                          ))}
                        </div>
                      </div>
                    )}

                    {scoreBreakdown.extracted_data.soft_skills?.length > 0 && (
                      <div className="mb-3">
                        <p className="text-xs text-gray-600 mb-1">Soft Skills Found:</p>
                        <div className="flex flex-wrap gap-1">
                          {scoreBreakdown.extracted_data.soft_skills.map((skill, i) => (
                            <span key={i} className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded">{skill}</span>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-4 text-sm">
                      {scoreBreakdown.extracted_data.experience_years > 0 && (
                        <div>
                          <span className="text-gray-600">Experience:</span>
                          <span className="ml-2 font-medium">{scoreBreakdown.extracted_data.experience_years} years</span>
                        </div>
                      )}
                      {scoreBreakdown.extracted_data.email && (
                        <div>
                          <span className="text-gray-600">Email:</span>
                          <span className="ml-2 font-medium text-xs">{scoreBreakdown.extracted_data.email}</span>
                        </div>
                      )}
                      {scoreBreakdown.extracted_data.phone && (
                        <div>
                          <span className="text-gray-600">Phone:</span>
                          <span className="ml-2 font-medium text-xs">{scoreBreakdown.extracted_data.phone}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Scoring Methodology */}
                <div className="bg-blue-50 border border-blue-200 rounded p-4">
                  <p className="text-xs text-blue-900 font-semibold mb-2">How AI Scoring Works:</p>
                  <ul className="text-xs text-blue-800 space-y-1">
                    <li>• <strong>Keyword Match (30%):</strong> TF-IDF similarity between resume and job description</li>
                    <li>• <strong>Skills Match (25%):</strong> Technical skills alignment with requirements</li>
                    <li>• <strong>Experience Match (20%):</strong> Years of experience vs requirements</li>
                    <li>• <strong>Education Match (15%):</strong> Degree and qualification alignment</li>
                    <li>• <strong>Resume Quality (10%):</strong> Structure, grammar, and presentation</li>
                  </ul>
                </div>
              </div>
            )}

            <div className="mt-6 flex justify-end">
              <button onClick={() => setShowScoreBreakdown(false)} className="bg-gray-200 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-300">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AI Interview Modal */}
      {showInterviewModal && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-95 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg w-full max-w-6xl h-[90vh] flex overflow-hidden shadow-2xl">

            {/* Left: AI Interviewer */}
            <div className="w-1/3 bg-gray-900 p-6 flex flex-col border-r border-gray-700">
              <div className="flex items-center space-x-3 mb-8">
                <div className="w-12 h-12 rounded-full bg-purple-600 flex items-center justify-center text-2xl">🤖</div>
                <div>
                  <h3 className="text-white font-bold text-lg">AI Interviewer</h3>
                  <p className="text-green-400 text-xs flex items-center">● Live</p>
                </div>
              </div>

              <div className="flex-1 flex flex-col justify-center items-center p-8 text-center">
                {/* Current Question Display (Teleprompter Style) */}
                <div className="mb-12">
                  <p className="text-gray-400 text-sm uppercase tracking-widest mb-4">Current Question</p>
                  <h2 className="text-3xl font-bold text-white leading-relaxed">
                    {currentQuestionIndex < interviewQuestions.length
                      ? interviewQuestions[currentQuestionIndex]
                      : "Interview Completed"}
                  </h2>
                </div>

                {/* Recording Status */}
                {isRecording && (
                  <div className="mb-8 flex flex-col items-center animate-pulse">
                    <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center mb-2 shadow-[0_0_20px_rgba(220,38,38,0.6)]">
                      <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
                    </div>
                    <p className="text-red-400 font-medium">Listening...</p>
                  </div>
                )}
              </div>

              <div className="mt-auto">
                {currentQuestionIndex < interviewQuestions.length ? (
                  <div className="space-y-3">
                    <button
                      onClick={toggleRecording}
                      className={`w-full py-6 rounded-xl font-bold text-lg transition-all transform hover:scale-[1.02] active:scale-[0.98] ${isRecording
                          ? 'bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-900/50'
                          : 'bg-purple-600 hover:bg-purple-700 text-white shadow-lg shadow-purple-900/50'
                        }`}
                    >
                      {isRecording ? '⏹ Stop & Submit Answer' : '🎙️ Start Recording Answer'}
                    </button>
                    <p className="text-center text-gray-500 text-xs mt-2">Speak clearly into your microphone</p>
                  </div>
                ) : (
                  <button
                    onClick={async () => {
                      // Mark interview as completed
                      try {
                        const currentApp = applications.find(app => 
                          conversationHistory.some(msg => msg.sender === 'bot')
                        );
                        if (currentApp) {
                          await api.patch(`/recruitment/applications/${currentApp.id}/status?status=interview_completed`);
                          // Update local state
                          setApplications(prev => prev.map(app => 
                            app.id === currentApp.id ? { ...app, status: 'interview_completed' } : app
                          ));
                        }
                      } catch (error) {
                        console.error('Error updating interview status:', error);
                      }
                      setShowInterviewModal(false);
                    }}
                    className="w-full bg-green-600 hover:bg-green-700 text-white py-4 rounded-lg font-medium transition-colors"
                  >
                    Finish Interview
                  </button>
                )}
              </div>
            </div>

            {/* Right: Candidate Camera & Proctoring */}
            <div className="w-2/3 bg-black relative flex flex-col">
              {/* Top Bar */}
              <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center z-10 bg-gradient-to-b from-black to-transparent">
                <div className="flex items-center space-x-2 bg-red-600/80 px-3 py-1 rounded-full backdrop-blur-sm">
                  <span className="animate-pulse w-2 h-2 bg-white rounded-full"></span>
                  <span className="text-white text-xs font-bold uppercase tracking-wider">Proctoring Active</span>
                </div>
                <div className="text-gray-400 text-sm">Session ID: #8X92-AI</div>
              </div>

              {/* Camera Feed Placeholder */}
              <div className="flex-1 flex items-center justify-center relative bg-gray-900 overflow-hidden">
                <Webcam
                  audio={false}
                  ref={webcamRef}
                  screenshotFormat="image/jpeg"
                  className="w-full h-full object-cover"
                  videoConstraints={{ facingMode: "user" }}
                />

                {/* Overlay UI */}
                <div className="absolute bottom-4 left-0 right-0 flex justify-center">
                  <div className="bg-black/50 px-4 py-2 rounded-full backdrop-blur-sm text-white text-xs flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span>Camera Active</span>
                  </div>
                </div>

                {/* Fake Face Tracking Box */}
                <div className="absolute w-64 h-64 border-2 border-green-500 rounded-lg opacity-50 flex items-start justify-center pointer-events-none">
                  <span className="bg-green-500 text-black text-[10px] px-1 font-bold">Face Detected (99%)</span>
                </div>
              </div>

              {/* Warnings Overlay */}
              <div className="absolute bottom-8 left-8 right-8 space-y-2">
                {proctorWarnings.map((warn, i) => (
                  <div key={i} className="bg-red-500/90 text-white px-4 py-3 rounded-lg shadow-lg flex items-center animate-bounce">
                    <span className="text-xl mr-3">⚠️</span>
                    <span className="font-bold">{warn}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Interview Scheduler Modal */}
      {showInterviewScheduler && selectedApplicationForInterview && (
        <InterviewScheduler
          application={selectedApplicationForInterview}
          onClose={() => {
            setShowInterviewScheduler(false);
            setSelectedApplicationForInterview(null);
          }}
          onScheduled={handleInterviewScheduled}
        />
      )}

      {/* Candidate Review Modal */}
      {showCandidateReview && selectedApplicationForReview && (
        <CandidateReviewModal
          application={selectedApplicationForReview}
          onClose={() => {
            setShowCandidateReview(false);
            setSelectedApplicationForReview(null);
          }}
          onStatusUpdate={handleStatusUpdateFromReview}
        />
      )}
    </div>
  );
}
