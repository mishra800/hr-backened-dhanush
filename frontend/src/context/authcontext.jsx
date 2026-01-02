import { createContext, useState, useContext, useEffect } from 'react';
import api from '../api/axios';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false); // Changed to false - don't load on mount

  const fetchUser = async () => {
    try {
      const response = await api.get('/users/me');
      console.log('Fetched User:', response.data);
      setUser(response.data);
      return response.data;
    } catch (error) {
      console.error('Error fetching user:', error);
      setUser(null);
      return null;
    }
  };

  useEffect(() => {
    // Check if user is already logged in
    const token = localStorage.getItem('token');
    if (token) {
      // Silently try to fetch user in background
      fetchUser().then((userData) => {
        if (userData) {
          checkFirstTimeLogin(userData);
        }
      }).catch(() => {
        // If it fails, just continue without user
        console.log('Could not fetch user, continuing as guest');
      });
    }
  }, []);

  const checkFirstTimeLogin = async (userData) => {
    try {
      // Only check profile image for employees
      if (userData.role === 'employee') {
        // Check if employee has profile image
        const response = await api.get('/attendance/check-profile-image');
        
        // If no profile image, redirect to profile
        if (!response.data.has_profile_image) {
          const isFirstLogin = !localStorage.getItem('profile_setup_completed');
          if (isFirstLogin) {
            // Force redirect to profile setup
            setTimeout(() => {
              if (window.location.pathname !== '/dashboard/profile') {
                window.location.href = '/dashboard/profile?first_time=true';
              }
            }, 1000);
          }
        }
      }
    } catch (error) {
      console.error('Error checking profile image:', error);
      // Don't let profile image check errors prevent login
      // This is not critical for the login flow
    }
  };

  const login = async (email, password) => {
    const formData = new FormData();
    formData.append('username', email);
    formData.append('password', password);

    try {
      const response = await api.post('/auth/login', formData);
      const { access_token } = response.data;
      localStorage.setItem('token', access_token);
      
      // Fetch user data in background, don't wait for it
      fetchUser().catch(err => console.error('Failed to fetch user:', err));
      
      // Set a temporary user object so we can navigate
      setUser({ email, token: access_token });
      
      return true;
    } catch (error) {
      console.error('Login failed:', error);
      return false;
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
