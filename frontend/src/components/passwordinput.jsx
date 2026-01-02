import { useState } from 'react';
import { checkPasswordStrength } from '../utils/validation';

export default function PasswordInput({ 
  value, 
  onChange, 
  placeholder = "••••••••",
  showStrength = false,
  label = "Password",
  name = "password",
  required = true,
  autoComplete = "new-password"
}) {
  const [showPassword, setShowPassword] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  
  const passwordStrength = showStrength ? checkPasswordStrength(value) : null;

  return (
    <div>
      <label htmlFor={name} className="block text-sm font-medium text-gray-700 mb-1">
        {label}
      </label>
      <div className="relative">
        <input
          id={name}
          name={name}
          type={showPassword ? "text" : "password"}
          autoComplete={autoComplete}
          required={required}
          value={value}
          onChange={onChange}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          className="appearance-none block w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-150"
          placeholder={placeholder}
        />
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
          tabIndex={-1}
        >
          {showPassword ? (
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
            </svg>
          ) : (
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          )}
        </button>
      </div>

      {/* Password Strength Indicator */}
      {showStrength && value && (isFocused || passwordStrength.score > 0) && (
        <div className="mt-2 space-y-2">
          {/* Strength Bar */}
          <div className="flex items-center gap-2">
            <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${
                  passwordStrength.color === 'green' ? 'bg-green-500' :
                  passwordStrength.color === 'yellow' ? 'bg-yellow-500' :
                  passwordStrength.color === 'orange' ? 'bg-orange-500' :
                  'bg-red-500'
                }`}
                style={{ width: `${passwordStrength.score}%` }}
              />
            </div>
            <span className={`text-xs font-medium ${
              passwordStrength.color === 'green' ? 'text-green-600' :
              passwordStrength.color === 'yellow' ? 'text-yellow-600' :
              passwordStrength.color === 'orange' ? 'text-orange-600' :
              'text-red-600'
            }`}>
              {passwordStrength.strength.charAt(0).toUpperCase() + passwordStrength.strength.slice(1)}
            </span>
          </div>

          {/* Requirements Checklist */}
          <div className="grid grid-cols-2 gap-1 text-xs">
            <div className={`flex items-center gap-1 ${passwordStrength.checks.length ? 'text-green-600' : 'text-gray-400'}`}>
              {passwordStrength.checks.length ? '✓' : '○'} 8+ characters
            </div>
            <div className={`flex items-center gap-1 ${passwordStrength.checks.uppercase ? 'text-green-600' : 'text-gray-400'}`}>
              {passwordStrength.checks.uppercase ? '✓' : '○'} Uppercase
            </div>
            <div className={`flex items-center gap-1 ${passwordStrength.checks.lowercase ? 'text-green-600' : 'text-gray-400'}`}>
              {passwordStrength.checks.lowercase ? '✓' : '○'} Lowercase
            </div>
            <div className={`flex items-center gap-1 ${passwordStrength.checks.number ? 'text-green-600' : 'text-gray-400'}`}>
              {passwordStrength.checks.number ? '✓' : '○'} Number
            </div>
            <div className={`flex items-center gap-1 ${passwordStrength.checks.special ? 'text-green-600' : 'text-gray-400'}`}>
              {passwordStrength.checks.special ? '✓' : '○'} Special char
            </div>
          </div>

          {/* Feedback */}
          {passwordStrength.feedback.length > 0 && (
            <div className="text-xs text-gray-600 space-y-1">
              {passwordStrength.feedback.slice(0, 2).map((tip, index) => (
                <div key={index} className="flex items-start gap-1">
                  <span className="text-blue-500">•</span>
                  <span>{tip}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
