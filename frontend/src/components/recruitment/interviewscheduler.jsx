import { useState, useEffect } from 'react';
import { format, addDays, startOfWeek, addWeeks } from 'date-fns';
import api from '../../api/axios';
import { useToast } from '../../hooks/usetoast';

export default function InterviewScheduler({ application, onClose, onScheduled }) {
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTime, setSelectedTime] = useState(null);
  const [interviewers, setInterviewers] = useState([]);
  const [selectedInterviewers, setSelectedInterviewers] = useState([]);
  const [interviewType, setInterviewType] = useState('technical');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const { showToast } = useToast();

  const timeSlots = [
    '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
    '14:00', '14:30', '15:00', '15:30', '16:00', '16:30'
  ];

  const interviewTypes = [
    { value: 'technical', label: 'Technical Interview' },
    { value: 'hr', label: 'HR Interview' },
    { value: 'behavioral', label: 'Behavioral Interview' },
    { value: 'final', label: 'Final Interview' }
  ];

  useEffect(() => {
    fetchInterviewers();
  }, []);

  const fetchInterviewers = async () => {
    try {
      // Get users with interviewer roles
      const usersResponse = await api.get('/users');
      const interviewerUsers = usersResponse.data.filter(user => 
        ['hr', 'manager', 'admin'].includes(user.role)
      );
      
      // Get all employees
      const employeesResponse = await api.get('/employees');
      
      // Match users with their employee profiles
      const matchedInterviewers = interviewerUsers.map(user => {
        const employee = employeesResponse.data.find(emp => emp.user_id === user.id);
        if (employee) {
          return {
            ...employee,
            user: user
          };
        }
        // If no employee profile, create a basic interviewer object
        return {
          id: user.id,
          first_name: user.email.split('@')[0],
          last_name: '',
          department: user.role.toUpperCase(),
          position: user.role,
          user: user
        };
      });
      
      console.log('Found interviewers:', matchedInterviewers);
      setInterviewers(matchedInterviewers);
    } catch (error) {
      console.error('Error fetching interviewers:', error);
      showToast('Failed to load interviewers', 'error');
    }
  };

  const getWeekDays = () => {
    const start = startOfWeek(currentWeek, { weekStartsOn: 1 });
    return Array.from({ length: 5 }, (_, i) => addDays(start, i));
  };

  const handleSchedule = async () => {
    if (!selectedDate || !selectedTime || selectedInterviewers.length === 0) {
      showToast('Please select date, time, and at least one interviewer', 'error');
      return;
    }

    setLoading(true);
    try {
      const interviewData = {
        application_id: application.id,
        scheduled_date: format(selectedDate, 'yyyy-MM-dd'),
        scheduled_time: selectedTime,
        interviewer_ids: selectedInterviewers,
        interview_type: interviewType,
        notes: notes,
        status: 'scheduled'
      };

      console.log('Sending interview data:', interviewData);
      await api.post('/recruitment/interviews', interviewData);
      showToast('Interview scheduled successfully', 'success');
      onScheduled();
      onClose();
    } catch (error) {
      console.error('Error scheduling interview:', error);
      if (error.response?.status === 422) {
        showToast('Invalid interview data. Please check all fields.', 'error');
      } else if (error.response?.status === 404) {
        showToast('Interview endpoint not found. Server may need restart.', 'error');
      } else {
        showToast('Failed to schedule interview', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  const toggleInterviewer = (interviewerId) => {
    setSelectedInterviewers(prev => 
      prev.includes(interviewerId)
        ? prev.filter(id => id !== interviewerId)
        : [...prev, interviewerId]
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800">Schedule Interview</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="font-semibold text-gray-800 mb-2">Candidate Information</h3>
          <p className="text-gray-600">
            <span className="font-medium">Name:</span> {application.candidate_name}
          </p>
          <p className="text-gray-600">
            <span className="font-medium">Position:</span> {application.job_title}
          </p>
          <p className="text-gray-600">
            <span className="font-medium">Email:</span> {application.email}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Calendar Section */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Select Date</h3>
            <div className="mb-4 flex justify-between items-center">
              <button
                onClick={() => setCurrentWeek(addWeeks(currentWeek, -1))}
                className="p-2 hover:bg-gray-100 rounded"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <span className="font-medium">
                {format(getWeekDays()[0], 'MMM d')} - {format(getWeekDays()[4], 'MMM d, yyyy')}
              </span>
              <button
                onClick={() => setCurrentWeek(addWeeks(currentWeek, 1))}
                className="p-2 hover:bg-gray-100 rounded"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>

            <div className="grid grid-cols-5 gap-2 mb-6">
              {getWeekDays().map((day, index) => (
                <button
                  key={index}
                  onClick={() => setSelectedDate(day)}
                  className={`p-3 text-center rounded-lg border ${
                    selectedDate && format(selectedDate, 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd')
                      ? 'bg-blue-500 text-white border-blue-500'
                      : 'bg-white hover:bg-gray-50 border-gray-200'
                  }`}
                >
                  <div className="text-xs text-gray-500">
                    {format(day, 'EEE')}
                  </div>
                  <div className="font-medium">
                    {format(day, 'd')}
                  </div>
                </button>
              ))}
            </div>

            {/* Time Slots */}
            {selectedDate && (
              <div>
                <h4 className="font-medium mb-3">Select Time</h4>
                <div className="grid grid-cols-3 gap-2">
                  {timeSlots.map((time) => (
                    <button
                      key={time}
                      onClick={() => setSelectedTime(time)}
                      className={`p-2 text-sm rounded border ${
                        selectedTime === time
                          ? 'bg-blue-500 text-white border-blue-500'
                          : 'bg-white hover:bg-gray-50 border-gray-200'
                      }`}
                    >
                      {time}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Interview Details Section */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Interview Details</h3>
            
            {/* Interview Type */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Interview Type
              </label>
              <select
                value={interviewType}
                onChange={(e) => setInterviewType(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {interviewTypes.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Interviewers */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Interviewers
              </label>
              <div className="max-h-40 overflow-y-auto border border-gray-300 rounded-md p-2">
                {interviewers.length === 0 ? (
                  <div className="text-gray-500 text-center py-4">
                    Loading interviewers...
                  </div>
                ) : (
                  interviewers.map((interviewer) => (
                    <label key={interviewer.id} className="flex items-center p-2 hover:bg-gray-50 rounded">
                      <input
                        type="checkbox"
                        checked={selectedInterviewers.includes(interviewer.id)}
                        onChange={() => toggleInterviewer(interviewer.id)}
                        className="mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <div>
                        <div className="font-medium">{interviewer.first_name} {interviewer.last_name}</div>
                        <div className="text-sm text-gray-500">{interviewer.user?.role} - {interviewer.department}</div>
                      </div>
                    </label>
                  ))
                )}
              </div>
            </div>

            {/* Notes */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notes (Optional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Add any special instructions or notes for the interview..."
              />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={handleSchedule}
                disabled={loading || !selectedDate || !selectedTime || selectedInterviewers.length === 0}
                className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Scheduling...' : 'Schedule Interview'}
              </button>
              <button
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}