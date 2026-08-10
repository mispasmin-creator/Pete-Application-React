import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Lock, AlertCircle, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [touched, setTouched] = useState({});
  const { login, authError, setAuthError } = useAuth();
  const navigate = useNavigate();

  // Clear error on unmount
  useEffect(() => {
    return () => setAuthError(null);
  }, [setAuthError]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (authError) setAuthError(null);
  };

  const handleBlur = (e) => {
    const { name } = e.target;
    setTouched(prev => ({ ...prev, [name]: true }));
  };

  const validateField = (name, value) => {
    if (name === 'username' && !value.trim()) {
      return 'Username is required';
    }
    if (name === 'password' && !value) {
      return 'Password is required';
    }
    return null;
  };

  const getFieldError = (name) => {
    const value = formData[name];
    return touched[name] && validateField(name, value);
  };

  const isFormValid = () => {
    return formData.username.trim() && formData.password;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Mark all fields as touched
    setTouched({ username: true, password: true });
    
    if (!isFormValid()) return;

    setIsSubmitting(true);
    try {
      const success = await login(formData.username.trim(), formData.password);
      if (success) {
        navigate('/');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4 font-sans">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-6 sm:p-8 transition-all duration-300 hover:shadow-2xl">
        
        {/* Logo & Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-100 p-3 flex items-center justify-center shadow-md">
            <img 
              src="/logo.png" 
              alt="Pete Cash Logo" 
              className="w-full h-full object-contain"
              onError={(e) => {
                e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="%2310b981" stroke-width="2"%3E%3Cpath d="M12 2v20M12 6c-2.5 0-4.5 2-4.5 4.5S9.5 15 12 15s4.5-2 4.5-4.5S14.5 6 12 6z"/%3E%3C/svg%3E';
              }}
            />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Welcome Back</h1>
          <p className="text-sm text-slate-500 mt-1">Sign in to your Pete Cash account</p>
        </div>

        {/* Error Message */}
        {authError && (
          <div className="mb-6 p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3 text-rose-700 animate-slide-down">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium">{authError}</p>
              <p className="text-xs text-rose-600 mt-0.5">Please check your credentials and try again</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Username Field */}
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-slate-700 mb-1.5">
              Username or Email
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <User className="w-5 h-5" />
              </div>
              <input
                id="username"
                name="username"
                type="text"
                autoComplete="username"
                required
                value={formData.username}
                onChange={handleChange}
                onBlur={handleBlur}
                placeholder="Enter your username or email"
                className={`w-full bg-slate-50 border rounded-xl pl-11 pr-4 py-3 text-sm text-slate-900 placeholder-slate-400 outline-none transition-all shadow-sm focus:shadow-md
                  ${getFieldError('username') 
                    ? 'border-rose-400 focus:border-rose-500 focus:ring-2 focus:ring-rose-200' 
                    : 'border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200'
                  }`}
                aria-invalid={!!getFieldError('username')}
                aria-describedby={getFieldError('username') ? 'username-error' : undefined}
              />
            </div>
            {getFieldError('username') && (
              <p id="username-error" className="mt-1.5 text-xs text-rose-600 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" />
                {getFieldError('username')}
              </p>
            )}
          </div>

          {/* Password Field */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="password" className="block text-sm font-medium text-slate-700">
                Password
              </label>
              <span 
                onClick={() => alert('Please contact system Admin to reset your password.')}
                className="text-xs text-emerald-600 hover:text-emerald-700 font-medium cursor-pointer hover:underline transition-colors"
              >
                Forgot password?
              </span>
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Lock className="w-5 h-5" />
              </div>
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                required
                value={formData.password}
                onChange={handleChange}
                onBlur={handleBlur}
                placeholder="Enter your password"
                className={`w-full bg-slate-50 border rounded-xl pl-11 pr-12 py-3 text-sm text-slate-900 placeholder-slate-400 outline-none transition-all shadow-sm focus:shadow-md
                  ${getFieldError('password') 
                    ? 'border-rose-400 focus:border-rose-500 focus:ring-2 focus:ring-rose-200' 
                    : 'border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200'
                  }`}
                aria-invalid={!!getFieldError('password')}
                aria-describedby={getFieldError('password') ? 'password-error' : undefined}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 transition-colors focus:outline-none"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            {getFieldError('password') && (
              <p id="password-error" className="mt-1.5 text-xs text-rose-600 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" />
                {getFieldError('password')}
              </p>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting || !isFormValid()}
            className="w-full mt-2 py-3.5 px-4 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-semibold rounded-xl text-sm shadow-lg shadow-emerald-200/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Signing in...</span>
              </>
            ) : (
              <>
                <span>Sign In</span>
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>
        </form>

        {/* Footer */}
        <div className="mt-6 text-center border-t border-slate-100 pt-4">
          <p className="text-xs text-slate-500">
            Need an account or password assistance? <br />
            <span className="font-semibold text-slate-700">Please contact System Administrator</span>
          </p>
        </div>
      </div>
    </div>
  );
}