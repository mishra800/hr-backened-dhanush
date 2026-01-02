import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/axios';

export default function AIInterview() {
  const { applicationId } = useParams();
  const navigate = useNavigate();
  const [interview, setInterview] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    startInterview();
  }, [applicationId]);

  const startInterview = async () => {
    try {
      // 1. Start or Get Interview
      const res = await api.post('/ai-interview/start', { application_id: applicationId });
      setInterview(res.data);

      // 2. Get Next Question
      if (res.data.status !== 'completed') {
        const qRes = await api.get(`/ai-interview/${res.data.id}/next-question`);
        if (qRes.data.completed) {
          setCompleted(true);
        } else {
          setCurrentQuestion(qRes.data.question);
        }
      } else {
        setCompleted(true);
      }
    } catch (error) {
      console.error('Error starting interview:', error);
      alert('Failed to start interview.');
    }
  };

  const handleSubmitResponse = async (e) => {
    e.preventDefault();
    if (!response.trim()) return;

    setLoading(true);
    try {
      const res = await api.post('/ai-interview/respond', {
        interview_id: interview.id,
        candidate_response: response
      });

      setFeedback(res.data.ai_feedback);
      setResponse('');

      if (res.data.completed) {
        setCompleted(true);
        setCurrentQuestion(null);
      } else {
        // Delay slightly to show feedback before next question
        setTimeout(() => {
          setFeedback(null);
          setCurrentQuestion(res.data.next_question);
        }, 2000);
      }
    } catch (error) {
      console.error('Error submitting response:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!interview) return <div className="p-8 text-center">Loading Interview...</div>;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl w-full space-y-8 bg-white p-10 rounded-xl shadow-lg">
        <div className="text-center">
          <h2 className="text-3xl font-extrabold text-gray-900">AI Interview Assistant</h2>
          <p className="mt-2 text-sm text-gray-600">
            Application ID: {applicationId}
          </p>
        </div>

        {completed ? (
          <div className="text-center space-y-4">
            <div className="text-green-500 text-5xl mb-4">🎉</div>
            <h3 className="text-2xl font-bold text-gray-900">Interview Completed!</h3>
            <p className="text-gray-600">Thank you for your time. The AI has analyzed your responses.</p>
            <div className="bg-blue-50 p-4 rounded-md mt-6">
              <p className="font-medium text-blue-900">Overall Score: {interview.overall_score || 'Calculating...'}</p>
              <p className="text-sm text-blue-700 mt-1">Tone Analysis: {interview.emotional_tone || 'Analyzing...'}</p>
            </div>
            <button
              onClick={() => navigate('/recruitment')}
              className="mt-6 w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
            >
              Return to Recruitment
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="bg-indigo-50 border-l-4 border-indigo-500 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <span className="text-2xl">🤖</span>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-indigo-700 font-medium">
                    AI Interviewer
                  </p>
                  <p className="text-lg text-indigo-900 mt-1 font-semibold">
                    {currentQuestion || "Loading question..."}
                  </p>
                </div>
              </div>
            </div>

            {feedback && (
              <div className="bg-green-50 border border-green-200 rounded-md p-3 animate-pulse">
                <p className="text-sm text-green-800"><strong>AI Feedback:</strong> {feedback}</p>
              </div>
            )}

            <form onSubmit={handleSubmitResponse} className="mt-8 space-y-6">
              <div>
                <label htmlFor="response" className="sr-only">
                  Your Answer
                </label>
                <textarea
                  id="response"
                  name="response"
                  rows={5}
                  className="shadow-sm focus:ring-primary focus:border-primary block w-full sm:text-sm border-gray-300 rounded-md"
                  placeholder="Type your answer here..."
                  value={response}
                  onChange={(e) => setResponse(e.target.value)}
                  disabled={loading || !!feedback}
                />
              </div>

              <div>
                <button
                  type="submit"
                  disabled={loading || !response.trim() || !!feedback}
                  className={`group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white ${loading || !!feedback ? 'bg-gray-400 cursor-not-allowed' : 'bg-primary hover:bg-blue-700'
                    } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary`}
                >
                  {loading ? 'Analyzing...' : 'Submit Answer'}
                </button>
              </div>
            </form>
            <div className="text-center">
              <p className="text-xs text-gray-400">Voice input is currently disabled in this demo.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
