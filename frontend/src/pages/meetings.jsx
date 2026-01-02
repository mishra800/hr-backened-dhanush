import { useState } from 'react';

export default function Meetings() {
  const [meetings] = useState([
    {
      id: 1,
      title: 'Team Standup',
      date: '2024-12-03',
      time: '09:00 AM',
      duration: '30 min',
      attendees: 8,
      type: 'Recurring',
      status: 'upcoming'
    },
    {
      id: 2,
      title: 'Performance Review - John Doe',
      date: '2024-12-03',
      time: '02:00 PM',
      duration: '1 hour',
      attendees: 2,
      type: 'One-on-One',
      status: 'upcoming'
    },
    {
      id: 3,
      title: 'Project Planning',
      date: '2024-12-02',
      time: '10:00 AM',
      duration: '2 hours',
      attendees: 12,
      type: 'Meeting',
      status: 'completed'
    },
  ]);

  const [view, setView] = useState('upcoming');

  const filteredMeetings = meetings.filter(m => m.status === view);

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Meetings</h1>
        <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          Schedule Meeting
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setView('upcoming')}
            className={`px-4 py-2 rounded-lg ${
              view === 'upcoming' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'
            }`}
          >
            Upcoming
          </button>
          <button
            onClick={() => setView('completed')}
            className={`px-4 py-2 rounded-lg ${
              view === 'completed' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'
            }`}
          >
            Past
          </button>
        </div>

        <div className="space-y-4">
          {filteredMeetings.map((meeting) => (
            <div
              key={meeting.id}
              className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {meeting.title}
                  </h3>
                  <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      {meeting.date}
                    </div>
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {meeting.time} ({meeting.duration})
                    </div>
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                      {meeting.attendees} attendees
                    </div>
                    <div>
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                        {meeting.type}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  {meeting.status === 'upcoming' && (
                    <>
                      <button className="px-3 py-1 text-blue-600 hover:bg-blue-50 rounded">
                        Join
                      </button>
                      <button className="px-3 py-1 text-gray-600 hover:bg-gray-50 rounded">
                        Edit
                      </button>
                    </>
                  )}
                  {meeting.status === 'completed' && (
                    <button className="px-3 py-1 text-gray-600 hover:bg-gray-50 rounded">
                      View Notes
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredMeetings.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            No {view} meetings
          </div>
        )}
      </div>
    </div>
  );
}
