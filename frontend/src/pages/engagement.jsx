import { useState, useEffect } from 'react';
import api from '../api/axios';

export default function Engagement() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [currentUser, setCurrentUser] = useState(null);
  
  // Check if user can upload photos (admin, hr, manager)
  const canUploadPhotos = currentUser && ['admin', 'hr', 'manager'].includes(currentUser.role);

  // Sentiment Analysis State
  const [sentimentText, setSentimentText] = useState('');
  const [sentimentSource, setSentimentSource] = useState('Survey');
  const [sentimentResult, setSentimentResult] = useState(null);

  const [employees, setEmployees] = useState([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');

  useEffect(() => {
    fetchEmployees();
    fetchCurrentUser();
  }, []);
  
  const fetchCurrentUser = async () => {
    try {
      const res = await api.get('/users/me');
      setCurrentUser(res.data);
    } catch (err) {
      console.error('Error fetching current user:', err);
    }
  };

  const fetchEmployees = async () => {
    try {
      const res = await api.get('/employees/');
      setEmployees(res.data);
      if (res.data.length > 0) setSelectedEmployeeId(res.data[0].id);
    } catch (err) { console.error(err); }
  };

  useEffect(() => {
    if (selectedEmployeeId) {
      // In a real app, we would fetch specific risk metrics from backend
      // For now, we simulate "fetching" by randomizing slightly based on ID to show "interlinking"
      setAttritionData(prev => ({
        ...prev,
        employee_id: selectedEmployeeId,
        // Simulate different data for different employees
        engagement_score: selectedEmployeeId % 2 === 0 ? 8 : 4,
        workload_hours: selectedEmployeeId % 2 === 0 ? 40 : 55,
        no_promotion_years: selectedEmployeeId % 3,
      }));
    }
  }, [selectedEmployeeId]);

  // Attrition Prediction State
  const [attritionData, setAttritionData] = useState({
    employee_id: null,
    no_promotion_years: 3,
    below_market_salary: true,
    engagement_score: 4,
    job_search_activity: true,
    workload_hours: 55,
    team_conflicts: false,
    declined_projects: 1,
    satisfaction_score: 4
  });
  const [attritionResult, setAttritionResult] = useState(null);

  // Handlers
  const handleAnalyzeSentiment = async () => {
    try {
      const res = await api.post('/engagement/analyze-advanced-sentiment', { source: sentimentSource, text: sentimentText });
      setSentimentResult(res.data);
    } catch (err) { console.error(err); }
  };

  const handlePredictAttrition = async () => {
    try {
      // Get current employee ID if not set
      let dataToSend = { ...attritionData };
      if (!dataToSend.employee_id) {
        const empResponse = await api.get('/onboarding/my-employee-id');
        dataToSend.employee_id = empResponse.data.employee_id;
      }
      
      const res = await api.post('/engagement/predict-attrition', dataToSend);
      setAttritionResult(res.data);
    } catch (err) { 
      console.error(err);
      alert('Failed to predict attrition risk. Please try again.');
    }
  };

  // Renderers
  const renderSentiment = () => (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="font-bold text-lg mb-4">Advanced Sentiment Analysis 🧠</h3>
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700">Source</label>
          <select
            className="mt-1 block w-full border rounded p-2"
            value={sentimentSource}
            onChange={(e) => setSentimentSource(e.target.value)}
          >
            <option>Survey</option>
            <option>Email</option>
            <option>Slack</option>
            <option>Exit Interview</option>
            <option>1-on-1 Meeting</option>
          </select>
        </div>
        <textarea
          className="w-full p-3 border rounded-lg mb-4"
          rows="4"
          placeholder="Paste feedback text here..."
          value={sentimentText}
          onChange={(e) => setSentimentText(e.target.value)}
        />
        <button onClick={handleAnalyzeSentiment} className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700">Analyze</button>
      </div>

      {sentimentResult && (
        <div className="bg-white p-6 rounded-lg shadow animate-fade-in-up">
          <div className={`p-6 rounded-lg text-white mb-6 bg-gradient-to-r ${sentimentResult.sentiment.includes('Positive') ? 'from-green-400 to-green-600' :
            sentimentResult.sentiment.includes('Negative') ? 'from-red-400 to-red-600' : 'from-gray-400 to-gray-600'
            }`}>
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-4xl font-bold mb-1">
                  {sentimentResult.sentiment.includes('Positive') ? '😊' : sentimentResult.sentiment.includes('Negative') ? '😟' : '😐'} {sentimentResult.sentiment}
                </h2>
                <p className="opacity-90">Confidence: {sentimentResult.confidence}%</p>
              </div>
              <div className="text-right">
                <p className="text-sm uppercase tracking-wide opacity-75">Source</p>
                <p className="font-bold">{sentimentSource}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-gray-50 p-4 rounded text-center">
              <p className="text-gray-500 text-xs uppercase">Engagement</p>
              <p className="text-2xl font-bold text-blue-600">{sentimentResult.metrics.engagement}/10</p>
            </div>
            <div className="bg-gray-50 p-4 rounded text-center">
              <p className="text-gray-500 text-xs uppercase">Satisfaction</p>
              <p className="text-2xl font-bold text-green-600">{sentimentResult.metrics.satisfaction}/10</p>
            </div>
            <div className="bg-gray-50 p-4 rounded text-center">
              <p className="text-gray-500 text-xs uppercase">Morale</p>
              <p className="text-2xl font-bold text-purple-600">{sentimentResult.metrics.morale}/10</p>
            </div>
            <div className={`p-4 rounded text-center ${sentimentResult.metrics.stress > 7 ? 'bg-red-100' : sentimentResult.metrics.stress > 4 ? 'bg-yellow-100' : 'bg-green-100'}`}>
              <p className="text-gray-500 text-xs uppercase">Stress Level</p>
              <p className={`text-2xl font-bold ${sentimentResult.metrics.stress > 7 ? 'text-red-700' : 'text-gray-800'}`}>{sentimentResult.metrics.stress}/10</p>
            </div>
          </div>

          <div>
            <h4 className="font-bold mb-2">Key Topics Detected</h4>
            <div className="flex flex-wrap gap-2">
              {sentimentResult.topics.map((topic, i) => (
                <span key={i} className="px-3 py-1 bg-gray-100 rounded-full text-sm text-gray-700 border">
                  {topic.name}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // Pulse Survey State
  const [pulseMood, setPulseMood] = useState('');
  const [pulseComment, setPulseComment] = useState('');
  const [pulseHistory, setPulseHistory] = useState([]);

  // Recognition State
  const [recognitionRecipient, setRecognitionRecipient] = useState('');
  const [recognitionMessage, setRecognitionMessage] = useState('');
  const [recognitionBadge, setRecognitionBadge] = useState('star');
  const [recognitions, setRecognitions] = useState([]);

  // Feedback Wall State
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackCategory, setFeedbackCategory] = useState('general');
  const [feedbacks, setFeedbacks] = useState([]);

  // Wellness State
  const [wellnessScore, setWellnessScore] = useState(5);
  const [wellnessNotes, setWellnessNotes] = useState('');

  // Team Activities State
  const [activities, setActivities] = useState([
    { id: 1, title: 'Virtual Coffee Chat', date: '2024-12-05', type: 'virtual', participants: 12 },
    { id: 2, title: 'Team Lunch', date: '2024-12-10', type: 'physical', participants: 8 },
    { id: 3, title: 'Game Night', date: '2024-12-15', type: 'virtual', participants: 15 },
  ]);

  // Photo Gallery State
  const [galleryPhotos, setGalleryPhotos] = useState([
    { id: 1, title: 'Team Outing - Goa', date: '2024-11-15', photos: 24, thumbnail: '🏖️' },
    { id: 2, title: 'Diwali Celebration', date: '2024-11-01', photos: 18, thumbnail: '🪔' },
    { id: 3, title: 'Annual Day 2024', date: '2024-10-20', photos: 45, thumbnail: '🎉' },
    { id: 4, title: 'Hackathon Winners', date: '2024-10-10', photos: 12, thumbnail: '🏆' },
  ]);
  const [selectedAlbum, setSelectedAlbum] = useState(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  // Mini Games State
  const [currentGame, setCurrentGame] = useState(null);
  const [triviaQuestion, setTriviaQuestion] = useState(null);
  const [triviaScore, setTriviaScore] = useState(0);
  const [gameLeaderboard, setGameLeaderboard] = useState([
    { name: 'Rahul S.', score: 850, badge: '🥇' },
    { name: 'Priya M.', score: 720, badge: '🥈' },
    { name: 'Amit K.', score: 680, badge: '🥉' },
    { name: 'Sneha P.', score: 550, badge: '⭐' },
    { name: 'Vikram R.', score: 490, badge: '⭐' },
  ]);

  // Word Scramble Game
  const [scrambledWord, setScrambledWord] = useState('');
  const [wordAnswer, setWordAnswer] = useState('');
  const [userGuess, setUserGuess] = useState('');
  const [wordScore, setWordScore] = useState(0);

  // Real-time Notifications
  const [notifications, setNotifications] = useState([
    { id: 1, type: 'recognition', message: 'Priya recognized you with a Star badge!', time: '2 min ago', unread: true },
    { id: 2, type: 'activity', message: 'New team activity: Pizza Party on Friday', time: '1 hour ago', unread: true },
    { id: 3, type: 'pulse', message: 'Time for your daily pulse check!', time: '3 hours ago', unread: false },
  ]);

  // Handlers for new features
  const handleSubmitPulse = async () => {
    try {
      await api.post('/engagement/pulse-survey', {
        mood: pulseMood,
        comment: pulseComment
      });
      setPulseHistory([...pulseHistory, { mood: pulseMood, comment: pulseComment, date: new Date() }]);
      setPulseMood('');
      setPulseComment('');
      alert('Pulse survey submitted!');
    } catch (err) {
      console.error(err);
    }
  };

  const handleSendRecognition = async () => {
    try {
      await api.post('/engagement/recognition', {
        recipient_id: recognitionRecipient,
        message: recognitionMessage,
        badge: recognitionBadge
      });
      setRecognitions([...recognitions, {
        recipient: recognitionRecipient,
        message: recognitionMessage,
        badge: recognitionBadge,
        date: new Date()
      }]);
      setRecognitionRecipient('');
      setRecognitionMessage('');
      alert('Recognition sent!');
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubmitFeedback = async () => {
    try {
      await api.post('/engagement/feedback', {
        text: feedbackText,
        category: feedbackCategory,
        anonymous: true
      });
      setFeedbacks([...feedbacks, {
        text: feedbackText,
        category: feedbackCategory,
        date: new Date(),
        votes: 0
      }]);
      setFeedbackText('');
      alert('Feedback submitted anonymously!');
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubmitWellness = async () => {
    try {
      await api.post('/engagement/wellness-checkin', {
        score: wellnessScore,
        notes: wellnessNotes
      });
      alert('Wellness check-in recorded!');
      setWellnessNotes('');
    } catch (err) {
      console.error(err);
    }
  };

  // Dashboard Renderer
  const renderDashboard = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white p-6 rounded-lg shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-blue-100 text-sm">Overall Engagement</p>
            <h3 className="text-4xl font-bold mt-2">78%</h3>
            <p className="text-blue-100 text-xs mt-1">↑ 5% from last month</p>
          </div>
          <div className="text-5xl">📊</div>
        </div>
      </div>

      <div className="bg-gradient-to-br from-green-500 to-green-600 text-white p-6 rounded-lg shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-green-100 text-sm">Happiness Score</p>
            <h3 className="text-4xl font-bold mt-2">8.2/10</h3>
            <p className="text-green-100 text-xs mt-1">↑ 0.3 from last week</p>
          </div>
          <div className="text-5xl">😊</div>
        </div>
      </div>

      <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white p-6 rounded-lg shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-purple-100 text-sm">Recognition Given</p>
            <h3 className="text-4xl font-bold mt-2">124</h3>
            <p className="text-purple-100 text-xs mt-1">This month</p>
          </div>
          <div className="text-5xl">🏆</div>
        </div>
      </div>

      <div className="bg-gradient-to-br from-orange-500 to-orange-600 text-white p-6 rounded-lg shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-orange-100 text-sm">Attrition Risk</p>
            <h3 className="text-4xl font-bold mt-2">Low</h3>
            <p className="text-orange-100 text-xs mt-1">3 employees flagged</p>
          </div>
          <div className="text-5xl">⚠️</div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="col-span-full grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
        <button
          onClick={() => setActiveTab('pulse')}
          className="bg-white p-4 rounded-lg shadow hover:shadow-md transition-shadow border-l-4 border-blue-500"
        >
          <div className="flex items-center">
            <span className="text-3xl mr-3">💭</span>
            <div className="text-left">
              <h4 className="font-semibold text-gray-900">Daily Pulse</h4>
              <p className="text-sm text-gray-500">How are you feeling today?</p>
            </div>
          </div>
        </button>

        <button
          onClick={() => setActiveTab('recognition')}
          className="bg-white p-4 rounded-lg shadow hover:shadow-md transition-shadow border-l-4 border-purple-500"
        >
          <div className="flex items-center">
            <span className="text-3xl mr-3">🌟</span>
            <div className="text-left">
              <h4 className="font-semibold text-gray-900">Give Recognition</h4>
              <p className="text-sm text-gray-500">Appreciate your colleagues</p>
            </div>
          </div>
        </button>

        <button
          onClick={() => setActiveTab('wellness')}
          className="bg-white p-4 rounded-lg shadow hover:shadow-md transition-shadow border-l-4 border-green-500"
        >
          <div className="flex items-center">
            <span className="text-3xl mr-3">🧘</span>
            <div className="text-left">
              <h4 className="font-semibold text-gray-900">Wellness Check</h4>
              <p className="text-sm text-gray-500">Track your wellbeing</p>
            </div>
          </div>
        </button>
      </div>

      {/* Photo Gallery Highlight for Employees */}
      <div className="col-span-full mt-6">
        <div className="bg-gradient-to-r from-pink-500 to-purple-600 text-white p-6 rounded-lg shadow-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <span className="text-5xl mr-4">📸</span>
              <div>
                <h3 className="text-xl font-bold mb-1">Company Event Gallery</h3>
                <p className="text-pink-100">Check out photos from recent team events and celebrations!</p>
              </div>
            </div>
            <button
              onClick={() => setActiveTab('gallery')}
              className="px-6 py-3 bg-white text-purple-600 rounded-lg font-semibold hover:bg-pink-50 transition-colors"
            >
              View Gallery →
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  // Pulse Survey Renderer
  const renderPulse = () => (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="bg-white p-8 rounded-lg shadow-lg">
        <h3 className="text-2xl font-bold text-gray-900 mb-6">Daily Pulse Survey 💭</h3>
        
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-3">How are you feeling today?</label>
          <div className="grid grid-cols-5 gap-3">
            {[
              { emoji: '😢', label: 'Terrible', value: 'terrible' },
              { emoji: '😕', label: 'Bad', value: 'bad' },
              { emoji: '😐', label: 'Okay', value: 'okay' },
              { emoji: '😊', label: 'Good', value: 'good' },
              { emoji: '🤩', label: 'Amazing', value: 'amazing' }
            ].map((mood) => (
              <button
                key={mood.value}
                onClick={() => setPulseMood(mood.value)}
                className={`p-4 rounded-lg border-2 transition-all ${
                  pulseMood === mood.value
                    ? 'border-blue-500 bg-blue-50 scale-110'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="text-4xl mb-2">{mood.emoji}</div>
                <div className="text-xs font-medium text-gray-700">{mood.label}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">Any comments? (Optional)</label>
          <textarea
            value={pulseComment}
            onChange={(e) => setPulseComment(e.target.value)}
            rows={3}
            placeholder="Share what's on your mind..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <button
          onClick={handleSubmitPulse}
          disabled={!pulseMood}
          className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          Submit Pulse
        </button>
      </div>

      {/* Pulse History */}
      {pulseHistory.length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow">
          <h4 className="font-semibold text-gray-900 mb-4">Your Recent Pulses</h4>
          <div className="space-y-3">
            {pulseHistory.slice(-5).reverse().map((pulse, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                <div className="flex items-center">
                  <span className="text-2xl mr-3">
                    {pulse.mood === 'amazing' ? '🤩' : pulse.mood === 'good' ? '😊' : pulse.mood === 'okay' ? '😐' : pulse.mood === 'bad' ? '😕' : '😢'}
                  </span>
                  <div>
                    <p className="font-medium text-gray-900 capitalize">{pulse.mood}</p>
                    {pulse.comment && <p className="text-sm text-gray-500">{pulse.comment}</p>}
                  </div>
                </div>
                <span className="text-xs text-gray-400">{new Date(pulse.date).toLocaleDateString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  // Recognition Renderer
  const renderRecognition = () => (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="bg-white p-8 rounded-lg shadow-lg">
        <h3 className="text-2xl font-bold text-gray-900 mb-6">Give Recognition 🌟</h3>
        
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">Select Colleague</label>
          <select
            value={recognitionRecipient}
            onChange={(e) => setRecognitionRecipient(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
          >
            <option value="">Choose a colleague...</option>
            {employees.map(emp => (
              <option key={emp.id} value={emp.id}>{emp.first_name} {emp.last_name}</option>
            ))}
          </select>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-3">Choose a Badge</label>
          <div className="grid grid-cols-4 gap-3">
            {[
              { icon: '⭐', label: 'Star Performer', value: 'star' },
              { icon: '🏆', label: 'Team Player', value: 'team' },
              { icon: '💡', label: 'Innovator', value: 'innovator' },
              { icon: '🎯', label: 'Goal Crusher', value: 'goal' },
              { icon: '🤝', label: 'Helpful', value: 'helpful' },
              { icon: '🚀', label: 'Go-Getter', value: 'gogetter' },
              { icon: '🎨', label: 'Creative', value: 'creative' },
              { icon: '👏', label: 'Great Work', value: 'greatwork' }
            ].map((badge) => (
              <button
                key={badge.value}
                onClick={() => setRecognitionBadge(badge.value)}
                className={`p-3 rounded-lg border-2 transition-all ${
                  recognitionBadge === badge.value
                    ? 'border-purple-500 bg-purple-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="text-3xl mb-1">{badge.icon}</div>
                <div className="text-xs font-medium text-gray-700">{badge.label}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">Your Message</label>
          <textarea
            value={recognitionMessage}
            onChange={(e) => setRecognitionMessage(e.target.value)}
            rows={4}
            placeholder="Write why you're recognizing this person..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
          />
        </div>

        <button
          onClick={handleSendRecognition}
          disabled={!recognitionRecipient || !recognitionMessage}
          className="w-full bg-purple-600 text-white py-3 rounded-lg font-semibold hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          Send Recognition
        </button>
      </div>

      {/* Recognition Wall */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h4 className="font-semibold text-gray-900 mb-4">Recent Recognitions</h4>
        <div className="space-y-4">
          {recognitions.slice(-5).reverse().map((rec, idx) => (
            <div key={idx} className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border border-purple-200">
              <div className="flex items-start">
                <span className="text-3xl mr-3">
                  {rec.badge === 'star' ? '⭐' : rec.badge === 'team' ? '🏆' : '💡'}
                </span>
                <div className="flex-1">
                  <p className="font-medium text-gray-900">Recognition sent!</p>
                  <p className="text-sm text-gray-600 mt-1">{rec.message}</p>
                  <span className="text-xs text-gray-400 mt-2 block">{new Date(rec.date).toLocaleString()}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // Feedback Wall Renderer
  const renderFeedback = () => (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="bg-white p-8 rounded-lg shadow-lg">
        <h3 className="text-2xl font-bold text-gray-900 mb-6">Anonymous Feedback Wall 💬</h3>
        
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
          <select
            value={feedbackCategory}
            onChange={(e) => setFeedbackCategory(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="general">General Feedback</option>
            <option value="workplace">Workplace Environment</option>
            <option value="management">Management</option>
            <option value="benefits">Benefits & Perks</option>
            <option value="culture">Company Culture</option>
            <option value="suggestion">Suggestion</option>
          </select>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">Your Feedback (Anonymous)</label>
          <textarea
            value={feedbackText}
            onChange={(e) => setFeedbackText(e.target.value)}
            rows={5}
            placeholder="Share your thoughts, ideas, or concerns anonymously..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-xs text-gray-500 mt-2">🔒 Your feedback is completely anonymous</p>
        </div>

        <button
          onClick={handleSubmitFeedback}
          disabled={!feedbackText}
          className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          Submit Anonymously
        </button>
      </div>

      {/* Feedback List */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h4 className="font-semibold text-gray-900 mb-4">Recent Feedback</h4>
        <div className="space-y-4">
          {feedbacks.map((fb, idx) => (
            <div key={idx} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <span className="inline-block px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded mb-2">
                    {fb.category}
                  </span>
                  <p className="text-gray-700">{fb.text}</p>
                  <div className="flex items-center mt-3 text-sm text-gray-500">
                    <button className="flex items-center hover:text-blue-600">
                      <span className="mr-1">👍</span>
                      <span>{fb.votes}</span>
                    </button>
                    <span className="mx-2">•</span>
                    <span>{new Date(fb.date).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // Wellness Renderer
  const renderWellness = () => (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="bg-white p-8 rounded-lg shadow-lg">
        <h3 className="text-2xl font-bold text-gray-900 mb-6">Wellness Check-In 🧘</h3>
        
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-3">
            How would you rate your overall wellbeing today?
          </label>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-500">Poor</span>
            <input
              type="range"
              min="1"
              max="10"
              value={wellnessScore}
              onChange={(e) => setWellnessScore(parseInt(e.target.value))}
              className="flex-1"
            />
            <span className="text-sm text-gray-500">Excellent</span>
          </div>
          <div className="text-center mt-2">
            <span className="text-4xl font-bold text-blue-600">{wellnessScore}/10</span>
          </div>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">Notes (Optional)</label>
          <textarea
            value={wellnessNotes}
            onChange={(e) => setWellnessNotes(e.target.value)}
            rows={3}
            placeholder="Any specific concerns or highlights?"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
          />
        </div>

        <button
          onClick={handleSubmitWellness}
          className="w-full bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700"
        >
          Submit Check-In
        </button>
      </div>

      {/* Wellness Resources */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h4 className="font-semibold text-gray-900 mb-4">Wellness Resources</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-blue-50 rounded-lg">
            <h5 className="font-semibold text-blue-900 mb-2">🧘‍♀️ Meditation</h5>
            <p className="text-sm text-blue-700">5-minute guided sessions</p>
          </div>
          <div className="p-4 bg-green-50 rounded-lg">
            <h5 className="font-semibold text-green-900 mb-2">💪 Fitness</h5>
            <p className="text-sm text-green-700">Workout plans & tips</p>
          </div>
          <div className="p-4 bg-purple-50 rounded-lg">
            <h5 className="font-semibold text-purple-900 mb-2">🧠 Mental Health</h5>
            <p className="text-sm text-purple-700">Counseling support</p>
          </div>
          <div className="p-4 bg-orange-50 rounded-lg">
            <h5 className="font-semibold text-orange-900 mb-2">📚 Resources</h5>
            <p className="text-sm text-orange-700">Articles & guides</p>
          </div>
        </div>
      </div>
    </div>
  );

  // Game Handlers
  const startTriviaGame = () => {
    const questions = [
      { q: 'What is the capital of France?', options: ['London', 'Berlin', 'Paris', 'Madrid'], answer: 'Paris' },
      { q: 'Which planet is known as the Red Planet?', options: ['Venus', 'Mars', 'Jupiter', 'Saturn'], answer: 'Mars' },
      { q: 'Who painted the Mona Lisa?', options: ['Van Gogh', 'Picasso', 'Da Vinci', 'Monet'], answer: 'Da Vinci' },
      { q: 'What is 15 × 8?', options: ['120', '125', '115', '130'], answer: '120' },
      { q: 'Which is the largest ocean?', options: ['Atlantic', 'Indian', 'Arctic', 'Pacific'], answer: 'Pacific' },
    ];
    const randomQ = questions[Math.floor(Math.random() * questions.length)];
    setTriviaQuestion(randomQ);
    setCurrentGame('trivia');
  };

  const handleTriviaAnswer = (answer) => {
    if (answer === triviaQuestion.answer) {
      setTriviaScore(triviaScore + 10);
      alert('Correct! +10 points 🎉');
    } else {
      alert(`Wrong! The answer was ${triviaQuestion.answer}`);
    }
    startTriviaGame(); // Next question
  };

  const startWordScramble = () => {
    const words = ['ENGAGEMENT', 'TEAMWORK', 'INNOVATION', 'LEADERSHIP', 'CREATIVITY', 'EXCELLENCE'];
    const word = words[Math.floor(Math.random() * words.length)];
    const scrambled = word.split('').sort(() => Math.random() - 0.5).join('');
    setScrambledWord(scrambled);
    setWordAnswer(word);
    setUserGuess('');
    setCurrentGame('wordscramble');
  };

  const handleWordGuess = () => {
    if (userGuess.toUpperCase() === wordAnswer) {
      setWordScore(wordScore + 15);
      alert('Correct! +15 points 🎉');
      startWordScramble();
    } else {
      alert('Try again!');
    }
  };

  // Gallery Handlers
  const handlePhotoUpload = async (albumId, file) => {
    setUploadingPhoto(true);
    try {
      const formData = new FormData();
      formData.append('photo', file);
      formData.append('album_id', albumId);
      await api.post('/engagement/gallery/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      alert('Photo uploaded successfully!');
    } catch (err) {
      console.error(err);
    } finally {
      setUploadingPhoto(false);
    }
  };

  // Photo Gallery Renderer
  const renderGallery = () => (
    <div className="space-y-6">
      {!selectedAlbum ? (
        <>
          <div className="flex justify-between items-center">
            <h3 className="text-2xl font-bold text-gray-900">Photo Gallery 📸</h3>
            {canUploadPhotos && (
              <button
                onClick={() => {/* Create album modal */}}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                + Create Album
              </button>
            )}
          </div>
          
          {!canUploadPhotos && (
            <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
              <p className="text-sm text-blue-700">
                📸 Viewing company event photos. Only Admin, HR, and Managers can upload photos.
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {galleryPhotos.map((album) => (
              <div
                key={album.id}
                onClick={() => setSelectedAlbum(album)}
                className="bg-white rounded-lg shadow-lg overflow-hidden cursor-pointer hover:shadow-xl transition-shadow"
              >
                <div className="h-48 bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-8xl relative">
                  {album.thumbnail}
                  <span className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm px-2 py-1 rounded text-xs font-medium text-gray-700">
                    Company Event
                  </span>
                </div>
                <div className="p-4">
                  <h4 className="font-bold text-gray-900 mb-1">{album.title}</h4>
                  <p className="text-sm text-gray-500">{album.date}</p>
                  <div className="flex items-center justify-between mt-3">
                    <span className="text-sm text-gray-600">{album.photos} photos</span>
                    <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                      View Album →
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div>
          <button
            onClick={() => setSelectedAlbum(null)}
            className="mb-4 text-blue-600 hover:text-blue-800 flex items-center"
          >
            ← Back to Albums
          </button>
          
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-2xl font-bold text-gray-900">{selectedAlbum.title}</h3>
                <p className="text-gray-500">{selectedAlbum.date} • {selectedAlbum.photos} photos</p>
              </div>
              {canUploadPhotos ? (
                <label className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer">
                  + Upload Photos
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files) {
                        Array.from(e.target.files).forEach(file => {
                          handlePhotoUpload(selectedAlbum.id, file);
                        });
                      }
                    }}
                  />
                </label>
              ) : (
                <span className="text-sm text-gray-500 italic">View Only</span>
              )}
            </div>

            {/* Photo Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {[...Array(selectedAlbum.photos)].map((_, idx) => (
                <div
                  key={idx}
                  className="aspect-square bg-gradient-to-br from-gray-200 to-gray-300 rounded-lg flex items-center justify-center text-4xl hover:scale-105 transition-transform cursor-pointer"
                >
                  📷
                </div>
              ))}
            </div>

            {/* Comments Section */}
            <div className="mt-8 border-t pt-6">
              <h4 className="font-semibold text-gray-900 mb-4">Comments</h4>
              <div className="space-y-3">
                <div className="flex items-start space-x-3">
                  <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold">
                    R
                  </div>
                  <div className="flex-1">
                    <p className="text-sm"><span className="font-semibold">Rahul</span> Great memories! 🎉</p>
                    <span className="text-xs text-gray-400">2 hours ago</span>
                  </div>
                </div>
              </div>
              <div className="mt-4">
                <input
                  type="text"
                  placeholder="Add a comment..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // Mini Games Renderer
  const renderGames = () => (
    <div className="max-w-4xl mx-auto space-y-6">
      {!currentGame ? (
        <>
          <h3 className="text-2xl font-bold text-gray-900 mb-6">Mini Games 🎮</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div
              onClick={startTriviaGame}
              className="bg-gradient-to-br from-purple-500 to-pink-500 text-white p-8 rounded-lg shadow-lg cursor-pointer hover:scale-105 transition-transform"
            >
              <div className="text-6xl mb-4">🧠</div>
              <h4 className="text-2xl font-bold mb-2">Trivia Quiz</h4>
              <p className="text-purple-100">Test your knowledge!</p>
              <p className="text-sm text-purple-200 mt-4">Your Score: {triviaScore} points</p>
            </div>

            <div
              onClick={startWordScramble}
              className="bg-gradient-to-br from-blue-500 to-cyan-500 text-white p-8 rounded-lg shadow-lg cursor-pointer hover:scale-105 transition-transform"
            >
              <div className="text-6xl mb-4">🔤</div>
              <h4 className="text-2xl font-bold mb-2">Word Scramble</h4>
              <p className="text-blue-100">Unscramble the word!</p>
              <p className="text-sm text-blue-200 mt-4">Your Score: {wordScore} points</p>
            </div>

            <div className="bg-gradient-to-br from-green-500 to-emerald-500 text-white p-8 rounded-lg shadow-lg cursor-pointer hover:scale-105 transition-transform">
              <div className="text-6xl mb-4">🎯</div>
              <h4 className="text-2xl font-bold mb-2">Quick Math</h4>
              <p className="text-green-100">Solve math problems!</p>
              <p className="text-sm text-green-200 mt-4">Coming Soon</p>
            </div>

            <div className="bg-gradient-to-br from-orange-500 to-red-500 text-white p-8 rounded-lg shadow-lg cursor-pointer hover:scale-105 transition-transform">
              <div className="text-6xl mb-4">🎲</div>
              <h4 className="text-2xl font-bold mb-2">Memory Game</h4>
              <p className="text-orange-100">Match the pairs!</p>
              <p className="text-sm text-orange-200 mt-4">Coming Soon</p>
            </div>
          </div>

          {/* Leaderboard */}
          <div className="bg-white rounded-lg shadow-lg p-6 mt-8">
            <h4 className="text-xl font-bold text-gray-900 mb-4">🏆 Leaderboard</h4>
            <div className="space-y-3">
              {gameLeaderboard.map((player, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <span className="text-2xl">{player.badge}</span>
                    <div>
                      <p className="font-semibold text-gray-900">{player.name}</p>
                      <p className="text-sm text-gray-500">Rank #{idx + 1}</p>
                    </div>
                  </div>
                  <span className="text-xl font-bold text-blue-600">{player.score}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      ) : currentGame === 'trivia' && triviaQuestion ? (
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-2xl font-bold text-gray-900">Trivia Quiz 🧠</h3>
            <button
              onClick={() => setCurrentGame(null)}
              className="text-gray-500 hover:text-gray-700"
            >
              ✕ Close
            </button>
          </div>

          <div className="mb-6">
            <div className="flex justify-between items-center mb-4">
              <span className="text-sm text-gray-500">Your Score</span>
              <span className="text-2xl font-bold text-blue-600">{triviaScore}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all"
                style={{ width: `${Math.min((triviaScore / 100) * 100, 100)}%` }}
              />
            </div>
          </div>

          <div className="mb-8">
            <h4 className="text-xl font-semibold text-gray-900 mb-6">{triviaQuestion.q}</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {triviaQuestion.options.map((option, idx) => (
                <button
                  key={idx}
                  onClick={() => handleTriviaAnswer(option)}
                  className="p-4 border-2 border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all text-left font-medium"
                >
                  {option}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : currentGame === 'wordscramble' ? (
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-2xl font-bold text-gray-900">Word Scramble 🔤</h3>
            <button
              onClick={() => setCurrentGame(null)}
              className="text-gray-500 hover:text-gray-700"
            >
              ✕ Close
            </button>
          </div>

          <div className="mb-6">
            <div className="flex justify-between items-center mb-4">
              <span className="text-sm text-gray-500">Your Score</span>
              <span className="text-2xl font-bold text-cyan-600">{wordScore}</span>
            </div>
          </div>

          <div className="text-center mb-8">
            <p className="text-gray-600 mb-4">Unscramble this word:</p>
            <div className="text-5xl font-bold text-blue-600 tracking-widest mb-8">
              {scrambledWord}
            </div>
            
            <input
              type="text"
              value={userGuess}
              onChange={(e) => setUserGuess(e.target.value)}
              placeholder="Type your answer..."
              className="w-full max-w-md px-4 py-3 text-xl border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-center uppercase"
              onKeyPress={(e) => e.key === 'Enter' && handleWordGuess()}
            />
            
            <div className="mt-6 space-x-4">
              <button
                onClick={handleWordGuess}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold"
              >
                Submit Answer
              </button>
              <button
                onClick={startWordScramble}
                className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-semibold"
              >
                Skip
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );

  // Notifications Renderer
  const renderNotifications = () => (
    <div className="max-w-2xl mx-auto">
      <h3 className="text-2xl font-bold text-gray-900 mb-6">Notifications 🔔</h3>
      
      <div className="space-y-3">
        {notifications.map((notif) => (
          <div
            key={notif.id}
            className={`p-4 rounded-lg border-l-4 ${
              notif.unread ? 'bg-blue-50 border-blue-500' : 'bg-white border-gray-300'
            } shadow hover:shadow-md transition-shadow`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-3">
                <span className="text-2xl">
                  {notif.type === 'recognition' ? '🌟' : notif.type === 'activity' ? '🎉' : '💭'}
                </span>
                <div>
                  <p className="text-gray-900 font-medium">{notif.message}</p>
                  <span className="text-xs text-gray-500">{notif.time}</span>
                </div>
              </div>
              {notif.unread && (
                <span className="w-2 h-2 bg-blue-600 rounded-full"></span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  // Team Activities Renderer
  const renderActivities = () => (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-2xl font-bold text-gray-900 mb-6">Team Activities 🎉</h3>
        
        <div className="space-y-4">
          {activities.map((activity) => (
            <div key={activity.id} className="p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <span className="text-3xl mr-4">
                    {activity.type === 'virtual' ? '💻' : '🏢'}
                  </span>
                  <div>
                    <h4 className="font-semibold text-gray-900">{activity.title}</h4>
                    <p className="text-sm text-gray-500">
                      {new Date(activity.date).toLocaleDateString()} • {activity.participants} participants
                    </p>
                  </div>
                </div>
                <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">
                  Join
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderAttrition = () => (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="font-bold text-lg mb-4">Attrition Risk Prediction 🚨</h3>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700">Select Employee</label>
          <select
            className="mt-1 block w-full border rounded p-2"
            value={selectedEmployeeId}
            onChange={(e) => setSelectedEmployeeId(e.target.value)}
          >
            {employees.map(emp => (
              <option key={emp.id} value={emp.id}>{emp.first_name} {emp.last_name} ({emp.position})</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div><label className="block text-sm">Years w/o Promotion</label><input type="number" className="border w-full p-2 rounded" value={attritionData.no_promotion_years} onChange={e => setAttritionData({ ...attritionData, no_promotion_years: parseInt(e.target.value) })} /></div>
          <div><label className="block text-sm">Below Market Salary</label><select className="border w-full p-2 rounded" value={attritionData.below_market_salary} onChange={e => setAttritionData({ ...attritionData, below_market_salary: e.target.value === 'true' })}><option value="true">Yes</option><option value="false">No</option></select></div>
          <div><label className="block text-sm">Engagement Score (0-10)</label><input type="number" className="border w-full p-2 rounded" value={attritionData.engagement_score} onChange={e => setAttritionData({ ...attritionData, engagement_score: parseInt(e.target.value) })} /></div>
          <div><label className="block text-sm">Job Search Activity</label><select className="border w-full p-2 rounded" value={attritionData.job_search_activity} onChange={e => setAttritionData({ ...attritionData, job_search_activity: e.target.value === 'true' })}><option value="true">Detected</option><option value="false">None</option></select></div>
        </div>
        <button onClick={handlePredictAttrition} className="bg-red-600 text-white px-6 py-2 rounded hover:bg-red-700">Predict Risk</button>
      </div>

      {attritionResult && (
        <div className="bg-white p-6 rounded-lg shadow animate-fade-in-up border-l-8 border-red-500">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-800">Risk Assessment</h2>
              <p className="text-gray-500">Employee ID: {attritionData.employee_id}</p>
            </div>
            <div className="text-right">
              <span className={`inline-block px-4 py-2 rounded-full text-white font-bold ${attritionResult.risk_level === 'High' ? 'bg-red-600' : attritionResult.risk_level === 'Medium' ? 'bg-yellow-500' : 'bg-green-500'}`}>
                {attritionResult.risk_level} Risk
              </span>
            </div>
          </div>

          <div className="mb-6">
            <div className="flex justify-between text-sm mb-1">
              <span>Risk Probability</span>
              <span className="font-bold">{attritionResult.risk_score}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-4">
              <div
                className={`h-4 rounded-full ${attritionResult.risk_score > 70 ? 'bg-red-600' : attritionResult.risk_score > 40 ? 'bg-yellow-500' : 'bg-green-500'}`}
                style={{ width: `${attritionResult.risk_score}%` }}
              ></div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div>
              <h4 className="font-bold text-gray-700 mb-2">Risk Factors</h4>
              <ul className="list-disc list-inside text-red-600 space-y-1">
                {attritionResult.factors.map((f, i) => <li key={i}>{f}</li>)}
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-gray-700 mb-2">Recommended Actions</h4>
              <ul className="list-disc list-inside text-green-700 space-y-1">
                {attritionResult.actions.map((a, i) => <li key={i}>{a}</li>)}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Engagement & Retention</h1>
          <p className="text-gray-500">AI-Powered Sentiment & Risk Analysis</p>
        </div>

        {/* Notifications Badge */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setActiveTab('dashboard')} className={`px-4 py-2 rounded-lg font-medium ${activeTab === 'dashboard' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600'}`}>Dashboard</button>
            <button onClick={() => setActiveTab('pulse')} className={`px-4 py-2 rounded-lg font-medium ${activeTab === 'pulse' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600'}`}>Pulse Survey</button>
            <button onClick={() => setActiveTab('recognition')} className={`px-4 py-2 rounded-lg font-medium ${activeTab === 'recognition' ? 'bg-purple-600 text-white' : 'bg-white text-gray-600'}`}>Recognition</button>
            <button onClick={() => setActiveTab('gallery')} className={`px-4 py-2 rounded-lg font-medium ${activeTab === 'gallery' ? 'bg-pink-600 text-white' : 'bg-white text-gray-600'}`}>📸 Gallery</button>
            <button onClick={() => setActiveTab('games')} className={`px-4 py-2 rounded-lg font-medium ${activeTab === 'games' ? 'bg-purple-600 text-white' : 'bg-white text-gray-600'}`}>🎮 Games</button>
            <button onClick={() => setActiveTab('feedback')} className={`px-4 py-2 rounded-lg font-medium ${activeTab === 'feedback' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600'}`}>Feedback</button>
            <button onClick={() => setActiveTab('wellness')} className={`px-4 py-2 rounded-lg font-medium ${activeTab === 'wellness' ? 'bg-green-600 text-white' : 'bg-white text-gray-600'}`}>Wellness</button>
            <button onClick={() => setActiveTab('activities')} className={`px-4 py-2 rounded-lg font-medium ${activeTab === 'activities' ? 'bg-orange-600 text-white' : 'bg-white text-gray-600'}`}>Activities</button>
            <button onClick={() => setActiveTab('sentiment')} className={`px-4 py-2 rounded-lg font-medium ${activeTab === 'sentiment' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600'}`}>Sentiment</button>
            <button onClick={() => setActiveTab('attrition')} className={`px-4 py-2 rounded-lg font-medium ${activeTab === 'attrition' ? 'bg-red-600 text-white' : 'bg-white text-gray-600'}`}>Attrition</button>
          </div>
          
          <button
            onClick={() => setActiveTab('notifications')}
            className="relative px-4 py-2 bg-white rounded-lg shadow hover:shadow-md transition-shadow"
          >
            <span className="text-2xl">🔔</span>
            {notifications.filter(n => n.unread).length > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                {notifications.filter(n => n.unread).length}
              </span>
            )}
          </button>
        </div>

        {activeTab === 'dashboard' && renderDashboard()}
        {activeTab === 'pulse' && renderPulse()}
        {activeTab === 'recognition' && renderRecognition()}
        {activeTab === 'gallery' && renderGallery()}
        {activeTab === 'games' && renderGames()}
        {activeTab === 'feedback' && renderFeedback()}
        {activeTab === 'wellness' && renderWellness()}
        {activeTab === 'activities' && renderActivities()}
        {activeTab === 'notifications' && renderNotifications()}
        {activeTab === 'sentiment' && renderSentiment()}
        {activeTab === 'attrition' && renderAttrition()}
      </div>
    </div>
  );
}
