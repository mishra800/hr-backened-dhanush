import { useState, useEffect } from 'react';
import api from '../api/axios';

export default function Learning() {
  const [activeTab, setActiveTab] = useState('youtube');
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Training State
  const [trainingGoal, setTrainingGoal] = useState('Machine Learning Engineer');
  const [trainingResult, setTrainingResult] = useState(null);

  // Prediction State
  const [predictSkill, setPredictSkill] = useState('Machine Learning');
  const [predictResult, setPredictResult] = useState(null);
  
  // YouTube Hub State
  const [youtubeVideos, setYoutubeVideos] = useState([]);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [uploadData, setUploadData] = useState({
    url: '',
    title: '',
    description: '',
    category: '',
    difficulty: 'Beginner',
    tags: '',
    target_roles: '',
    target_skills: ''
  });
  
  const isManager = currentUser && ['admin', 'hr', 'manager'].includes(currentUser.role);

  useEffect(() => {
    const initializePage = async () => {
      try {
        setLoading(true);
        setError(null);
        await fetchProfile();
        await fetchCurrentUser();
        if (activeTab === 'youtube') {
          await fetchYouTubeVideos();
        }
      } catch (err) {
        console.error('Error initializing learning page:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    
    initializePage();
  }, [activeTab]);

  const fetchProfile = async () => {
    try {
      const res = await api.get('/users/me/profile');
      // Profile fetched for future use
    } catch (err) { console.error(err); }
  };
  
  const fetchCurrentUser = async () => {
    try {
      const res = await api.get('/users/me');
      setCurrentUser(res.data);
    } catch (err) { console.error(err); }
  };
  
  const fetchYouTubeVideos = async () => {
    try {
      const res = await api.get('/learning/youtube/videos');
      setYoutubeVideos(res.data.videos || []);
    } catch (err) { console.error(err); }
  };
  
  const handleUploadVideo = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...uploadData,
        tags: uploadData.tags.split(',').map(t => t.trim()).filter(t => t),
        target_roles: uploadData.target_roles.split(',').map(t => t.trim()).filter(t => t),
        target_skills: uploadData.target_skills.split(',').map(t => t.trim()).filter(t => t)
      };
      await api.post('/learning/youtube/upload', payload);
      alert('Video uploaded successfully!');
      setShowUploadForm(false);
      setUploadData({
        url: '', title: '', description: '', category: '', difficulty: 'Beginner',
        tags: '', target_roles: '', target_skills: ''
      });
      fetchYouTubeVideos();
    } catch (err) {
      console.error(err);
      alert('Failed to upload video');
    }
  };

  // Handlers
  const handleGetTraining = async () => {
    try {
      // Get current employee ID
      const empResponse = await api.get('/onboarding/my-employee-id');
      const empId = empResponse.data.employee_id;
      
      const res = await api.post('/learning/personalized-training', { employee_id: empId, current_skills: '', career_goal: trainingGoal });
      setTrainingResult(res.data);
    } catch (err) { 
      console.error(err);
      alert('Failed to get training recommendations. Please try again.');
    }
  };

  const handlePredictOutcome = async () => {
    try {
      // Get current employee ID
      const empResponse = await api.get('/onboarding/my-employee-id');
      const empId = empResponse.data.employee_id;
      
      const res = await api.post('/learning/predict-learning-outcome', { employee_id: empId, target_skill: predictSkill });
      setPredictResult(res.data);
    } catch (err) { 
      console.error(err);
      alert('Failed to predict learning outcome. Please try again.');
    }
  };

  // Renderers
  const renderTraining = () => (
    <div className="space-y-6">
      {/* Input Section */}
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-8 rounded-xl shadow-lg border border-blue-100">
        <div className="flex items-center mb-6">
          <span className="text-4xl mr-4">🎓</span>
          <div>
            <h3 className="text-2xl font-bold text-gray-900">AI-Powered Course Recommendations</h3>
            <p className="text-gray-600 mt-1">Get personalized learning paths based on your career goals</p>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            What's your career goal? 🎯
          </label>
          <input 
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all text-lg" 
            value={trainingGoal} 
            onChange={e => setTrainingGoal(e.target.value)}
            placeholder="e.g., Machine Learning Engineer, Cloud Architect, Full Stack Developer"
          />
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="text-xs text-gray-500">Popular goals:</span>
            {['Machine Learning Engineer', 'Cloud Architect', 'Data Scientist', 'DevOps Engineer'].map((goal) => (
              <button
                key={goal}
                onClick={() => setTrainingGoal(goal)}
                className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs hover:bg-blue-200 transition-colors"
              >
                {goal}
              </button>
            ))}
          </div>
        </div>
        
        <button 
          onClick={handleGetTraining} 
          className="mt-6 w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-8 py-4 rounded-lg font-semibold hover:from-blue-700 hover:to-indigo-700 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all text-lg"
        >
          🚀 Get Personalized Recommendations
        </button>
      </div>

      {/* Results Section */}
      {trainingResult && (
        <div className="space-y-6 animate-fade-in-up">
          {/* Header */}
          <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-green-500">
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              Recommended Learning Path for: {trainingResult.goal}
            </h3>
            <p className="text-gray-600">
              We found {trainingResult.courses.length} highly relevant courses to help you achieve your goal
            </p>
          </div>

          {/* Course Cards */}
          {trainingResult.courses.map((course, i) => (
            <div key={i} className="bg-white rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden border border-gray-100">
              {/* Course Header */}
              <div className="bg-gradient-to-r from-green-500 to-emerald-600 p-6 text-white">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-3xl">📚</span>
                      <span className="px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-xs font-semibold">
                        Rank #{i + 1}
                      </span>
                    </div>
                    <h4 className="text-2xl font-bold mb-2">{course.title}</h4>
                    <div className="flex items-center gap-4 text-sm text-green-100">
                      <span className="flex items-center gap-1">
                        <span>🏢</span> {course.provider}
                      </span>
                      <span className="flex items-center gap-1">
                        <span>📊</span> {course.level}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="bg-white text-green-600 px-4 py-2 rounded-lg">
                      <div className="text-3xl font-bold">{course.relevance}%</div>
                      <div className="text-xs font-semibold">Match Score</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Course Details */}
              <div className="p-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="bg-blue-50 p-4 rounded-lg text-center">
                    <div className="text-2xl mb-1">⏱️</div>
                    <div className="text-xs text-gray-600 mb-1">Duration</div>
                    <div className="font-bold text-gray-900">{course.duration}</div>
                  </div>
                  <div className="bg-purple-50 p-4 rounded-lg text-center">
                    <div className="text-2xl mb-1">🎯</div>
                    <div className="text-xs text-gray-600 mb-1">Level</div>
                    <div className="font-bold text-gray-900">{course.level}</div>
                  </div>
                  <div className="bg-orange-50 p-4 rounded-lg text-center">
                    <div className="text-2xl mb-1">💰</div>
                    <div className="text-xs text-gray-600 mb-1">Investment</div>
                    <div className="font-bold text-gray-900">{course.cost}</div>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg text-center">
                    <div className="text-2xl mb-1">✨</div>
                    <div className="text-xs text-gray-600 mb-1">Relevance</div>
                    <div className="font-bold text-green-600">{course.relevance}%</div>
                  </div>
                </div>

                {/* Skills Covered */}
                <div className="mb-6">
                  <h5 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                    <span>🎓</span> Skills You'll Master
                  </h5>
                  <div className="flex flex-wrap gap-2">
                    {course.skills.map((skill, j) => (
                      <span 
                        key={j} 
                        className="px-4 py-2 bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-800 rounded-full text-sm font-medium border border-blue-200"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Action Button */}
                <button className="w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white py-3 rounded-lg font-semibold hover:from-green-700 hover:to-emerald-700 transition-all shadow-md hover:shadow-lg">
                  Enroll Now →
                </button>
              </div>
            </div>
          ))}

          {/* AI Tips Section */}
          <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-6 rounded-xl shadow-md border border-purple-100">
            <div className="flex items-start gap-4">
              <span className="text-4xl">💡</span>
              <div className="flex-1">
                <h4 className="text-lg font-bold text-gray-900 mb-3">AI Success Tips</h4>
                <ul className="space-y-2">
                  {trainingResult.tips.map((tip, i) => (
                    <li key={i} className="flex items-start gap-2 text-gray-700">
                      <span className="text-purple-600 font-bold">✓</span>
                      <span>{tip}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderPrediction = () => (
    <div className="space-y-6">
      {/* Input Section */}
      <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-8 rounded-xl shadow-lg border border-purple-100">
        <div className="flex items-center mb-6">
          <span className="text-4xl mr-4">🔮</span>
          <div>
            <h3 className="text-2xl font-bold text-gray-900">AI Learning Outcome Predictor</h3>
            <p className="text-gray-600 mt-1">Predict your success probability and career impact before you start</p>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Which skill do you want to master? 🎯
          </label>
          <input 
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all text-lg" 
            value={predictSkill} 
            onChange={e => setPredictSkill(e.target.value)}
            placeholder="e.g., Machine Learning, Cloud Architecture, Python, System Design"
          />
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="text-xs text-gray-500">Popular skills:</span>
            {['Machine Learning', 'Cloud Architecture', 'Python', 'System Design', 'DevOps'].map((skill) => (
              <button
                key={skill}
                onClick={() => setPredictSkill(skill)}
                className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs hover:bg-purple-200 transition-colors"
              >
                {skill}
              </button>
            ))}
          </div>
        </div>
        
        <button 
          onClick={handlePredictOutcome} 
          className="mt-6 w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white px-8 py-4 rounded-lg font-semibold hover:from-purple-700 hover:to-pink-700 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all text-lg"
        >
          🚀 Predict My Learning Journey
        </button>
      </div>

      {/* Results Section */}
      {predictResult && (
        <div className="space-y-6 animate-fade-in-up">
          {/* Header Card */}
          <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white p-8 rounded-xl shadow-2xl">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-3xl font-bold mb-2">Learning Prediction for: {predictResult.skill}</h3>
                <p className="text-purple-100">AI-powered analysis of your learning journey</p>
              </div>
              <div className="text-6xl">🎯</div>
            </div>
          </div>

          {/* Key Metrics Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white p-6 rounded-xl shadow-lg border-t-4 border-purple-500 hover:shadow-2xl transition-shadow">
              <div className="text-center">
                <div className="text-4xl mb-2">📊</div>
                <p className="text-xs uppercase tracking-wide text-gray-500 mb-2">Success Probability</p>
                <p className="text-4xl font-bold text-purple-600">{predictResult.success_probability}%</p>
                <div className="mt-3 w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-purple-600 h-2 rounded-full transition-all" 
                    style={{ width: `${predictResult.success_probability}%` }}
                  ></div>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-lg border-t-4 border-blue-500 hover:shadow-2xl transition-shadow">
              <div className="text-center">
                <div className="text-4xl mb-2">💎</div>
                <p className="text-xs uppercase tracking-wide text-gray-500 mb-2">ROI Score</p>
                <p className="text-4xl font-bold text-blue-600">{predictResult.roi_score}<span className="text-2xl text-gray-400">/10</span></p>
                <p className="text-xs text-gray-600 mt-2">Return on Investment</p>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-lg border-t-4 border-green-500 hover:shadow-2xl transition-shadow">
              <div className="text-center">
                <div className="text-4xl mb-2">🚀</div>
                <p className="text-xs uppercase tracking-wide text-gray-500 mb-2">Career Impact</p>
                <p className="text-2xl font-bold text-green-600">{predictResult.career_impact}</p>
                <p className="text-xs text-gray-600 mt-2">Growth Potential</p>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-lg border-t-4 border-orange-500 hover:shadow-2xl transition-shadow">
              <div className="text-center">
                <div className="text-4xl mb-2">⏱️</div>
                <p className="text-xs uppercase tracking-wide text-gray-500 mb-2">Time to Master</p>
                <p className="text-xl font-bold text-orange-600">{predictResult.completion_time}</p>
                <p className="text-xs text-gray-600 mt-2">Estimated Duration</p>
              </div>
            </div>
          </div>

          {/* Mastery Timeline */}
          <div className="bg-white p-8 rounded-xl shadow-lg">
            <div className="flex items-center gap-3 mb-6">
              <span className="text-3xl">📈</span>
              <h4 className="text-2xl font-bold text-gray-900">Mastery Timeline</h4>
            </div>
            
            <div className="relative">
              {/* Timeline Line */}
              <div className="absolute top-8 left-0 right-0 h-1 bg-gradient-to-r from-purple-200 via-blue-200 to-green-200"></div>
              
              {/* Timeline Points */}
              <div className="relative grid grid-cols-2 md:grid-cols-4 gap-4">
                {predictResult.timeline.map((t, i) => (
                  <div key={i} className="text-center">
                    <div className="relative inline-block">
                      <div className={`w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold text-white shadow-lg ${
                        i === 0 ? 'bg-purple-500' : 
                        i === 1 ? 'bg-blue-500' : 
                        i === 2 ? 'bg-green-500' : 'bg-emerald-500'
                      }`}>
                        {t.proficiency}%
                      </div>
                      <div className="absolute -top-2 -right-2 bg-white rounded-full p-1 shadow">
                        {i === 0 ? '🌱' : i === 1 ? '🌿' : i === 2 ? '🌳' : '🏆'}
                      </div>
                    </div>
                    <p className="mt-3 font-bold text-gray-900">Month {t.month}</p>
                    <p className="text-sm text-gray-600">{t.level}</p>
                    <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${
                          i === 0 ? 'bg-purple-500' : 
                          i === 1 ? 'bg-blue-500' : 
                          i === 2 ? 'bg-green-500' : 'bg-emerald-500'
                        }`}
                        style={{ width: `${t.proficiency}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Career Opportunities & Challenges */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* Opportunities */}
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-6 rounded-xl shadow-lg border border-green-200">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-3xl">🎯</span>
                <h4 className="text-xl font-bold text-gray-900">Career Opportunities Unlocked</h4>
              </div>
              <ul className="space-y-3">
                {predictResult.opportunities.map((opp, i) => (
                  <li key={i} className="flex items-start gap-3 bg-white p-3 rounded-lg shadow-sm">
                    <span className="text-green-600 font-bold text-xl">✓</span>
                    <span className="text-gray-800 font-medium">{opp}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Challenges */}
            <div className="bg-gradient-to-br from-orange-50 to-red-50 p-6 rounded-xl shadow-lg border border-orange-200">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-3xl">⚠️</span>
                <h4 className="text-xl font-bold text-gray-900">Challenges to Prepare For</h4>
              </div>
              <ul className="space-y-3">
                {predictResult.challenges.map((challenge, i) => (
                  <li key={i} className="flex items-start gap-3 bg-white p-3 rounded-lg shadow-sm">
                    <span className="text-orange-600 font-bold text-xl">!</span>
                    <span className="text-gray-800 font-medium">{challenge}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Final Proficiency Card */}
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-6 rounded-xl shadow-2xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-indigo-100 text-sm mb-1">Expected Final Proficiency</p>
                <p className="text-4xl font-bold">{predictResult.proficiency}</p>
              </div>
              <div className="text-right">
                <p className="text-indigo-100 text-sm mb-1">Ready to Start?</p>
                <button className="mt-2 bg-white text-indigo-600 px-6 py-2 rounded-lg font-semibold hover:bg-indigo-50 transition-colors">
                  Begin Learning Journey →
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // YouTube Hub Renderer
  const renderYouTubeHub = () => (
    <div className="space-y-6">
      {/* Header with Upload Button */}
      <div className="bg-gradient-to-r from-red-500 to-pink-500 text-white p-8 rounded-xl shadow-2xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="text-5xl">📺</span>
            <div>
              <h3 className="text-3xl font-bold mb-2">YouTube Learning Hub</h3>
              <p className="text-red-100">AI-curated video content personalized for your role and goals</p>
            </div>
          </div>
          {isManager && (
            <button
              onClick={() => setShowUploadForm(!showUploadForm)}
              className="bg-white text-red-600 px-6 py-3 rounded-lg font-semibold hover:bg-red-50 transition-colors shadow-lg"
            >
              {showUploadForm ? '✕ Cancel' : '+ Upload Video'}
            </button>
          )}
        </div>
      </div>

      {/* Upload Form (Admin/HR/Manager only) */}
      {isManager && showUploadForm && (
        <div className="bg-white p-8 rounded-xl shadow-lg border-l-4 border-red-500">
          <h4 className="text-xl font-bold text-gray-900 mb-6">Upload YouTube Video</h4>
          <form onSubmit={handleUploadVideo} className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">YouTube URL *</label>
                <input
                  type="url"
                  required
                  value={uploadData.url}
                  onChange={(e) => setUploadData({...uploadData, url: e.target.value})}
                  placeholder="https://youtu.be/xxxxx"
                  className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-red-500 focus:ring-2 focus:ring-red-200"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Title *</label>
                <input
                  type="text"
                  required
                  value={uploadData.title}
                  onChange={(e) => setUploadData({...uploadData, title: e.target.value})}
                  placeholder="Intro to Microservices"
                  className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-red-500 focus:ring-2 focus:ring-red-200"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Description</label>
              <textarea
                value={uploadData.description}
                onChange={(e) => setUploadData({...uploadData, description: e.target.value})}
                rows={3}
                placeholder="Brief description of the video content..."
                className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-red-500 focus:ring-2 focus:ring-red-200"
              />
            </div>
            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Category</label>
                <input
                  type="text"
                  value={uploadData.category}
                  onChange={(e) => setUploadData({...uploadData, category: e.target.value})}
                  placeholder="Backend, Frontend, etc."
                  className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-red-500 focus:ring-2 focus:ring-red-200"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Difficulty</label>
                <select
                  value={uploadData.difficulty}
                  onChange={(e) => setUploadData({...uploadData, difficulty: e.target.value})}
                  className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-red-500 focus:ring-2 focus:ring-red-200"
                >
                  <option>Beginner</option>
                  <option>Intermediate</option>
                  <option>Advanced</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Tags (comma-separated)</label>
                <input
                  type="text"
                  value={uploadData.tags}
                  onChange={(e) => setUploadData({...uploadData, tags: e.target.value})}
                  placeholder="Python, Backend, API"
                  className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-red-500 focus:ring-2 focus:ring-red-200"
                />
              </div>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Target Roles (comma-separated)</label>
                <input
                  type="text"
                  value={uploadData.target_roles}
                  onChange={(e) => setUploadData({...uploadData, target_roles: e.target.value})}
                  placeholder="Software Engineer, Data Analyst"
                  className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-red-500 focus:ring-2 focus:ring-red-200"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Target Skills (comma-separated)</label>
                <input
                  type="text"
                  value={uploadData.target_skills}
                  onChange={(e) => setUploadData({...uploadData, target_skills: e.target.value})}
                  placeholder="Python, Cloud, Architecture"
                  className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-red-500 focus:ring-2 focus:ring-red-200"
                />
              </div>
            </div>
            <button
              type="submit"
              className="w-full bg-gradient-to-r from-red-600 to-pink-600 text-white py-3 rounded-lg font-semibold hover:from-red-700 hover:to-pink-700 shadow-lg"
            >
              📤 Upload Video
            </button>
          </form>
        </div>
      )}

      {/* Video Grid */}
      {youtubeVideos.length > 0 ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {youtubeVideos.map((video) => (
            <div key={video.id} className="bg-white rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden group">
              {/* Thumbnail */}
              <div className="relative overflow-hidden bg-gray-900">
                <img
                  src={video.thumbnail || `https://img.youtube.com/vi/${video.url.split('/').pop()}/maxresdefault.jpg`}
                  alt={video.title}
                  className="w-full h-48 object-cover group-hover:scale-110 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <a
                    href={video.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-red-600 text-white px-6 py-3 rounded-full font-semibold hover:bg-red-700 flex items-center gap-2"
                  >
                    ▶ Watch Now
                  </a>
                </div>
                <div className="absolute top-3 right-3 bg-black/70 text-white px-2 py-1 rounded text-xs font-semibold">
                  {video.duration}
                </div>
              </div>

              {/* Content */}
              <div className="p-5">
                <div className="flex items-start justify-between mb-2">
                  <h4 className="font-bold text-lg text-gray-900 line-clamp-2 flex-1">{video.title}</h4>
                  <span className={`ml-2 px-2 py-1 rounded text-xs font-semibold whitespace-nowrap ${
                    video.difficulty === 'Beginner' ? 'bg-green-100 text-green-800' :
                    video.difficulty === 'Intermediate' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {video.difficulty}
                  </span>
                </div>
                
                <p className="text-sm text-gray-600 mb-3 line-clamp-2">{video.description}</p>
                
                <div className="flex items-center gap-2 text-xs text-gray-500 mb-3">
                  <span className="flex items-center gap-1">
                    <span>👁️</span> {video.views}
                  </span>
                  <span>•</span>
                  <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded">{video.category}</span>
                </div>

                {/* Tags */}
                <div className="flex flex-wrap gap-1">
                  {video.tags.slice(0, 3).map((tag, i) => (
                    <span key={i} className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white p-12 rounded-xl shadow-lg text-center">
          <span className="text-6xl mb-4 block">📺</span>
          <h3 className="text-xl font-bold text-gray-900 mb-2">No videos available yet</h3>
          <p className="text-gray-600">
            {isManager ? 'Upload your first video to get started!' : 'Check back soon for personalized video recommendations'}
          </p>
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Learning & Development</h1>
          <p className="text-gray-500">AI-Driven Skills & Career Growth</p>
        </div>

        <div className="flex space-x-4 mb-6 overflow-x-auto pb-2">
          {['youtube', 'training', 'prediction'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg font-medium capitalize whitespace-nowrap ${activeTab === tab ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
            >
              {tab === 'youtube' ? '📺 YouTube Hub' : tab === 'training' ? '🎓 Course Recommendations' : '🔮 Learning Outcomes'}
            </button>
          ))}
        </div>

        {activeTab === 'youtube' && renderYouTubeHub()}
        {activeTab === 'training' && renderTraining()}
        {activeTab === 'prediction' && renderPrediction()}
      </div>
    </div>
  );
}
