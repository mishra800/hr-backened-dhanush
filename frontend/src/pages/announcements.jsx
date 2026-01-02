import { useState, useEffect } from 'react';
import api from '../api/axios';

export default function Announcements() {
  const [announcements, setAnnouncements] = useState([]);
  const [newAnn, setNewAnn] = useState({ title: '', content: '' });
  const isAdmin = true; // Mock Admin

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const fetchAnnouncements = async () => {
    try {
      const response = await api.get('/announcements/');
      setAnnouncements(response.data);
    } catch (error) {
      console.error('Error fetching announcements:', error);
    }
  };

  const handlePost = async (e) => {
    e.preventDefault();
    try {
      await api.post('/announcements/', newAnn);
      setNewAnn({ title: '', content: '' });
      fetchAnnouncements();
      alert("Announcement posted!");
    } catch (error) {
      console.error('Error posting announcement:', error);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">📢 Communication Hub</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Feed */}
        <div className="lg:col-span-2 space-y-6">
          {announcements.map((ann) => (
            <div key={ann.id} className="bg-white shadow overflow-hidden sm:rounded-lg">
              <div className="px-4 py-5 sm:px-6 flex justify-between items-start">
                <div>
                  <h3 className="text-lg leading-6 font-medium text-gray-900">{ann.title}</h3>
                  <p className="mt-1 max-w-2xl text-sm text-gray-500">Posted by HR • {new Date(ann.created_at).toLocaleDateString()}</p>
                </div>
              </div>
              <div className="border-t border-gray-200 px-4 py-5 sm:p-6">
                <p className="text-gray-700 whitespace-pre-wrap">{ann.content}</p>
              </div>
              <div className="bg-gray-50 px-4 py-4 sm:px-6 flex justify-end">
                <button className="text-sm text-blue-600 hover:text-blue-500 font-medium">Acknowledge Read</button>
              </div>
            </div>
          ))}
          {announcements.length === 0 && <p className="text-gray-500 text-center">No announcements yet.</p>}
        </div>

        {/* Post Form (Admin Only) */}
        {isAdmin && (
          <div className="bg-white shadow sm:rounded-lg p-6 h-fit sticky top-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Post New Announcement</h3>
            <form onSubmit={handlePost} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Title</label>
                <input
                  type="text"
                  value={newAnn.title}
                  onChange={(e) => setNewAnn({ ...newAnn, title: e.target.value })}
                  required
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary sm:text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Content</label>
                <textarea
                  rows={4}
                  value={newAnn.content}
                  onChange={(e) => setNewAnn({ ...newAnn, content: e.target.value })}
                  required
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary sm:text-sm"
                />
              </div>
              <button type="submit" className="w-full bg-primary text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700">
                Broadcast to All
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
