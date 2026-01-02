"""
Enhanced security utilities for authentication
"""
import secrets
import hashlib
from datetime import datetime, timedelta
from typing import Optional, Dict
import re

# Password validation
def validate_password_strength(password: str) -> Dict[str, any]:
    """
    Validate password strength
    Returns dict with 'valid' boolean and 'errors' list
    """
    errors = []
    
    if len(password) < 8:
        errors.append("Password must be at least 8 characters long")
    
    if not re.search(r'[A-Z]', password):
        errors.append("Password must contain at least one uppercase letter")
    
    if not re.search(r'[a-z]', password):
        errors.append("Password must contain at least one lowercase letter")
    
    if not re.search(r'\d', password):
        errors.append("Password must contain at least one number")
    
    if not re.search(r'[!@#$%^&*()_+\-=\[\]{};:\'",.<>?/\\|`~]', password):
        errors.append("Password must contain at least one special character")
    
    # Check for common passwords
    common_passwords = [
        'password', 'password123', '12345678', 'qwerty', 'abc123',
        'monkey', '1234567890', 'letmein', 'trustno1', 'dragon'
    ]
    
    if password.lower() in common_passwords:
        errors.append("This password is too common")
    
    # Check for sequential characters
    if re.search(r'(.)\1{2,}', password):
        errors.append("Avoid using repeated characters")
    
    return {
        'valid': len(errors) == 0,
        'errors': errors
    }

# Token generation
def generate_secure_token(length: int = 32) -> str:
    """Generate a cryptographically secure random token"""
    return secrets.token_urlsafe(length)

def generate_verification_token() -> str:
    """Generate email verification token"""
    return generate_secure_token(32)

def generate_reset_token() -> str:
    """Generate password reset token"""
    return generate_secure_token(32)

# Token hashing
def hash_token(token: str) -> str:
    """Hash a token for storage"""
    return hashlib.sha256(token.encode()).hexdigest()

# Rate limiting
class RateLimiter:
    """Simple in-memory rate limiter"""
    def __init__(self):
        self.attempts = {}
    
    def check_rate_limit(self, key: str, max_attempts: int = 5, window_minutes: int = 15) -> Dict[str, any]:
        """
        Check if rate limit is exceeded
        Returns dict with 'allowed' boolean and optional 'retry_after' seconds
        """
        now = datetime.utcnow()
        window_start = now - timedelta(minutes=window_minutes)
        
        # Clean old attempts
        if key in self.attempts:
            self.attempts[key] = [
                attempt for attempt in self.attempts[key]
                if attempt > window_start
            ]
        else:
            self.attempts[key] = []
        
        # Check limit
        if len(self.attempts[key]) >= max_attempts:
            oldest_attempt = min(self.attempts[key])
            retry_after = (oldest_attempt + timedelta(minutes=window_minutes) - now).total_seconds()
            return {
                'allowed': False,
                'retry_after': int(retry_after)
            }
        
        # Add current attempt
        self.attempts[key].append(now)
        
        return {
            'allowed': True,
            'remaining': max_attempts - len(self.attempts[key])
        }
    
    def clear_attempts(self, key: str):
        """Clear rate limit attempts for a key"""
        if key in self.attempts:
            del self.attempts[key]

# Global rate limiter instance
rate_limiter = RateLimiter()

# Email validation
def validate_email(email: str) -> bool:
    """Validate email format"""
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return re.match(pattern, email) is not None

# IP address extraction
def get_client_ip(request) -> str:
    """Extract client IP address from request"""
    # Check for forwarded IP (behind proxy)
    forwarded = request.headers.get('X-Forwarded-For')
    if forwarded:
        return forwarded.split(',')[0].strip()
    
    # Check for real IP
    real_ip = request.headers.get('X-Real-IP')
    if real_ip:
        return real_ip
    
    # Fallback to direct connection
    return request.client.host if hasattr(request, 'client') else 'unknown'

# User agent extraction
def get_user_agent(request) -> str:
    """Extract user agent from request"""
    return request.headers.get('User-Agent', 'unknown')

