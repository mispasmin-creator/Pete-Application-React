import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Lock, AlertCircle, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login, authError, setAuthError } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim()) return;

    setIsSubmitting(true);
    const success = await login(username.trim(), password);
    setIsSubmitting(false);

    if (success) {
      navigate('/');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-50 flex items-center justify-center p-4 font-sans">
      <div className="w-full max-w-sm bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative z-10 animate-fade-in">
        
        {/* LOGO HEADER */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 mx-auto mb-3 rounded-2xl bg-slate-50 border border-slate-200 p-2 flex items-center justify-center shadow-sm">
            <img src="/logo.png" alt="Pete Logo" className="w-full h-full object-contain" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Pete Cash</h2>
          <p className="text-xs text-slate-500 font-medium mt-0.5">Sign in to access your account</p>
        </div>
        
        {authError && (
          <div className="mb-5 p-3 text-center bg-rose-50 border border-rose-200 rounded-xl text-rose-600 text-xs font-medium animate-fade-in">
            {authError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500 group-focus-within:text-emerald-500 transition-colors">
              <User className="w-5 h-5" />
            </div>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
                if (authError) setAuthError(null);
              }}
              placeholder="Username or Email"
              className="w-full bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl pl-12 pr-4 py-3.5 text-sm text-slate-900 placeholder-slate-400 outline-none transition-all shadow-sm"
            />
          </div>

          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500 group-focus-within:text-emerald-500 transition-colors">
              <Lock className="w-5 h-5" />
            </div>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (authError) setAuthError(null);
              }}
              placeholder="Password"
              className="w-full bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl pl-12 pr-4 py-3.5 text-sm text-slate-900 placeholder-slate-400 outline-none transition-all shadow-sm"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting || !username.trim()}
            className="w-full mt-2 py-3.5 px-4 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold rounded-xl text-sm shadow-lg shadow-emerald-200 flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {isSubmitting ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <ArrowRight className="w-5 h-5" />
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
