import { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/authcontext';
import NotificationCenter from './NotificationCenter';
import logo from '../assets/logo.png';

export default function Layout() {
  const { logout, user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState([
    { sender: 'bot', text: 'Hi! I am your HR Assistant. Ask me about policies, leave, or payroll.' }
  ]);
  const [chatInput, setChatInput] = useState('');

  const handleChatSubmit = (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const userMsg = { sender: 'user', text: chatInput };
    setChatMessages(prev => [...prev, userMsg]);

    // Mock AI Response
    setTimeout(() => {
      let botText = "I can help with that. Please check the handbook.";
      const lower = chatInput.toLowerCase();
      if (lower.includes('leave')) botText = "You have 12 days of leave remaining. Our policy allows 2 days WFH per week.";
      else if (lower.includes('pf') || lower.includes('provident')) botText = "The company contributes 12% of your basic salary to PF.";
      else if (lower.includes('travel') || lower.includes('allowance')) botText = "Travel allowance is capped at $500/month for your band.";
      else if (lower.includes('python')) botText = "I found 3 open requisitions for Python Developers. Shall I create a new one?";

      setChatMessages(prev => [...prev, { sender: 'bot', text: botText }]);
    }, 1000);

    setChatInput('');
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Mock Role (In real app, get from user.role)
  // For demo, assume 'admin' sees everything, 'employee' sees limited
  // Since we don't have role in context yet, we'll default to showing all but mark some as (HR) visually or logic
  // Actually, let's assume the user object has a role if logged in.
  const role = user?.role || 'employee'; // Default to employee

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', roles: ['admin', 'hr', 'manager', 'employee'] },
    { name: '🔐 Super Admin', href: '/dashboard/superadmin', roles: ['admin'], highlight: true },
    { name: 'Recruitment', href: '/dashboard/recruitment', roles: ['admin', 'hr', 'manager'] },
    { name: 'Employees', href: '/dashboard/employees', roles: ['admin', 'hr', 'manager'] },
    { name: 'Attendance', href: '/dashboard/attendance', roles: ['admin', 'hr', 'manager', 'employee'] },
    { name: 'Leave', href: '/dashboard/leave', roles: ['admin', 'hr', 'manager', 'employee'] },
    { name: 'Payroll', href: '/dashboard/payroll', roles: ['admin', 'hr', 'employee'] },
    { name: 'Performance', href: '/dashboard/performance', roles: ['admin', 'hr', 'manager', 'employee'] },
    { name: 'Engagement', href: '/dashboard/engagement', roles: ['admin', 'hr', 'manager'] },
    { name: 'Learning', href: '/dashboard/learning', roles: ['admin', 'hr', 'manager', 'employee'] },
    { name: 'Career', href: '/dashboard/career', roles: ['admin', 'hr', 'manager', 'employee'] },
    { name: 'Onboarding', href: '/dashboard/onboarding', roles: ['admin', 'hr'] },
    { name: 'Assets & Access', href: '/dashboard/assets', roles: ['admin', 'hr'] },
    { name: 'Announcements', href: '/dashboard/announcements', roles: ['admin', 'hr', 'manager', 'employee'] },
    { name: 'Analysis', href: '/dashboard/analysis', roles: ['admin', 'hr'] },
    { name: 'Profile', href: '/dashboard/profile', roles: ['admin', 'hr', 'manager', 'employee'] },
    { name: 'Documents', href: '/dashboard/documents', roles: ['admin', 'hr'] },
    { name: 'Meetings', href: '/dashboard/meetings', roles: ['admin', 'hr', 'manager'] },
    { name: '🔔 Notifications', href: '/dashboard/notifications', roles: ['admin', 'hr', 'manager', 'employee'] },
    { name: '❓ Help', href: '/dashboard/help', roles: ['admin', 'hr', 'manager', 'employee'] },
  ];

  return (
    <div className="min-h-screen bg-gray-100 flex">
      {/* Sidebar */}
      <div className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0">
        <div className="flex-1 flex flex-col min-h-0 bg-gray-800">
          <div className="flex items-center h-16 flex-shrink-0 px-4 bg-gray-900">
            <img src={logo} alt="Dhanush Logo" className="h-8 w-auto" />
          </div>
          <div className="flex-1 flex flex-col overflow-y-auto">
            <nav className="flex-1 px-2 py-4 space-y-1">
              {navigation.map((item) => {
                if (!item.roles.includes(role)) return null;

                const isActive = location.pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`${isActive ? 'bg-gray-900 text-white' : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                      } group flex items-center px-2 py-2 text-sm font-medium rounded-md`}
                  >
                    {item.name}
                  </Link>
                );
              })}
            </nav>
          </div>
          <div className="flex-shrink-0 flex bg-gray-700 p-4">
            <div className="flex-shrink-0 w-full group block">
              <div className="flex items-center">
                <div className="ml-3">
                  <p className="text-sm font-medium text-white">{user?.email || 'User'}</p>
                  <button
                    onClick={handleLogout}
                    className="text-xs font-medium text-gray-300 group-hover:text-white"
                  >
                    Logout
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Sidebar Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-40 flex md:hidden">
          <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setIsMobileMenuOpen(false)}></div>
          <div className="relative flex-1 flex flex-col max-w-xs w-full bg-gray-800">
            <div className="absolute top-0 right-0 -mr-12 pt-2">
              <button
                className="ml-1 flex items-center justify-center h-10 w-10 rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <span className="sr-only">Close sidebar</span>
                <svg className="h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex-1 h-0 pt-5 pb-4 overflow-y-auto">
              <div className="flex-shrink-0 flex items-center px-4">
                <img src={logo} alt="Dhanush Logo" className="h-8 w-auto" />
              </div>
              <nav className="mt-5 px-2 space-y-1">
                {navigation.map((item) => {
                  if (!item.roles.includes(role)) return null;
                  const isActive = location.pathname === item.href;
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={`${isActive ? 'bg-gray-900 text-white' : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                        } group flex items-center px-2 py-2 text-base font-medium rounded-md`}
                    >
                      {item.name}
                    </Link>
                  );
                })}
              </nav>
            </div>
            <div className="flex-shrink-0 flex bg-gray-700 p-4">
              <div className="flex-shrink-0 group block">
                <div className="flex items-center">
                  <div className="ml-3">
                    <p className="text-base font-medium text-white">{user?.email || 'User'}</p>
                    <button
                      onClick={handleLogout}
                      className="text-sm font-medium text-gray-300 group-hover:text-white"
                    >
                      Logout
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="flex-shrink-0 w-14"></div>
        </div>
      )}

      {/* Main content */}
      <div className="md:pl-64 flex flex-col flex-1">
        {/* Top Header */}
        <div className="bg-white shadow-sm sticky top-0 z-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 h-16 flex items-center justify-between">
            <div className="flex items-center">
              <button
                className="px-4 border-r border-gray-200 text-gray-500 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500 md:hidden"
                onClick={() => setIsMobileMenuOpen(true)}
              >
                <span className="sr-only">Open sidebar</span>
                <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              <h2 className="text-xl font-semibold text-gray-800 ml-4 md:ml-0">
                {role === 'admin' && '👑 Admin Workspace'}
                {role === 'hr' && '💼 HR Console'}
                {role === 'manager' && '👨‍💼 Manager Dashboard'}
                {role === 'employee' && '👤 Employee Portal'}
              </h2>
            </div>
            <div className="flex items-center space-x-4">
              {/* Notification Center */}
              <NotificationCenter />
              
              <span className={`hidden md:inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide
                ${role === 'admin' ? 'bg-purple-100 text-purple-800' :
                  role === 'hr' ? 'bg-blue-100 text-blue-800' :
                    role === 'manager' ? 'bg-orange-100 text-orange-800' :
                        'bg-gray-100 text-gray-800'}`}>
                {role}
              </span>
              <span className="text-sm text-gray-500">
                {user?.email}
              </span>
            </div>
          </div>
        </div>

        <main className="flex-1">
          <div className="py-6">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
              <Outlet />
            </div>
          </div>
        </main>

        {/* AI Voice/Chat Assistant Floating Button */}
        <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end space-y-4">
          {isChatOpen && (
            <div className="bg-white rounded-lg shadow-2xl w-80 h-96 flex flex-col overflow-hidden border border-gray-200 animate-fade-in-up">
              <div className="bg-gradient-to-r from-pink-500 to-rose-500 p-4 text-white flex justify-between items-center">
                <h3 className="font-bold">HR Assistant</h3>
                <button onClick={() => setIsChatOpen(false)} className="text-white hover:text-gray-200">✕</button>
              </div>
              <div className="flex-1 p-4 overflow-y-auto bg-gray-50 space-y-3">
                {chatMessages.map((msg, idx) => (
                  <div key={idx} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${msg.sender === 'user' ? 'bg-pink-500 text-white' : 'bg-white border border-gray-200 text-gray-800'
                      }`}>
                      {msg.text}
                    </div>
                  </div>
                ))}
              </div>
              <form onSubmit={handleChatSubmit} className="p-3 bg-white border-t flex">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Ask anything..."
                  className="flex-1 border border-gray-300 rounded-l-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-pink-500"
                />
                <button type="submit" className="bg-pink-500 text-white px-4 py-2 rounded-r-md hover:bg-pink-600">
                  ➤
                </button>
              </form>
            </div>
          )}

          <button
            onClick={() => setIsChatOpen(!isChatOpen)}
            className="bg-gradient-to-r from-pink-500 to-rose-500 text-white p-4 rounded-full shadow-lg hover:shadow-xl transform hover:scale-110 transition-all flex items-center justify-center"
          >
            <span className="text-2xl">{isChatOpen ? '💬' : '🎙️'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
