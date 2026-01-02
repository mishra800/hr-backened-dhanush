import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/authcontext';
import logo from '../assets/logo.png';
import api from '../api/axios';
import PasswordInput from '../components/passwordinput';
import { useToast } from '../hooks/usetoast';
import { ToastContainer } from '../components/toast';
import {
  validateEmail,
  validatePasswordMatch,
  checkPasswordStrength,
  validateSignupForm,
  checkRateLimit,
  sanitizeInput
} from '../utils/validation';

export default function SignupImproved() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    role: 'employee',
    acceptTerms: false
  });
  
  const [fieldErrors, setFieldErrors] = useState({});
  const [emailChecking, setEmailChecking] = useState(false);
  const [emailAvailable, setEmailAvailable] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [touchedFields, setTouchedFields] = useState({});
  
  const { login } = useAuth();
  const navigate = useNavigate();
  const { toasts, removeToast, success, error: showError, warning } = useToast();

  // Real-time email validation with debounce
  useEffect(() => {
    const checkEmail = async () => {
      if (!formData.email || !validateEmail(formData.email).valid) {
        setEmailAvailable(null);
        return;
      }

      setEmailChecking(true);
      
      try {
        // Simulate API call to check email availability
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // In real implementation, call your API
        // const response = await api.get(`/auth/check-email?email=${formData.email}`);
        // setEmailAvailable(response.data.available);
        
        // For now, simulate
        setEmailAvailable(true);
      } catch (err) {
        console.error('Email check failed:', err);
      } finally {
        setEmailChecking(false);
      }
    };

    const timeoutId = setTimeout(checkEmail, 500);
    return () => clearTimeout(timeoutId);
  }, [formData.email]);

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

  const handleBlur = (field) => {
    setTouchedFields(prev => ({
      ...prev,
      [field]: true
    }));

    // Validate field on blur
    validateField(field);
  };

  const validateField = (field) => {
    let error = '';

    switch (field) {
      case 'email':
        const emailValidation = validateEmail(formData.email);
        if (!emailValidation.valid) {
          error = emailValidation.message;
        }
        break;
      
      case 'password':
        const passwordStrength = checkPasswordStrength(formData.password);
        if (!passwordStrength.isValid) {
          error = 'Password is too weak';
        }
        break;
      
      case 'confirmPassword':
        const matchValidation = validatePasswordMatch(formData.password, formData.confirmPassword);
        if (!matchValidation.valid) {
          error = matchValidation.message;
        }
        break;
      
      case 'acceptTerms':
        if (!formData.acceptTerms) {
          error = 'You must accept the terms and conditions';
        }
        break;
    }

    setFieldErrors(prev => ({
      ...prev,
      [field]: error
    }));

    return !error;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Check rate limiting
    const rateCheck = checkRateLimit('signup', 3, 15 * 60 * 1000);
    if (!rateCheck.allowed) {
      showError(rateCheck.message, 5000);
      return;
    }

    // Validate all fields
    const validation = validateSignupForm(formData);
    
    if (!validation.isValid) {
      setFieldErrors(validation.errors);
      showError('Please fix the errors in the form');
      return;
    }

    if (!formData.acceptTerms) {
      setFieldErrors(prev => ({
        ...prev,
        acceptTerms: 'You must accept the terms and conditions'
      }));
      showError('Please accept the terms and conditions');
      return;
    }

    setLoading(true);

    try {
      // Register user
      await api.post('/auth/register', {
        email: formData.email,
        password: formData.password,
        role: formData.role
      });

      success('Account created successfully! Logging you in...');

      // Auto-login after successful registration
      setTimeout(async () => {
        const loginSuccess = await login(formData.email, formData.password);
        
        if (loginSuccess) {
          success('Welcome! Redirecting to dashboard...');
          setTimeout(() => navigate('/'), 1000);
        } else {
          warning('Registration successful! Please login manually.');
          setTimeout(() => navigate('/login'), 2000);
        }
      }, 1000);

    } catch (err) {
      console.error('Registration error:', err);
      
      if (err.response?.data?.detail) {
        showError(err.response.data.detail);
      } else if (err.response?.status === 400) {
        showError('Email already registered. Please login instead.');
      } else if (err.response?.status === 429) {
        showError('Too many registration attempts. Please try again later.');
      } else {
        showError('Registration failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const getEmailStatusIcon = () => {
    if (!formData.email || !touchedFields.email) return null;
    
    if (emailChecking) {
      return <div className="animate-spin h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full" />;
    }
    
    const emailValidation = validateEmail(formData.email);
    if (!emailValidation.valid) {
      return <span className="text-red-500">✗</span>;
    }
    
    if (emailAvailable === false) {
      return <span className="text-red-500">✗</span>;
    }
    
    if (emailAvailable === true) {
      return <span className="text-green-500">✓</span>;
    }
    
    return null;
  };

  return (
    <>
      <ToastContainer toasts={toasts} removeToast={removeToast} />
      
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8 bg-white p-10 rounded-xl shadow-2xl">
          {/* Header */}
          <div className="text-center">
            <img src={logo} alt="Company Logo" className="h-16 w-auto mx-auto mb-4" />
            <h2 className="text-3xl font-extrabold text-gray-900">Create your account</h2>
            <p className="mt-2 text-sm text-gray-600">
              Join our HR Management System
            </p>
          </div>

          {/* Signup Form */}
          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-4">
              {/* Email */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  Email address
                </label>
                <div className="relative">
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={formData.email}
                    onChange={handleChange}
                    onBlur={() => handleBlur('email')}
                    className={`appearance-none relative block w-full px-3 py-2 pr-10 border ${
                      touchedFields.email && fieldErrors.email ? 'border-red-300' : 'border-gray-300'
                    } placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-150`}
                    placeholder="you@example.com"
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    {getEmailStatusIcon()}
                  </div>
                </div>
                {touchedFields.email && fieldErrors.email && (
                  <p className="mt-1 text-sm text-red-600">{fieldErrors.email}</p>
                )}
                {emailAvailable === false && (
                  <p className="mt-1 text-sm text-red-600">This email is already registered</p>
                )}
              </div>

              {/* Role Selection */}
              <div>
                <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1">
                  Select Your Role
                </label>
                <select
                  id="role"
                  name="role"
                  value={formData.role}
                  onChange={handleChange}
                  className="appearance-none relative block w-full px-3 py-2 border border-gray-300 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-150"
                >
                  <option value="admin">👑 Super Admin</option>
                  <option value="hr">💼 HR Admin</option>
                  <option value="manager">👨‍💼 Hiring Manager</option>
                  <option value="employee">👤 Employee</option>
                  <option value="candidate">🎓 Candidate</option>
                </select>
                <p className="mt-1 text-xs text-gray-500">
                  {formData.role === 'admin' && '👑 Owners/Directors - Everything + Financial Approvals'}
                  {formData.role === 'hr' && '💼 Power User - Hiring + Onboarding + IT + Payroll (80% hub)'}
                  {formData.role === 'manager' && '👨‍💼 Team Leads - Approvals + Interviews + Team Management'}
                  {formData.role === 'employee' && '👤 Standard User - Smart Check-In + Self Service + Learning'}
                  {formData.role === 'candidate' && '🎓 External - Job Search + Application Status'}
                </p>
              </div>

              {/* Password with Strength Indicator */}
              <PasswordInput
                value={formData.password}
                onChange={handleChange}
                showStrength={true}
                name="password"
                label="Password"
              />
              {touchedFields.password && fieldErrors.password && (
                <p className="mt-1 text-sm text-red-600">{fieldErrors.password}</p>
              )}

              {/* Confirm Password */}
              <PasswordInput
                value={formData.confirmPassword}
                onChange={handleChange}
                showStrength={false}
                name="confirmPassword"
                label="Confirm Password"
                autoComplete="new-password"
              />
              {touchedFields.confirmPassword && fieldErrors.confirmPassword && (
                <p className="mt-1 text-sm text-red-600">{fieldErrors.confirmPassword}</p>
              )}
              {formData.confirmPassword && formData.password === formData.confirmPassword && (
                <p className="mt-1 text-sm text-green-600 flex items-center gap-1">
                  <span>✓</span> Passwords match
                </p>
              )}

              {/* Terms and Conditions */}
              <div className="flex items-start">
                <div className="flex items-center h-5">
                  <input
                    id="acceptTerms"
                    name="acceptTerms"
                    type="checkbox"
                    checked={formData.acceptTerms}
                    onChange={handleChange}
                    onBlur={() => handleBlur('acceptTerms')}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                </div>
                <div className="ml-3 text-sm">
                  <label htmlFor="acceptTerms" className="text-gray-700">
                    I agree to the{' '}
                    <a href="#" className="text-blue-600 hover:text-blue-500">Terms of Service</a>
                    {' '}and{' '}
                    <a href="#" className="text-blue-600 hover:text-blue-500">Privacy Policy</a>
                  </label>
                </div>
              </div>
              {touchedFields.acceptTerms && fieldErrors.acceptTerms && (
                <p className="mt-1 text-sm text-red-600">{fieldErrors.acceptTerms}</p>
              )}
            </div>

            {/* Submit Button */}
            <div>
              <button
                type="submit"
                disabled={loading || emailChecking || !formData.acceptTerms}
                className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Creating account...
                  </>
                ) : (
                  <>
                    <span className="absolute left-0 inset-y-0 flex items-center pl-3">
                      <svg className="h-5 w-5 text-blue-500 group-hover:text-blue-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                      </svg>
                    </span>
                    Create Account
                  </>
                )}
              </button>
            </div>

            {/* Login Link */}
            <div className="text-center">
              <p className="text-sm text-gray-600">
                Already have an account?{' '}
                <Link to="/login" className="font-medium text-blue-600 hover:text-blue-500 transition duration-150">
                  Sign in here
                </Link>
              </p>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
