import { useState, useEffect } from 'react';
import api from '../api/axios';
import { Link } from 'react-router-dom';

export default function Career() {
  const [jobs, setJobs] = useState([]);

  useEffect(() => {
    fetchJobs();
  }, []);

  const fetchJobs = async () => {
    try {
      const response = await api.get('/career/jobs');
      setJobs(response.data);
    } catch (error) {
      console.error('Error fetching jobs:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">Careers at AI HR System</h1>
          <Link to="/login" className="text-primary font-medium hover:text-blue-800">Employee Login</Link>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
            Join Our Team
          </h2>
          <p className="mt-4 text-lg text-gray-500">
            We are looking for talented individuals to help us build the future of HR.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
          {jobs.map((job) => (
            <div key={job.id} className="bg-white overflow-hidden shadow rounded-lg hover:shadow-lg transition-shadow duration-300">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900">
                  {job.title}
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  {job.department} • {job.location}
                </p>
                <p className="mt-4 text-sm text-gray-600 line-clamp-3">
                  {job.description}
                </p>
                <div className="mt-6">
                  <button className="w-full bg-primary text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-600">
                    Apply Now
                  </button>
                </div>
              </div>
            </div>
          ))}
          {jobs.length === 0 && (
            <div className="col-span-full text-center text-gray-500">
              No open positions at the moment.
            </div>
          )}
        </div>

        {/* AI Career Path Recommender */}
        <div className="mt-16 bg-white rounded-lg shadow-lg p-8 border-t-4 border-purple-500">
          <div className="flex items-center mb-8">
            <span className="text-4xl mr-4">🚀</span>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">AI Career Path Recommender</h2>
              <p className="text-gray-500">Internal Mobility & Growth Roadmap</p>
            </div>
          </div>

          <CareerPathRecommender />
        </div>
      </main>
    </div>
  );
}

function CareerPathRecommender() {
  const [pathData, setPathData] = useState(null);
  const employeeId = 1; // Mock ID for logged-in user

  useEffect(() => {
    // In a real app, we'd check if the user is logged in before fetching
    api.get(`/career/path-recommendation/${employeeId}`)
      .then(res => setPathData(res.data))
      .catch(err => console.log("Not logged in or error", err));
  }, []);

  if (!pathData) return <div className="text-gray-400 italic">Log in to see your personalized career path.</div>;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-center space-x-4 mb-8">
        <div className="bg-gray-100 px-6 py-3 rounded-full font-bold text-gray-700 border border-gray-300">
          Current: {pathData.current_role}
        </div>
        <span className="text-2xl text-gray-400">➔</span>
        <div className="text-gray-500 italic">Where next?</div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {pathData.recommendations.map((rec, idx) => (
          <div key={idx} className="border rounded-xl p-6 hover:shadow-md transition-shadow bg-gradient-to-br from-white to-purple-50">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-xl font-bold text-purple-900">{rec.target_role}</h3>
              <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-xs font-bold">
                {rec.match_score}% Match
              </span>
            </div>

            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-1">Estimated Timeframe:</p>
              <p className="font-semibold text-gray-900">{rec.timeframe}</p>
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-xs font-bold text-red-500 uppercase tracking-wide mb-2">Skill Gaps</p>
                <div className="flex flex-wrap gap-2">
                  {rec.skill_gaps.map((skill, i) => (
                    <span key={i} className="bg-red-50 text-red-700 px-2 py-1 rounded text-xs border border-red-100">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-xs font-bold text-blue-500 uppercase tracking-wide mb-2">Recommended Learning</p>
                <ul className="text-sm space-y-1">
                  {rec.learning_path.map((course, i) => (
                    <li key={i} className="flex items-center text-gray-700">
                      <span className="text-blue-500 mr-2">▶</span>
                      <a href="#" className="hover:underline hover:text-blue-600">{course}</a>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <button className="w-full mt-6 bg-white border border-purple-200 text-purple-700 py-2 rounded-lg font-medium hover:bg-purple-50">
              View Detailed Roadmap
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
