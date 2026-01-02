import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/authcontext';
import logo from '../assets/logo.png';
import PasswordInput from '../components/passwordinput';
import { useToast } from '../hooks/usetoast';
import { ToastContainer } from '../components/toast';
import {
  validateLoginForm,
  checkRateLimit,
  clearRateLimit,
  sanitizeInput
} from '../utils/validation';

export default function LoginImproved() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    rememberMe: false
  });
  
  const [fieldErrors, setFieldErrors] = useState({});
  const [showDemo, setShowDemo] = useState(false);
  const [loading, setLoading] = useState(false);
  const [rateLimited, setRateLimited] = useState(false);
  const [timeUntilReset, setTimeUntilReset] = useState(0);
  
  const { login } = useAuth();
  const navigate = useNavigate();
  const { toasts, removeToast, success, error: showError, info } = useToast();

  // Load remembered email
  useEffect(() => {
    const rememberedEmail = localStorage.getItem('rememberedEmail');
    if (rememberedEmail) {
      setFormData(prev => ({ ...prev, email: rememberedEmail }));
    }
  }, []);

  // Rate limit countdown
  useEffect(() => {
    if (rateLimited && timeUntilReset > 0) {
      const timer = setInterval(() => {
        setTimeUntilReset(prev => {
          if (prev <= 1) {
            setRateLimited(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [rateLimited, timeUntilReset]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const newValue = type === 'checkbox' ? checked : sanitizeInput(value);
    
    setFormData(prev => ({
      ...prev,
      [name]: newValue
    }));

    // Clear error for this field
    if (fieldErrors[name]) {
      setFieldErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Check rate limiting
    const rateCheck = checkRateLimit('login', 5, 15 * 60 * 1000);
    if (!rateCheck.allowed) {
      setRateLimited(true);
      setTimeUntilReset(Math.ceil(rateCheck.timeUntilReset / 60));
      showError(rateCheck.message, 5000);
      return;
    }

    // Validate form
    const validation = validateLoginForm(formData);
    if (!validation.isValid) {
      setFieldErrors(validation.errors);
      showError('Please fix the errors in the form');
      return;
    }

    setLoading(true);

    try {
      const loginSuccess = await login(formData.email, formData.password);
      
      if (loginSuccess) {
        // Clear rate limit on successful login
        clearRateLimit('login');
        
        // Remember email if checkbox is checked
        if (formData.rememberMe) {
          localStorage.setItem('rememberedEmail', formData.email);
        } else {
          localStorage.removeItem('rememberedEmail');
        }

        success('Login successful! Redirecting...');
        
        setTimeout(() => {
          navigate('/');
        }, 1000);
      } else {
        showError('Invalid email or password. Please try again.');
        
        // Show remaining attempts
        const remaining = rateCheck.remainingAttempts - 1;
        if (remaining > 0 && remaining <= 2) {
          info(`${remaining} attempt(s) remaining before temporary lockout`, 4000);
        }
      }
    } catch (err) {
      console.error('Login error:', err);
      showError('Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async (demoEmail, demoPassword) => {
    setFormData(prev => ({
      ...prev,
      email: demoEmail,
      password: demoPassword
    }));
    
    setLoading(true);

    try {
      const loginSuccess = await login(demoEmail, demoPassword);
      
      if (loginSuccess) {
        clearRateLimit('login');
        success(`Logged in as ${demoEmail.split('@')[0]}! Redirecting...`);
        
        setTimeout(() => {
          navigate('/');
        }, 1000);
      } else {
        showError('Demo login failed. Please try again.');
      }
    } catch (err) {
      console.error('Demo login error:', err);
      showError('Demo login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <ToastContainer toasts={toasts} removeToast={removeToast} />
      
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8">
        <div className="bg-white p-10 rounded-xl shadow-2xl w-full max-w-md">
          {/* Header */}
          <div className="text-center mb-8">
            <img src={logo} alt="Company Logo" className="h-16 w-auto mx-auto mb-4" />
            <h2 className="text-3xl font-extrabold text-gray-900">Welcome Back</h2>
            <p className="text-gray-600 mt-2">Sign in to your account</p>
          </div>

          {/* Rate Limit Warning */}
          {rateLimited && (
            <div className="mb-4 bg-red-50 border-l-4 border-red-500 p-4 rounded">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-red-700">
                    Too many login attempts. Please try again in {timeUntilReset} minute(s).
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Login Form */}
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={formData.email}
                onChange={handleChange}
                disabled={rateLimited}
                className={`appearance-none block w-full px-3 py-2 border ${
                  fieldErrors.email ? 'border-red-300' : 'border-gray-300'
                } rounded-lg placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-150 disabled:bg-gray-100 disabled:cursor-not-allowed`}
                placeholder="you@example.com"
              />
              {fieldErrors.email && (
                <p className="mt-1 text-sm text-red-600">{fieldErrors.email}</p>
              )}
            </div>

            <div>
              <PasswordInput
                value={formData.password}
                onChange={handleChange}
                showStrength={false}
                name="password"
                label="Password"
                autoComplete="current-password"
              />
              {fieldErrors.password && (
                <p className="mt-1 text-sm text-red-600">{fieldErrors.password}</p>
              )}
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="rememberMe"
                  name="rememberMe"
                  type="checkbox"
                  checked={formData.rememberMe}
                  onChange={handleChange}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="rememberMe" className="ml-2 block text-sm text-gray-700">
                  Remember me
                </label>
              </div>
              <div className="text-sm">
                <Link to="/forgot-password" className="font-medium text-blue-600 hover:text-blue-500">
                  Forgot password?
                </Link>
              </div>
            </div>

            <div>
              <button 
                type="submit" 
                disabled={loading || rateLimited}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Signing in...
                  </>
                ) : (
                  'Sign in'
                )}
              </button>
            </div>
          </form>

          {/* Signup Link */}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Don't have an account?{' '}
              <Link to="/signup" className="font-medium text-blue-600 hover:text-blue-500 transition duration-150">
                Sign up here
              </Link>
            </p>
          </div>

          {/* Divider */}
          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">Or</span>
              </div>
            </div>
          </div>

          {/* Demo Credentials */}
          <div className="mt-6 text-center">
            <button
              onClick={() => setShowDemo(!showDemo)}
              disabled={rateLimited}
              className="text-green-600 hover:text-green-800 font-medium text-sm underline focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {showDemo ? 'Hide Demo Credentials' : 'Show Demo Credentials'}
            </button>
          </div>

          {showDemo && !rateLimited && (
            <div className="mt-6 bg-gray-50 border-l-4 border-green-500 p-4 rounded-r-md text-left text-sm animate-fade-in-down">
              <div className="mb-3">
                <h3 className="font-bold text-gray-800 flex items-center">
                  🚀 LEAN 5-Role Structure:
                </h3>
                <p className="text-gray-500 text-xs mt-1">Click any role to auto-login</p>
              </div>
              <div className="space-y-3">
                {[
                  { role: 'Super Admin', email: 'admin@company.com', password: 'admin123', icon: '👑', desc: 'Owners/Directors - Everything + Financial Approvals' },
                  { role: 'HR Admin', email: 'hr@company.com', password: 'hr123', icon: '💼', desc: 'Power User - Hiring + Onboarding + IT + Payroll (80% hub)' },
                  { role: 'Hiring Manager', email: 'manager@company.com', password: 'manager123', icon: '👨‍💼', desc: 'Team Leads - Approvals + Interviews + Team Management' },
                  { role: 'Employee', email: 'employee@company.com', password: 'employee123', icon: '👤', desc: 'Standard User - Smart Check-In + Self Service + Learning' },
                  { role: 'Candidate', email: 'candidate@company.com', password: 'candidate123', icon: '🎓', desc: 'External - Job Search + Application Status' }
                ].map((demo) => (
                  <button
                    key={demo.email}
                    onClick={() => handleDemoLogin(demo.email, demo.password)}
                    disabled={loading}
                    className="w-full text-left bg-white p-2 rounded shadow-sm border border-gray-100 hover:bg-green-50 hover:border-green-200 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <p className="font-semibold text-green-700 flex items-center">
                      {demo.icon} <span className="ml-1">{demo.role}:</span>
                    </p>
                    <p className="text-gray-800 text-xs font-mono mt-1">{demo.email}</p>
                    <p className="text-gray-500 text-xs mt-1">{demo.desc}</p>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
