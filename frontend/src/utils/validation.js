// Validation utilities for authentication

// Email validation
export const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  if (!email) {
    return { valid: false, message: 'Email is required' };
  }
  
  if (!emailRegex.test(email)) {
    return { valid: false, message: 'Please enter a valid email address' };
  }
  
  // Check for common typos
  const commonDomains = ['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com'];
  const domain = email.split('@')[1];
  const suggestions = [];
  
  if (domain && !commonDomains.includes(domain)) {
    // Suggest corrections for common typos
    if (domain === 'gmial.com' || domain === 'gmai.com') {
      suggestions.push('Did you mean gmail.com?');
    }
  }
  
  return { valid: true, message: '', suggestions };
};

// Password strength checker
export const checkPasswordStrength = (password) => {
  if (!password) {
    return { strength: 'none', score: 0, feedback: [] };
  }

  let score = 0;
  const feedback = [];
  const checks = {
    length: false,
    uppercase: false,
    lowercase: false,
    number: false,
    special: false
  };

  // Length check
  if (password.length >= 8) {
    score += 20;
    checks.length = true;
  } else {
    feedback.push('Use at least 8 characters');
  }

  if (password.length >= 12) {
    score += 10;
  }

  // Uppercase check
  if (/[A-Z]/.test(password)) {
    score += 20;
    checks.uppercase = true;
  } else {
    feedback.push('Add uppercase letters (A-Z)');
  }

  // Lowercase check
  if (/[a-z]/.test(password)) {
    score += 20;
    checks.lowercase = true;
  } else {
    feedback.push('Add lowercase letters (a-z)');
  }

  // Number check
  if (/\d/.test(password)) {
    score += 20;
    checks.number = true;
  } else {
    feedback.push('Add numbers (0-9)');
  }

  // Special character check
  if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    score += 20;
    checks.special = true;
  } else {
    feedback.push('Add special characters (!@#$%^&*)');
  }

  // Common password check
  const commonPasswords = [
    'password', 'password123', '12345678', 'qwerty', 'abc123',
    'monkey', '1234567890', 'letmein', 'trustno1', 'dragon',
    'baseball', 'iloveyou', 'master', 'sunshine', 'ashley',
    'bailey', 'passw0rd', 'shadow', '123123', '654321'
  ];

  if (commonPasswords.includes(password.toLowerCase())) {
    score = Math.min(score, 20);
    feedback.push('This password is too common');
  }

  // Sequential characters check
  if (/(.)\1{2,}/.test(password)) {
    score -= 10;
    feedback.push('Avoid repeated characters');
  }

  // Determine strength
  let strength = 'weak';
  let color = 'red';
  
  if (score >= 80) {
    strength = 'strong';
    color = 'green';
  } else if (score >= 60) {
    strength = 'good';
    color = 'yellow';
  } else if (score >= 40) {
    strength = 'fair';
    color = 'orange';
  }

  return {
    strength,
    score,
    color,
    feedback,
    checks,
    isValid: score >= 60
  };
};

// Password match validation
export const validatePasswordMatch = (password, confirmPassword) => {
  if (!confirmPassword) {
    return { valid: false, message: 'Please confirm your password' };
  }
  
  if (password !== confirmPassword) {
    return { valid: false, message: 'Passwords do not match' };
  }
  
  return { valid: true, message: 'Passwords match' };
};

// Check if email is already registered (debounced)
let emailCheckTimeout;
export const checkEmailAvailability = async (email, apiCall) => {
  return new Promise((resolve) => {
    clearTimeout(emailCheckTimeout);
    
    emailCheckTimeout = setTimeout(async () => {
      try {
        const response = await apiCall(email);
        resolve(response);
      } catch (error) {
        resolve({ available: true }); // Assume available on error
      }
    }, 500); // Debounce for 500ms
  });
};

// Sanitize input
export const sanitizeInput = (input) => {
  return input.trim().replace(/[<>]/g, '');
};

// Rate limiting check
export const checkRateLimit = (key, maxAttempts = 5, windowMs = 15 * 60 * 1000) => {
  const now = Date.now();
  const attempts = JSON.parse(localStorage.getItem(`rateLimit_${key}`) || '[]');
  
  // Filter attempts within the time window
  const recentAttempts = attempts.filter(timestamp => now - timestamp < windowMs);
  
  if (recentAttempts.length >= maxAttempts) {
    const oldestAttempt = Math.min(...recentAttempts);
    const timeUntilReset = Math.ceil((windowMs - (now - oldestAttempt)) / 1000 / 60);
    
    return {
      allowed: false,
      message: `Too many attempts. Please try again in ${timeUntilReset} minute(s).`,
      timeUntilReset
    };
  }
  
  // Add current attempt
  recentAttempts.push(now);
  localStorage.setItem(`rateLimit_${key}`, JSON.stringify(recentAttempts));
  
  return {
    allowed: true,
    remainingAttempts: maxAttempts - recentAttempts.length
  };
};

// Clear rate limit
export const clearRateLimit = (key) => {
  localStorage.removeItem(`rateLimit_${key}`);
};

// Validate role selection
export const validateRole = (role) => {
  const validRoles = ['admin', 'hr', 'manager', 'employee', 'candidate'];
  
  if (!role) {
    return { valid: false, message: 'Please select a role' };
  }
  
  if (!validRoles.includes(role)) {
    return { valid: false, message: 'Invalid role selected' };
  }
  
  return { valid: true, message: '' };
};

// Form validation
export const validateSignupForm = (formData) => {
  const errors = {};
  
  // Email validation
  const emailCheck = validateEmail(formData.email);
  if (!emailCheck.valid) {
    errors.email = emailCheck.message;
  }
  
  // Password validation
  const passwordCheck = checkPasswordStrength(formData.password);
  if (!passwordCheck.isValid) {
    errors.password = 'Password is too weak';
  }
  
  // Password match validation
  const matchCheck = validatePasswordMatch(formData.password, formData.confirmPassword);
  if (!matchCheck.valid) {
    errors.confirmPassword = matchCheck.message;
  }
  
  // Role validation
  const roleCheck = validateRole(formData.role);
  if (!roleCheck.valid) {
    errors.role = roleCheck.message;
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

export const validateLoginForm = (formData) => {
  const errors = {};
  
  // Email validation
  const emailCheck = validateEmail(formData.email);
  if (!emailCheck.valid) {
    errors.email = emailCheck.message;
  }
  
  // Password required
  if (!formData.password) {
    errors.password = 'Password is required';
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};
