import React, { createContext, useState, useEffect, useContext, useRef, useCallback } from 'react';
import api from '../utils/api';

const AuthContext = createContext();

const INACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 minutes
const ACTIVITY_EVENTS = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'click'];

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const inactivityTimer = useRef(null);

  const clearInactivityTimer = () => {
    if (inactivityTimer.current) {
      clearTimeout(inactivityTimer.current);
      inactivityTimer.current = null;
    }
  };

  const doLogout = useCallback(async () => {
    clearInactivityTimer();
    try { await api.post('/auth/logout'); } catch {}
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  }, []);

  const resetInactivityTimer = useCallback(() => {
    clearInactivityTimer();
    inactivityTimer.current = setTimeout(() => {
      doLogout();
    }, INACTIVITY_TIMEOUT);
  }, [doLogout]);

  // Attach/detach activity listeners whenever user login state changes
  useEffect(() => {
    if (!user) {
      clearInactivityTimer();
      ACTIVITY_EVENTS.forEach(e => window.removeEventListener(e, resetInactivityTimer));
      return;
    }
    ACTIVITY_EVENTS.forEach(e => window.addEventListener(e, resetInactivityTimer, { passive: true }));
    resetInactivityTimer();
    return () => {
      clearInactivityTimer();
      ACTIVITY_EVENTS.forEach(e => window.removeEventListener(e, resetInactivityTimer));
    };
  }, [user, resetInactivityTimer]);

  const decodeToken = (token) => {
    try {
      const payload = token.split('.')[1];
      if (!payload) return null;

      const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
      const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
      const decoded = JSON.parse(atob(padded));

      return {
        id: decoded.id,
        role: decoded.role,
        is_verified: decoded.is_verified,
        first_name: decoded.first_name,
        firstName: decoded.first_name,
        program: decoded.program,
        contact_number: decoded.contact_number,
        year_level: decoded.year_level
      };
    } catch {
      return null;
    }
  };

  const applyToken = async (token, fallbackUser = null) => {
    localStorage.setItem('token', token);

    const decodedUser = decodeToken(token);
    const initialUser = fallbackUser
      ? { ...fallbackUser, ...decodedUser }
      : (decodedUser || null);

    if (initialUser) {
      setUser(initialUser);
      localStorage.setItem('user', JSON.stringify(initialUser));
    }

    try {
      const response = await api.get('/auth/me');
      const merged = {
        ...(response.data.user || {}),
        ...(decodedUser || {})
      };
      setUser(merged);
      localStorage.setItem('user', JSON.stringify(merged));
      return merged;
    } catch {
      if (initialUser) return initialUser;
      throw new Error('Failed to hydrate user from token');
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        await applyToken(token, JSON.parse(localStorage.getItem('user') || 'null'));
      } catch (error) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }
    setLoading(false);
  };

  const login = async (emailOrToken, password) => {
    // Token mode: login(token)
    if (password === undefined && typeof emailOrToken === 'string' && emailOrToken.split('.').length === 3) {
      const mergedUser = await applyToken(emailOrToken, JSON.parse(localStorage.getItem('user') || 'null'));
      return { token: emailOrToken, user: mergedUser };
    }

    // Credential mode: login(email, password)
    const response = await api.post('/auth/login', { email: emailOrToken, password });
    const { token, user } = response.data;
    await applyToken(token, user);
    return response.data;
  };

  const register = async (userData) => {
    const response = await api.post('/auth/register', userData);
    return response.data;
  };

  const logout = doLogout;

  const value = {
    user,
    setUser,
    loading,
    login,
    register,
    logout,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'admin'
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
