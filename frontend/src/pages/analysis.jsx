import { useState, useEffect } from 'react';
import api from '../api/axios';

export default function Analysis() {
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchInsights();
  }, []);

  const fetchInsights = async () => {
    try {
      const response = await api.get('/analysis/insights');
      setInsights(response.data);
    } catch (error) {
      console.error('Error fetching insights:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="flex justify-center items-center h-64 text-gray-500">Loading analysis...</div>;
  if (!insights) return <div className="text-red-500">Failed to load insights.</div>;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold mb-8 text-gray-900">Executive HR Analytics</h1>

      {/* High-Level Metrics */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <div className="bg-white overflow-hidden shadow rounded-lg border-l-4 border-red-500">
          <div className="px-4 py-5 sm:p-6">
            <dt className="text-sm font-medium text-gray-500 truncate">Attrition Risk</dt>
            <dd className={`mt-1 text-3xl font-semibold ${insights.attrition_risk === 'Low' ? 'text-green-600' : 'text-red-600'}`}>
              {insights.attrition_risk}
            </dd>
            <p className="text-xs text-gray-400 mt-2">Based on Engagement & Salary data</p>
          </div>
        </div>
        <div className="bg-white overflow-hidden shadow rounded-lg border-l-4 border-blue-500">
          <div className="px-4 py-5 sm:p-6">
            <dt className="text-sm font-medium text-gray-500 truncate">Hiring Velocity</dt>
            <dd className="mt-1 text-3xl font-semibold text-blue-600">
              {insights.hiring_velocity}
            </dd>
            <p className="text-xs text-gray-400 mt-2">Avg time to hire</p>
          </div>
        </div>
        <div className="bg-white overflow-hidden shadow rounded-lg border-l-4 border-purple-500">
          <div className="px-4 py-5 sm:p-6">
            <dt className="text-sm font-medium text-gray-500 truncate">Employee Sentiment</dt>
            <dd className="mt-1 text-3xl font-semibold text-purple-600">
              {insights.employee_sentiment}
            </dd>
            <p className="text-xs text-gray-400 mt-2">From Surveys & Feedback</p>
          </div>
        </div>
        <div className="bg-white overflow-hidden shadow rounded-lg border-l-4 border-green-500">
          <div className="px-4 py-5 sm:p-6">
            <dt className="text-sm font-medium text-gray-500 truncate">Performance Index</dt>
            <dd className="mt-1 text-3xl font-semibold text-green-600">
              7.8/10
            </dd>
            <p className="text-xs text-gray-400 mt-2">Avg Org Performance</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Top Performers */}
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg leading-6 font-medium text-gray-900">🏆 Top Performers</h3>
            <span className="text-sm text-blue-600 cursor-pointer hover:underline">View All</span>
          </div>
          <div className="flow-root">
            <ul className="-my-5 divide-y divide-gray-200">
              {insights.top_performers.map((name, index) => (
                <li key={index} className="py-4">
                  <div className="flex items-center space-x-4">
                    <div className="flex-shrink-0">
                      <span className="inline-block h-8 w-8 rounded-full bg-yellow-100 text-yellow-600 text-center pt-1 font-bold">
                        {index + 1}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{name}</p>
                      <p className="text-sm text-gray-500 truncate">Consistent High Ratings</p>
                    </div>
                    <div>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Outstanding
                      </span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Skill Gaps */}
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg leading-6 font-medium text-gray-900">📉 Critical Skill Gaps</h3>
            <span className="text-sm text-blue-600 cursor-pointer hover:underline">L&D Plan</span>
          </div>
          <p className="text-sm text-gray-500 mb-4">
            These skills are missing in key roles and require immediate training intervention.
          </p>
          <div className="space-y-4">
            {insights.skill_gaps.map((skill, index) => (
              <div key={index}>
                <div className="flex justify-between text-sm font-medium">
                  <span className="text-gray-700">{skill}</span>
                  <span className="text-red-600">High Priority</span>
                </div>
                <div className="mt-1 w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-red-500 h-2 rounded-full" style={{ width: `${30 + (index * 15)}%` }}></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* AI Workforce Planner Section */}
      <div className="mt-8 bg-gradient-to-r from-indigo-50 to-blue-50 rounded-lg p-6 border border-indigo-100">
        <div className="flex items-center mb-6">
          <span className="text-3xl mr-3">🤖</span>
          <div>
            <h2 className="text-2xl font-bold text-indigo-900">AI Workforce Planner</h2>
            <p className="text-indigo-600 text-sm">Predictive analytics for future workforce needs</p>
          </div>
        </div>

        <WorkforcePlanner />
      </div>
    </div>
  );
}

function WorkforcePlanner() {
  const [data, setData] = useState(null);

  useEffect(() => {
    api.get('/analysis/workforce-planning').then(res => setData(res.data)).catch(console.error);
  }, []);

  if (!data) return <div className="text-center py-4 text-indigo-400">Loading AI predictions...</div>;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* 1. Skill Shortages */}
      <div className="bg-white rounded-lg shadow-sm p-4 border border-red-100">
        <h3 className="font-bold text-red-800 mb-3 flex items-center">
          <span className="w-2 h-2 bg-red-500 rounded-full mr-2"></span>
          Predicted Skill Shortages
        </h3>
        <ul className="space-y-3">
          {data.skill_shortages.map((item, idx) => (
            <li key={idx} className="flex justify-between items-center text-sm">
              <span className="font-medium text-gray-700">{item.skill}</span>
              <div className="flex items-center">
                <span className="bg-red-100 text-red-800 px-2 py-0.5 rounded text-xs font-bold mr-2">
                  -{item.shortage_count}
                </span>
                <span className="text-xs text-red-500 uppercase">{item.urgency}</span>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* 2. Future Hiring Needs */}
      <div className="bg-white rounded-lg shadow-sm p-4 border border-blue-100">
        <h3 className="font-bold text-blue-800 mb-3 flex items-center">
          <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
          Future Hiring Needs (Pipeline)
        </h3>
        <ul className="space-y-3">
          {data.future_hiring_needs.map((item, idx) => (
            <li key={idx} className="flex justify-between items-center text-sm">
              <div>
                <div className="font-medium text-gray-700">{item.role}</div>
                <div className="text-xs text-gray-400">{item.quarter}</div>
              </div>
              <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-bold">
                +{item.count}
              </span>
            </li>
          ))}
        </ul>
      </div>

      {/* 3. Bench Surplus Risk */}
      <div className="bg-white rounded-lg shadow-sm p-4 border border-yellow-100">
        <h3 className="font-bold text-yellow-800 mb-3 flex items-center">
          <span className="w-2 h-2 bg-yellow-500 rounded-full mr-2"></span>
          Potential Bench Surplus
        </h3>
        <ul className="space-y-3">
          {data.bench_surplus.map((item, idx) => (
            <li key={idx} className="flex justify-between items-center text-sm">
              <div>
                <div className="font-medium text-gray-700">{item.role}</div>
                <div className="text-xs text-yellow-600">{item.risk}</div>
              </div>
              <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs font-bold">
                {item.count}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
