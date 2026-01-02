import { useState, useEffect } from 'react';
import api from '../api/axios';
import EmployeeInformationForm from '../components/onboarding/employeeinformationform';
import ITResourcesView from '../components/onboarding/ITResourcesView';
import OnboardingProgress from '../components/onboarding/OnboardingProgress';
import OnboardingTimeline from '../components/onboarding/OnboardingTimeline';

export default function Onboarding() {
  const [currentPhase, setCurrentPhase] = useState(1);
  const [offerLetter, setOfferLetter] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [inductionModules, setInductionModules] = useState([]);
  const [employee, setEmployee] = useState(null);
  const [showEmployeeForm, setShowEmployeeForm] = useState(false);
  const [employeeFormCompleted, setEmployeeFormCompleted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showITResources, setShowITResources] = useState(false);
  const [showTimeline, setShowTimeline] = useState(false);

  // Chatbot State
  const [chatMessage, setChatMessage] = useState('');
  const [chatHistory, setChatHistory] = useState([
    { sender: 'bot', text: 'Hi! I am your Onboarding Assistant. Ask me anything about your first day, WiFi, or benefits!' }
  ]);

  useEffect(() => {
    console.log('Onboarding component mounted, initializing...');
    initializeOnboarding();
  }, []);

  const initializeOnboarding = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Initialize with default values first to prevent blank screen
      setEmployee({
        first_name: 'Employee',
        is_immediate_joiner: false,
        it_setup_status: 'pending'
      });
      
      await Promise.all([
        fetchEmployee().catch(err => {
          console.warn('Failed to fetch employee:', err);
          return null;
        }),
        fetchDocuments().catch(err => {
          console.warn('Failed to fetch documents:', err);
          return null;
        }),
        fetchInduction().catch(err => {
          console.warn('Failed to fetch induction:', err);
          return null;
        }),
        fetchOffer().catch(err => {
          console.warn('Failed to fetch offer:', err);
          return null;
        })
      ]);
      
      setLoading(false);
    } catch (error) {
      console.error('Error initializing onboarding:', error);
      setError('Failed to load onboarding data. Using demo mode.');
      
      // Ensure we always have default values
      setEmployee(prev => prev || {
        first_name: 'Employee',
        is_immediate_joiner: false,
        it_setup_status: 'pending'
      });
      
      setLoading(false);
    }
  };

  const fetchEmployee = async () => {
    try {
      // First try to get employee ID
      const employeeRes = await api.get('/onboarding/my-employee-id');
      const employeeData = employeeRes.data;
      
      // Then try to get full profile
      try {
        const profileRes = await api.get('/users/me/profile');
        setEmployee({
          ...profileRes.data,
          id: employeeData.employee_id,
          first_name: employeeData.name?.split(' ')[0] || 'Employee',
          last_name: employeeData.name?.split(' ').slice(1).join(' ') || ''
        });
      } catch (profileError) {
        console.warn('Profile not found, using employee data:', profileError);
        // Use employee data as fallback
        setEmployee({
          id: employeeData.employee_id,
          first_name: employeeData.name?.split(' ')[0] || 'Employee',
          last_name: employeeData.name?.split(' ').slice(1).join(' ') || '',
          is_immediate_joiner: false,
          it_setup_status: 'pending'
        });
      }
    } catch (error) {
      console.error('Error fetching employee data', error);
      // Set default employee data if API fails
      setEmployee({
        first_name: 'Employee',
        is_immediate_joiner: false,
        it_setup_status: 'pending'
      });
      // Don't throw error to prevent breaking the initialization
    }
  };

  const fetchDocuments = async () => {
    try {
      const res = await api.get('/onboarding/documents');
      setDocuments(res.data);
    } catch (error) { 
      console.error('Error fetching docs', error);
      setDocuments([]); // Set empty array as fallback
    }
  };

  const fetchOffer = async () => {
    try {
      const res = await api.post('/onboarding/generate-offer');
      setOfferLetter(res.data);
    } catch (error) { 
      console.error('Error fetching offer', error);
      // Set mock offer letter if API fails
      setOfferLetter({
        id: 1,
        content: 'Welcome to the team!',
        is_signed: false
      });
    }
  };

  const fetchInduction = async () => {
    try {
      const res = await api.get('/onboarding/induction-modules');
      setInductionModules(res.data);
    } catch (error) { 
      console.error('Error fetching induction', error);
      // Set mock induction modules if API fails
      setInductionModules([
        {
          id: 1,
          title: 'Company Culture',
          description: 'Learn about our values and culture',
          video_url: '#'
        },
        {
          id: 2,
          title: 'IT Security Policy',
          description: 'Important security guidelines',
          video_url: '#'
        }
      ]);
    }
  };

  const handleSignOffer = async () => {
    try {
      const res = await api.post('/onboarding/sign-offer');
      setOfferLetter(res.data);
      alert('Offer Letter Signed Successfully!');
    } catch (error) { console.error('Error signing offer', error); }
  };

  const handleDocUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('doc_type', 'ID Proof');

    try {
      const res = await api.post('/onboarding/upload-doc', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      if (res.data.is_verified) {
        alert(`✅ Document Verified! (Confidence: ${res.data.ocr_confidence}%)`);
      } else {
        alert(`❌ Document Rejected. Reason: ${res.data.rejection_reason} (Confidence: ${res.data.ocr_confidence}%)`);
      }
      fetchDocuments();
    } catch (error) { console.error('Error uploading doc', error); }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!chatMessage.trim()) return;
    const newHistory = [...chatHistory, { sender: 'user', text: chatMessage }];
    setChatHistory(newHistory);
    setChatMessage('');
    try {
      const res = await api.post('/onboarding/chat', null, { params: { message: chatMessage } });
      setChatHistory([...newHistory, { sender: 'bot', text: res.data.response }]);
    } catch (error) { console.error('Error chatting', error); }
  };

  const PHASES = [
    { id: 1, title: 'Pre-Boarding', desc: 'Engagement & Prep' },
    { id: 2, title: 'Initiation', desc: 'Day 1 Kickoff' },
    { id: 3, title: 'Parallel Tracks', desc: 'Manager, IT, Compliance' },
    { id: 4, title: 'Induction', desc: 'Training Modules' },
    { id: 5, title: 'Activation', desc: 'HR Approval' },
    { id: 6, title: 'Monitoring', desc: 'Ongoing Support' },
  ];

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your onboarding journey...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Onboarding Journey</h1>
              <p className="text-gray-500">Welcome to the team, {employee?.first_name || 'Employee'}!</p>
            </div>
            
            {/* Header Actions */}
            <div className="flex gap-3">
              <button
                onClick={() => setShowTimeline(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 flex items-center"
              >
                📅 View Timeline
              </button>
              <button
                onClick={() => window.location.reload()}
                className="bg-gray-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-700"
              >
                🔄 Refresh
              </button>
            </div>
          </div>
          
          {/* Progress Overview */}
          {employee?.id && (
            <div className="mt-6">
              <OnboardingProgress employeeId={employee.id} />
            </div>
          )}
          
          {/* Error Alert */}
          {error && (
            <div className="mt-4 bg-yellow-50 border-l-4 border-yellow-400 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <span className="text-yellow-400">⚠️</span>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-yellow-700">{error}</p>
                  {process.env.NODE_ENV === 'development' && (
                    <button
                      onClick={async () => {
                        try {
                          console.log('Testing API connection...');
                          const response = await api.get('/onboarding/my-employee-id');
                          console.log('API test successful:', response.data);
                          alert('API connection successful!');
                        } catch (err) {
                          console.error('API test failed:', err);
                          alert(`API test failed: ${err.response?.data?.detail || err.message}`);
                        }
                      }}
                      className="mt-2 px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
                    >
                      Test API Connection
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Immediate Joiner Alert */}
        {employee?.is_immediate_joiner && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-8 animate-pulse">
            <div className="flex">
              <div className="flex-shrink-0">
                <span className="text-2xl">⚡</span>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">URGENT: Immediate Joiner Detected</h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>You are joining in less than 7 days. All workflows have been expedited to <strong>24-hour SLA</strong>.</p>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar Navigation */}
          <div className="lg:col-span-1">
            <nav className="space-y-2">
              {PHASES.map((phase) => (
                <button
                  key={phase.id}
                  onClick={() => setCurrentPhase(phase.id)}
                  className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors ${currentPhase === phase.id
                      ? 'bg-primary text-white shadow-md'
                      : 'bg-white text-gray-700 hover:bg-gray-100'
                    }`}
                >
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center mr-3 text-xs ${currentPhase === phase.id ? 'bg-white text-primary font-bold' : 'bg-gray-200 text-gray-500'
                    }`}>
                    {phase.id}
                  </span>
                  <div className="text-left">
                    <div className="font-bold">{phase.title}</div>
                    <div className={`text-xs ${currentPhase === phase.id ? 'text-blue-100' : 'text-gray-400'}`}>{phase.desc}</div>
                  </div>
                </button>
              ))}
            </nav>

            {/* Chatbot Widget */}
            <div className="mt-8 bg-white rounded-lg shadow-lg overflow-hidden flex flex-col h-96">
              <div className="bg-blue-600 p-3 text-white font-medium flex items-center">
                <span className="mr-2">🤖</span> AI Assistant
              </div>
              <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-gray-50">
                {chatHistory.map((msg, idx) => (
                  <div key={idx} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] rounded-lg px-3 py-2 text-xs ${msg.sender === 'user' ? 'bg-primary text-white' : 'bg-white border border-gray-200 text-gray-800'
                      }`}>
                      {msg.text}
                    </div>
                  </div>
                ))}
              </div>
              <div className="p-2 border-t bg-white">
                <form onSubmit={handleSendMessage} className="flex">
                  <input
                    type="text"
                    value={chatMessage}
                    onChange={(e) => setChatMessage(e.target.value)}
                    placeholder="Ask a question..."
                    className="flex-1 text-sm border-gray-300 rounded-l-md focus:ring-primary focus:border-primary"
                  />
                  <button type="submit" className="bg-primary text-white px-3 rounded-r-md text-sm">Send</button>
                </form>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3 space-y-6">

            {/* PHASE 1: Pre-Boarding */}
            {currentPhase === 1 && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-bold mb-4">Phase 1: Pre-Boarding Engagement</h2>
                <div className="space-y-4">
                  <div className="p-4 border border-green-200 bg-green-50 rounded-md">
                    <h3 className="font-medium text-green-800">✅ Offer Accepted</h3>
                    <p className="text-sm text-green-600">Welcome to the family! Your journey starts now.</p>
                  </div>

                  {offerLetter && (
                    <div className="border rounded-md p-4">
                      <h3 className="font-medium mb-2">Offer Letter Status</h3>
                      <div className="flex justify-between items-center">
                        <span className={`px-2 py-1 rounded text-xs font-bold ${offerLetter.is_signed ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                          {offerLetter.is_signed ? 'SIGNED' : 'PENDING SIGNATURE'}
                        </span>
                        {!offerLetter.is_signed && (
                          <button onClick={handleSignOffer} className="text-primary text-sm hover:underline">Sign Now</button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* PHASE 2: Initiation */}
            {currentPhase === 2 && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-bold mb-4">Phase 2: Day 1 Initiation</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 border rounded-md hover:shadow-md transition-shadow">
                    <h3 className="font-bold text-gray-800">Your Onboarding Buddy</h3>
                    <p className="text-sm text-gray-600 mt-1">Sarah Jenkins (Product Manager)</p>
                    <p className="text-xs text-gray-400 mt-2">sarah.j@company.com</p>
                  </div>
                  <div className="p-4 border rounded-md hover:shadow-md transition-shadow">
                    <h3 className="font-bold text-gray-800">First Day Schedule</h3>
                    <ul className="mt-2 text-sm text-gray-600 space-y-1">
                      <li>• 09:30 AM - IT Setup</li>
                      <li>• 11:00 AM - Team Intro</li>
                      <li>• 02:00 PM - HR Orientation</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* PHASE 3: Parallel Tracks */}
            {currentPhase === 3 && (
              <div className="space-y-6">
                {/* Track A: Manager */}
                <div className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-500">
                  <h3 className="text-lg font-bold text-gray-900 mb-2">Track A: Manager Accountability</h3>
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <span className="text-green-500">✔</span>
                    <span>30-60-90 Day Goals Defined</span>
                  </div>
                  <div className="flex items-center space-x-2 text-sm text-gray-600 mt-1">
                    <span className="text-green-500">✔</span>
                    <span>Workspace Prepared</span>
                  </div>
                </div>

                {/* Track B: Infrastructure Setup (Handled by Assets Team) */}
                <div className="bg-white rounded-lg shadow p-6 border-l-4 border-purple-500">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-lg font-bold text-gray-900 mb-2">Track B: Infrastructure Setup</h3>
                      <p className="text-sm text-gray-500">Infrastructure setup is handled by the Assets Team after compliance approval</p>
                    </div>
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800">
                      ASSETS TEAM
                    </span>
                  </div>

                  {/* Infrastructure Items */}
                  <div className="mt-4 grid grid-cols-2 md:grid-cols-5 gap-4">
                    <div className="p-3 rounded-lg border-2 bg-blue-50 border-blue-200">
                      <div className="flex items-center">
                        <span className="text-lg mr-2 text-blue-600">💻</span>
                        <div>
                          <p className="text-xs font-semibold text-blue-900">Laptop</p>
                          <p className="text-xs text-blue-700">Hardware</p>
                        </div>
                      </div>
                    </div>

                    <div className="p-3 rounded-lg border-2 bg-blue-50 border-blue-200">
                      <div className="flex items-center">
                        <span className="text-lg mr-2 text-blue-600">📧</span>
                        <div>
                          <p className="text-xs font-semibold text-blue-900">Email</p>
                          <p className="text-xs text-blue-700">Setup</p>
                        </div>
                      </div>
                    </div>

                    <div className="p-3 rounded-lg border-2 bg-blue-50 border-blue-200">
                      <div className="flex items-center">
                        <span className="text-lg mr-2 text-blue-600">📶</span>
                        <div>
                          <p className="text-xs font-semibold text-blue-900">WiFi</p>
                          <p className="text-xs text-blue-700">Access</p>
                        </div>
                      </div>
                    </div>

                    <div className="p-3 rounded-lg border-2 bg-blue-50 border-blue-200">
                      <div className="flex items-center">
                        <span className="text-lg mr-2 text-blue-600">🆔</span>
                        <div>
                          <p className="text-xs font-semibold text-blue-900">ID Card</p>
                          <p className="text-xs text-blue-700">Access</p>
                        </div>
                      </div>
                    </div>

                    <div className="p-3 rounded-lg border-2 bg-blue-50 border-blue-200">
                      <div className="flex items-center">
                        <span className="text-lg mr-2 text-blue-600">👆</span>
                        <div>
                          <p className="text-xs font-semibold text-blue-900">Biometric</p>
                          <p className="text-xs text-blue-700">Setup</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-blue-800">
                      <strong>📋 New Process:</strong> After HR approves your compliance, they will click "Provide Infrastructure to New Employee" 
                      which sends a request to the Assets Team. The Assets Team will then provide all necessary equipment and setup with photo documentation.
                    </p>
                    <p className="text-xs text-blue-600 mt-2">
                      ✅ No manual IT setup required - everything is handled by the Assets Team with proper documentation
                    </p>
                  </div>
                </div>

                {/* Track C: Compliance */}
                <div className="bg-white rounded-lg shadow p-6 border-l-4 border-orange-500">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">Track C: Statutory Compliance & Employee Information</h3>

                  {/* Employee Information Form Button */}
                  <div className={`mb-6 p-4 rounded-lg border-2 ${
                    employeeFormCompleted
                      ? 'bg-green-50 border-green-300'
                      : 'bg-gradient-to-r from-orange-50 to-yellow-50 border-orange-300'
                  }`}>
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className={`font-semibold ${
                            employeeFormCompleted ? 'text-green-900' : 'text-orange-900'
                          }`}>
                            {employeeFormCompleted ? '✅ ' : '📋 '}
                            Employee Information Form
                          </h4>
                          {employeeFormCompleted && (
                            <span className="px-2 py-1 bg-green-200 text-green-800 text-xs rounded-full font-bold">
                              COMPLETED
                            </span>
                          )}
                        </div>
                        <p className={`text-sm mt-1 ${
                          employeeFormCompleted ? 'text-green-700' : 'text-orange-700'
                        }`}>
                          {employeeFormCompleted
                            ? 'Your information has been submitted successfully. You can view or edit it below.'
                            : 'Fill in your personal details, education, employment history, and statutory information (Required for onboarding)'}
                        </p>
                        {!employeeFormCompleted && (
                          <div className="mt-2 flex items-center gap-2 text-xs text-orange-600">
                            <span className="animate-pulse">⚠️</span>
                            <span className="font-medium">This form must be completed to proceed with onboarding</span>
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col gap-2">
                        <button
                          onClick={() => {
                            console.log('Start Onboarding clicked');
                            setShowEmployeeForm(true);
                          }}
                          disabled={employeeFormCompleted}
                          className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                            employeeFormCompleted
                              ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                              : 'bg-orange-600 text-white hover:bg-orange-700 shadow-md hover:shadow-lg'
                          }`}
                        >
                          {employeeFormCompleted ? '✓ Completed' : 'Fill Form Now'}
                        </button>
                        {employeeFormCompleted && (
                          <button
                            onClick={() => setShowEmployeeForm(true)}
                            className="px-4 py-2 rounded-lg font-medium text-sm bg-blue-100 text-blue-700 hover:bg-blue-200"
                          >
                            View Details
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Upload ID Proof (OCR Verified)</label>
                    <input
                      type="file"
                      onChange={handleDocUpload}
                      className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-orange-50 file:text-orange-700 hover:file:bg-orange-100"
                    />
                    <p className="text-xs text-gray-400 mt-1">Supported: PAN, Aadhaar. Min confidence: 75%.</p>
                  </div>

                  <div className="space-y-3">
                    {documents.map((doc) => (
                      <div key={doc.id} className="flex items-center justify-between p-3 bg-gray-50 rounded border">
                        <div className="flex items-center">
                          <span className="text-sm font-medium text-gray-700">{doc.document_type}</span>
                        </div>
                        <div className="text-right">
                          {doc.is_verified ? (
                            <span className="text-green-600 text-xs font-bold flex items-center">
                              ✅ Verified ({doc.ocr_confidence}%)
                            </span>
                          ) : (
                            <div className="flex flex-col items-end">
                              <span className="text-red-600 text-xs font-bold flex items-center">
                                ❌ Rejected ({doc.ocr_confidence}%)
                              </span>
                              <span className="text-[10px] text-red-500">{doc.rejection_reason}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* PHASE 4: Induction */}
            {currentPhase === 4 && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-bold mb-6">Phase 4: Induction Training</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {inductionModules.map((module) => (
                    <div key={module.id} className="border rounded-lg overflow-hidden">
                      <div className="bg-gray-200 h-32 flex items-center justify-center">
                        <span className="text-gray-500">▶ Video Player</span>
                      </div>
                      <div className="p-4">
                        <h3 className="font-bold text-gray-900">{module.title}</h3>
                        <p className="text-sm text-gray-500 mt-1">{module.description}</p>
                        <button className="mt-3 w-full border border-primary text-primary text-sm py-1 rounded hover:bg-blue-50">
                          Start Module
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* PHASE 5: Activation */}
            {currentPhase === 5 && (
              <div className="bg-white rounded-lg shadow p-6 text-center">
                <h2 className="text-xl font-bold mb-4">Phase 5: HR Approval & Activation</h2>
                <div className="max-w-md mx-auto bg-gray-50 p-6 rounded-lg border">
                  <div className="space-y-4 text-left">
                    <div className="flex justify-between">
                      <span>Manager Prep:</span>
                      <span className="text-green-600 font-bold">Completed</span>
                    </div>
                    <div className="flex justify-between">
                      <span>IT Setup:</span>
                      <span className={employee?.it_setup_status === 'completed' ? 'text-green-600 font-bold' : 'text-red-600 font-bold'}>
                        {employee?.it_setup_status === 'completed' ? 'Completed' : 'Pending'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Compliance:</span>
                      <span className="text-green-600 font-bold">Verified</span>
                    </div>
                  </div>
                  <div className="mt-8">
                    <button
                      disabled={employee?.it_setup_status !== 'completed'}
                      className="w-full bg-green-600 text-white py-3 rounded-lg font-bold hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                    >
                      {employee?.it_setup_status === 'completed' ? 'ACTIVATE EMPLOYEE' : 'Waiting for IT Setup...'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* PHASE 6: Monitoring */}
            {currentPhase === 6 && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-bold mb-6">Phase 6: Monitoring & Support</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-blue-50 p-4 rounded-lg text-center">
                    <h3 className="text-lg font-bold text-blue-800">30-Day Goal</h3>
                    <p className="text-3xl font-bold text-blue-600 mt-2">80%</p>
                    <p className="text-xs text-blue-500">On Track</p>
                  </div>
                  <div className="bg-purple-50 p-4 rounded-lg text-center">
                    <h3 className="text-lg font-bold text-purple-800">Training</h3>
                    <p className="text-3xl font-bold text-purple-600 mt-2">100%</p>
                    <p className="text-xs text-purple-500">Completed</p>
                  </div>
                  <div className="bg-orange-50 p-4 rounded-lg text-center">
                    <h3 className="text-lg font-bold text-orange-800">Feedback</h3>
                    <p className="text-3xl font-bold text-orange-600 mt-2">4.8/5</p>
                    <p className="text-xs text-orange-500">Manager Rating</p>
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>

      {/* Employee Information Form Modal */}
      {showEmployeeForm && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto"
          style={{ zIndex: 9999 }}
        >
          <div className="bg-white rounded-lg max-w-4xl w-full my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b sticky top-0 bg-white">
              <h2 className="text-2xl font-bold text-gray-900">Employee Information Form</h2>
              <button
                onClick={() => {
                  console.log('Closing employee form modal');
                  setShowEmployeeForm(false);
                }}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ×
              </button>
            </div>
            <div className="p-6">
              {/* Debug info */}
              {process.env.NODE_ENV === 'development' && (
                <div className="mb-4 p-2 bg-yellow-100 text-xs text-yellow-800 rounded">
                  Debug: Modal is showing, EmployeeInformationForm should render below
                </div>
              )}
              <EmployeeInformationForm
                onComplete={() => {
                  console.log('Employee form completed');
                  setEmployeeFormCompleted(true);
                  setShowEmployeeForm(false);
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* IT Resources View Modal */}
      {showITResources && employee?.id && (
        <ITResourcesView
          employeeId={employee.id}
          onClose={() => setShowITResources(false)}
        />
      )}

      {/* Timeline Modal */}
      {showTimeline && employee?.id && (
        <OnboardingTimeline
          employeeId={employee.id}
          onClose={() => setShowTimeline(false)}
        />
      )}

      {/* Debug panel for development */}
      {process.env.NODE_ENV === 'development' && (
        <div className="fixed bottom-4 right-4 bg-gray-800 text-white p-3 rounded text-xs max-w-xs">
          <div>Loading: {loading.toString()}</div>
          <div>Error: {error || 'none'}</div>
          <div>Employee: {employee?.first_name || 'none'}</div>
          <div>Show Form: {showEmployeeForm.toString()}</div>
          <div>Form Completed: {employeeFormCompleted.toString()}</div>
        </div>
      )}
    </div>
  );
}
