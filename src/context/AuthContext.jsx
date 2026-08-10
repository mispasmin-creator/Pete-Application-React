import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';

const AuthContext = createContext();

const SESSION_KEY = 'pete_cash_user_session';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  useEffect(() => {
    // Restore session on load
    const saved = localStorage.getItem(SESSION_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setUser(parsed);
      } catch (err) {
        localStorage.removeItem(SESSION_KEY);
      }
    }
    setLoading(false);
  }, []);

  const login = async (usernameOrEmail, password) => {
    setLoading(true);
    setAuthError(null);
    try {
      const identifier = usernameOrEmail.trim();

      const res = await api.checkUser(identifier, password);
      if (!res.success) {
        setAuthError(res.error || 'Server error checking user');
        setLoading(false);
        return false;
      }

      if (res.invalidPassword) {
        setAuthError('Access denied — Incorrect password.');
        setLoading(false);
        return false;
      }

      if (!res.exists || !res.user) {
        setAuthError('Access denied — Invalid Username or Email.');
        setLoading(false);
        return false;
      }

      if (res.user.status !== 'Active') {
        setAuthError('Access denied — Account is Inactive. Contact admin.');
        setLoading(false);
        return false;
      }

      const userData = res.user;
      setUser(userData);
      localStorage.setItem(SESSION_KEY, JSON.stringify(userData));
      setLoading(false);
      return true;
    } catch (err) {
      setAuthError('Failed to verify user credentials: ' + err.message);
      setLoading(false);
      return false;
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem(SESSION_KEY);
  };

  const value = {
    user,
    role: user ? user.role : null,
    isAdmin: user ? user.role === 'Admin' : false,
    loading,
    authError,
    setAuthError,
    login,
    logout
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