# Device info extraction
def get_device_info(user_agent: str) -> Dict[str, str]:
    """Extract device information from user agent"""
    device_info = {
        'browser': 'Unknown',
        'os': 'Unknown',
        'device': 'Unknown'
    }
    
    # Simple browser detection
    if 'Chrome' in user_agent:
        device_info['browser'] = 'Chrome'
    elif 'Firefox' in user_agent:
        device_info['browser'] = 'Firefox'
    elif 'Safari' in user_agent:
        device_info['browser'] = 'Safari'
    elif 'Edge' in user_agent:
        device_info['browser'] = 'Edge'
    
    # Simple OS detection
    if 'Windows' in user_agent:
        device_info['os'] = 'Windows'
    elif 'Mac' in user_agent:
        device_info['os'] = 'macOS'
    elif 'Linux' in user_agent:
        device_info['os'] = 'Linux'
    elif 'Android' in user_agent:
        device_info['os'] = 'Android'
    elif 'iOS' in user_agent or 'iPhone' in user_agent:
        device_info['os'] = 'iOS'
    
    # Simple device detection
    if 'Mobile' in user_agent or 'Android' in user_agent or 'iPhone' in user_agent:
        device_info['device'] = 'Mobile'
    elif 'Tablet' in user_agent or 'iPad' in user_agent:
        device_info['device'] = 'Tablet'
    else:
        device_info['device'] = 'Desktop'
    
    return device_info

# Account lockout check
def is_account_locked(user) -> bool:
    """Check if user account is locked"""
    if not hasattr(user, 'locked_until') or user.locked_until is None:
        return False
    
    return datetime.utcnow() < user.locked_until

def lock_account(user, duration_minutes: int = 30):
    """Lock user account for specified duration"""
    user.locked_until = datetime.utcnow() + timedelta(minutes=duration_minutes)
    user.failed_login_attempts = 0

def unlock_account(user):
    """Unlock user account"""
    user.locked_until = None
    user.failed_login_attempts = 0

# Failed login tracking
def increment_failed_login(user, max_attempts: int = 5):
    """
    Increment failed login attempts
    Lock account if max attempts reached
    """
    if not hasattr(user, 'failed_login_attempts'):
        user.failed_login_attempts = 0
    
    user.failed_login_attempts += 1
    
    if user.failed_login_attempts >= max_attempts:
        lock_account(user, duration_minutes=30)
        return True  # Account locked
    
    return False  # Not locked yet

def reset_failed_login(user):
    """Reset failed login attempts on successful login"""
    user.failed_login_attempts = 0
    user.locked_until = None

# Password history check
def check_password_history(hashed_password: str, password_history: list, max_history: int = 5) -> bool:
    """
    Check if password was used recently
    Returns True if password is in history (should be rejected)
    """
    recent_passwords = password_history[-max_history:] if len(password_history) > max_history else password_history
    return hashed_password in [ph.hashed_password for ph in recent_passwords]

# Session token generation
def generate_session_token() -> str:
    """Generate session token"""
    return generate_secure_token(64)

def generate_refresh_token() -> str:
    """Generate refresh token"""
    return generate_secure_token(64)

# Token expiration
def get_token_expiration(hours: int = 24) -> datetime:
    """Get token expiration datetime"""
    return datetime.utcnow() + timedelta(hours=hours)

def is_token_expired(expires_at: datetime) -> bool:
    """Check if token is expired"""
    return datetime.utcnow() > expires_at

# Sanitization
def sanitize_input(text: str) -> str:
    """Sanitize user input"""
    if not text:
        return text
    
    # Remove potential XSS characters
    text = text.strip()
    text = re.sub(r'[<>]', '', text)
    
    return text

# Email sending (placeholder - implement with actual email service)
async def send_verification_email(email: str, token: str):
    """Send email verification email"""
    # TODO: Implement with actual email service (SendGrid, AWS SES, etc.)
    verification_link = f"http://localhost:5173/verify-email?token={token}"
    print(f"Verification email would be sent to {email}")
    print(f"Link: {verification_link}")
    return True

async def send_password_reset_email(email: str, token: str):
    """Send password reset email"""
    # TODO: Implement with actual email service
    reset_link = f"http://localhost:5173/reset-password?token={token}"
    print(f"Password reset email would be sent to {email}")
    print(f"Link: {reset_link}")
    return True

async def send_login_notification(email: str, ip_address: str, device_info: Dict):
    """Send login notification email"""
    # TODO: Implement with actual email service
    print(f"Login notification would be sent to {email}")
    print(f"IP: {ip_address}, Device: {device_info}")
    return True
