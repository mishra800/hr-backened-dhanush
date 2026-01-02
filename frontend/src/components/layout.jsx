import { useState, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/authcontext';
import NotificationCenter from './NotificationCenter';
import aiAssistantService from '../services/aiAssistantService';

export default function Layout() {
  const { logout, user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [chatMessages, setChatMessages] = useState([
    { sender: 'bot', text: 'Hi! I am your HR Assistant. I can provide real-time information about your leave balance, salary, attendance, and more. What would you like to know?' }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [suggestions, setSuggestions] = useState([]);

  const role = user?.role || 'employee';

  const handleChatSubmit = async (e) => {
    e.preventDefault();
    if (!chatInput.trim() || isTyping) return;

    const userMsg = { sender: 'user', text: chatInput };
    setChatMessages(prev => [...prev, userMsg]);
    
    const currentInput = chatInput;
    setChatInput('');
    setIsTyping(true);

    try {
      // Try to get real-time response from API
      const response = await aiAssistantService.sendMessage(currentInput);
      const formattedResponse = aiAssistantService.formatResponse(response);
      
      setChatMessages(prev => [...prev, { 
        sender: 'bot', 
        text: formattedResponse,
        data: response.data 
      }]);
    } catch (error) {
      console.error('Error getting AI response:', error);
      
      // Fallback to local response
      const localResponse = aiAssistantService.getLocalResponse(currentInput);
      const formattedResponse = aiAssistantService.formatResponse(localResponse);
      
      setChatMessages(prev => [...prev, { 
        sender: 'bot', 
        text: formattedResponse + "\n\n⚠️ I'm currently offline, but I'll be back with real-time data soon!"
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleSuggestionClick = (suggestion) => {
    setChatInput(suggestion);
  };

  // Load suggestions when chat opens
  useEffect(() => {
    if (isChatOpen && suggestions.length === 0) {
      aiAssistantService.getSuggestions().then(data => {
        setSuggestions(data.suggestions || []);
      });
    }
  }, [isChatOpen]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      setShowUserMenu(false);
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const navigation = [
    { 
      name: 'Dashboard', 
      href: '/dashboard', 
      icon: '📊', 
      roles: ['admin', 'hr', 'manager', 'employee'],
      color: 'text-blue-600'
    },
    { 
      name: 'Super Admin', 
      href: '/dashboard/superadmin', 
      icon: '👑', 
      roles: ['admin'], 
      highlight: true,
      color: 'text-purple-600'
    },
    { 
      name: 'Recruitment', 
      href: '/dashboard/recruitment', 
      icon: '👥', 
      roles: ['admin', 'hr', 'manager'],
      color: 'text-green-600'
    },
    { 
      name: 'Employees', 
      href: '/dashboard/employees', 
      icon: '👤', 
      roles: ['admin', 'hr', 'manager'],
      color: 'text-indigo-600'
    },
    { 
      name: 'Attendance', 
      href: '/dashboard/attendance', 
      icon: '📅', 
      roles: ['admin', 'hr', 'manager', 'employee'], // Candidates explicitly excluded
      color: 'text-orange-600'
    },
    { 
      name: 'Leave', 
      href: '/dashboard/leave', 
      icon: '🏖️', 
      roles: ['admin', 'hr', 'manager', 'employee'],
      color: 'text-emerald-600'
    },
    { 
      name: 'Payroll', 
      href: '/dashboard/payroll', 
      icon: '💰', 
      roles: ['admin', 'hr', 'employee'],
      color: 'text-yellow-600'
    },
    { 
      name: 'Performance', 
      href: '/dashboard/performance', 
      icon: '📈', 
      roles: ['admin', 'hr', 'manager', 'employee'],
      color: 'text-pink-600'
    },
    { 
      name: 'Engagement', 
      href: '/dashboard/engagement', 
      icon: '💬', 
      roles: ['admin', 'hr', 'manager'],
      color: 'text-teal-600'
    },
    { 
      name: 'Learning', 
      href: '/dashboard/learning', 
      icon: '📚', 
      roles: ['admin', 'hr', 'manager', 'employee'],
      color: 'text-violet-600'
    },
    { 
      name: 'Career', 
      href: '/dashboard/career', 
      icon: '🎯', 
      roles: ['admin', 'hr', 'manager', 'employee'],
      color: 'text-red-600'
    },
    { 
      name: 'Onboarding', 
      href: '/dashboard/onboarding', 
      icon: '🚀', 
      roles: ['admin', 'hr'],
      color: 'text-cyan-600'
    },
    { 
      name: 'Assets', 
      href: '/dashboard/assets', 
      icon: '💻', 
      roles: ['admin', 'hr', 'manager', 'employee', 'assets_team'],
      color: 'text-slate-600'
    },
    { 
      name: 'Asset Acknowledgment', 
      href: '/dashboard/asset-acknowledgment', 
      icon: '📋', 
      roles: ['employee', 'admin', 'hr'],
      color: 'text-blue-600'
    },
    { 
      name: 'Announcements', 
      href: '/dashboard/announcements', 
      icon: '📢', 
      roles: ['admin', 'hr', 'manager', 'employee'],
      color: 'text-rose-600'
    },
    { 
      name: 'Analysis', 
      href: '/dashboard/analysis', 
      icon: '📊', 
      roles: ['admin', 'hr'],
      color: 'text-blue-500'
    },
    { 
      name: 'Profile', 
      href: '/dashboard/profile', 
      icon: '👤', 
      roles: ['admin', 'hr', 'manager', 'employee'],
      color: 'text-gray-600'
    },
    { 
      name: 'Documents', 
      href: '/dashboard/documents', 
      icon: '📄', 
      roles: ['admin', 'hr'],
      color: 'text-lime-600'
    },
    { 
      name: 'Meetings', 
      href: '/dashboard/meetings', 
      icon: '🤝', 
      roles: ['admin', 'hr', 'manager'],
      color: 'text-sky-600'
    },
    { 
      name: 'Notifications', 
      href: '/dashboard/notifications', 
      icon: '🔔', 
      roles: ['admin', 'hr', 'manager', 'employee'],
      color: 'text-orange-500'
    },
    { 
      name: 'Help', 
      href: '/dashboard/help', 
      icon: '❓', 
      roles: ['admin', 'hr', 'manager', 'employee'],
      color: 'text-blue-400'
    },
  ];

  const getRoleInfo = (role) => {
    const roleConfig = {
      admin: { title: '👑 Admin Workspace', subtitle: 'System Administrator', color: 'from-purple-600 to-purple-700', badge: 'bg-purple-100 text-purple-800' },
      hr: { title: '💼 HR Console', subtitle: 'Human Resources', color: 'from-blue-600 to-blue-700', badge: 'bg-blue-100 text-blue-800' },
      manager: { title: '👨‍💼 Manager Dashboard', subtitle: 'Team Manager', color: 'from-orange-600 to-orange-700', badge: 'bg-orange-100 text-orange-800' },
      employee: { title: '👤 Employee Portal', subtitle: 'Team Member', color: 'from-gray-600 to-gray-700', badge: 'bg-gray-100 text-gray-800' }
    };
    return roleConfig[role] || roleConfig.employee;
  };

  const roleInfo = getRoleInfo(role);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex">
      {/* Sidebar */}
      <div className={`${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} fixed inset-y-0 left-0 z-50 w-72 bg-white shadow-2xl transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0 border-r border-gray-200 flex flex-col`}>
        {/* Logo/Header */}
        <div className={`flex items-center justify-center h-20 px-6 bg-gradient-to-r ${roleInfo.color} shadow-lg`}>
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-md">
              <span className="text-2xl">🏢</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">HR System</h1>
              <p className="text-blue-100 text-xs">{roleInfo.subtitle}</p>
            </div>
          </div>
        </div>
        
        {/* Navigation */}
        <nav className="flex-1 mt-6 px-4 pb-4 overflow-y-auto">
          <div className="space-y-2">
            {navigation.map((item) => {
              if (!item.roles.includes(role)) return null;
              
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`${
                    isActive
                      ? 'bg-gradient-to-r from-blue-50 to-blue-100 text-blue-700 border-r-4 border-blue-600 shadow-sm'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  } ${item.highlight ? 'ring-2 ring-purple-200 bg-purple-50' : ''} group flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 hover:shadow-sm`}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <span className={`mr-4 text-xl ${isActive ? item.color : 'text-gray-400'} group-hover:${item.color}`}>
                    {item.icon}
                  </span>
                  <span className="flex-1">{item.name}</span>
                  {isActive && (
                    <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                  )}
                  {item.highlight && (
                    <span className="ml-2 px-2 py-1 bg-purple-200 text-purple-800 text-xs rounded-full font-bold">
                      ADMIN
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        </nav>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="bg-white shadow-sm border-b border-gray-200 backdrop-blur-sm bg-white/95 sticky top-0 z-40">
          <div className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="lg:hidden p-2 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200"
              >
                <span className="sr-only">Open sidebar</span>
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              
              {/* Page title and breadcrumb */}
              <div className="flex items-center space-x-3">
                <h2 className="text-2xl font-bold text-gray-900">
                  {roleInfo.title}
                </h2>
                <div className="hidden md:flex items-center space-x-2 text-sm text-gray-500">
                  <span>•</span>
                  <span className="text-gray-900 font-medium">
                    {navigation.find(item => item.href === location.pathname)?.name || 'Dashboard'}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Search */}
              <div className="hidden md:block relative">
                <input
                  type="text"
                  placeholder="Search..."
                  className="w-64 pl-10 pr-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                />
                <svg className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>

              {/* Notifications */}
              <div className="relative">
                <NotificationCenter />
              </div>

              {/* Role badge */}
              <span className={`hidden md:inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${roleInfo.badge}`}>
                {role}
              </span>
              
              {/* User menu */}
              <div className="relative">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowUserMenu(!showUserMenu);
                  }}
                  className="flex items-center space-x-3 p-2 rounded-xl hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200"
                >
                  <div className={`w-10 h-10 bg-gradient-to-r ${roleInfo.color} rounded-xl flex items-center justify-center shadow-md`}>
                    <span className="text-white text-sm font-bold">
                      {user?.email?.charAt(0).toUpperCase() || 'U'}
                    </span>
                  </div>
                  <div className="hidden md:block text-left">
                    <div className="text-sm font-semibold text-gray-900">
                      {role.toUpperCase()}
                    </div>
                    <div className="text-xs text-gray-500 truncate max-w-32">
                      {user?.email}
                    </div>
                  </div>
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {showUserMenu && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl ring-1 ring-black ring-opacity-5 z-50 animate-fade-in">
                    <div className="py-2">
                      <div className="px-4 py-3 border-b border-gray-100">
                        <p className="text-sm font-medium text-gray-900">Signed in as</p>
                        <p className="text-sm text-gray-500 truncate">{user?.email}</p>
                      </div>
                      <Link
                        to="/dashboard/profile"
                        className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                        onClick={() => setShowUserMenu(false)}
                      >
                        <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        Your Profile
                      </Link>
                      <Link
                        to="/dashboard/help"
                        className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                        onClick={() => setShowUserMenu(false)}
                      >
                        <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Help & Support
                      </Link>
                      <div className="border-t border-gray-100 mt-2 pt-2">
                        <button
                          onClick={handleLogout}
                          className="flex items-center w-full px-4 py-2 text-sm text-red-700 hover:bg-red-50 transition-colors"
                        >
                          <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                          </svg>
                          Sign out
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-x-hidden overflow-y-auto">
          <div className="container mx-auto px-6 py-6 max-w-7xl">
            <Outlet />
          </div>
        </main>
      </div>

      {/* AI Chat Assistant */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end space-y-4">
        {isChatOpen && (
          <div className="bg-white rounded-2xl shadow-2xl w-80 h-96 flex flex-col overflow-hidden border border-gray-200 animate-fade-in">
            <div className="bg-gradient-to-r from-pink-500 to-rose-500 p-4 text-white flex justify-between items-center">
              <div className="flex items-center space-x-2">
                <span className="text-xl">🤖</span>
                <h3 className="font-bold">HR Assistant</h3>
              </div>
              <button 
                onClick={() => setIsChatOpen(false)} 
                className="text-white hover:text-gray-200 transition-colors"
              >
                ✕
              </button>
            </div>
            <div className="flex-1 p-4 overflow-y-auto bg-gray-50 space-y-3">
              {chatMessages.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] rounded-xl px-3 py-2 text-sm ${
                    msg.sender === 'user' 
                      ? 'bg-gradient-to-r from-pink-500 to-rose-500 text-white' 
                      : 'bg-white border border-gray-200 text-gray-800 shadow-sm'
                  }`}>
                    <div className="whitespace-pre-line">{msg.text}</div>
                  </div>
                </div>
              ))}
              
              {isTyping && (
                <div className="flex justify-start">
                  <div className="bg-white border border-gray-200 text-gray-800 shadow-sm rounded-xl px-3 py-2 text-sm">
                    <div className="flex items-center space-x-1">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                      </div>
                      <span className="text-gray-500 ml-2">AI is thinking...</span>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Quick suggestions */}
              {suggestions.length > 0 && chatMessages.length === 1 && (
                <div className="space-y-2">
                  <div className="text-xs text-gray-500 text-center">Quick questions:</div>
                  <div className="flex flex-wrap gap-2">
                    {suggestions.slice(0, 3).map((suggestion, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSuggestionClick(suggestion)}
                        className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded-lg hover:bg-blue-100 transition-colors"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <form onSubmit={handleChatSubmit} className="p-3 bg-white border-t flex">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder={isTyping ? "AI is responding..." : "Ask about leave, salary, attendance..."}
                disabled={isTyping}
                className="flex-1 border border-gray-300 rounded-l-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500 disabled:bg-gray-100 disabled:text-gray-500"
              />
              <button 
                type="submit" 
                disabled={isTyping || !chatInput.trim()}
                className="bg-gradient-to-r from-pink-500 to-rose-500 text-white px-4 py-2 rounded-r-xl hover:from-pink-600 hover:to-rose-600 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isTyping ? '⏳' : '➤'}
              </button>
            </form>
          </div>
        )}

        <button
          onClick={() => setIsChatOpen(!isChatOpen)}
          className="bg-gradient-to-r from-pink-500 to-rose-500 text-white p-4 rounded-full shadow-lg hover:shadow-xl transform hover:scale-110 transition-all duration-200 flex items-center justify-center"
        >
          <span className="text-2xl">{isChatOpen ? '💬' : '🎙️'}</span>
        </button>
      </div>

      {/* Sidebar overlay for mobile */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-gray-900 bg-opacity-50 lg:hidden backdrop-blur-sm"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
    </div>
  );
}