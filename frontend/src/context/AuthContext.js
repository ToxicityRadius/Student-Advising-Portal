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

  const lastResetTime = useRef(0);
  const THROTTLE_MS = 30000; // only reset timer every 30s at most

  const resetInactivityTimer = useCallback(() => {
    const now = Date.now();
    if (now - lastResetTime.current < THROTTLE_MS) return;
    lastResetTime.current = now;
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

  // Ensure consistent camelCase properties regardless of whether data came from
  // the JWT token (old: snake_case) or the Sequelize /auth/me response (camelCase).
  // Also handles the schema reality where 'first_name' and 'firstName' are separate
  // DB columns — both may be present.
  const normalizeUser = (rawUser) => {
    if (!rawUser) return null;
    const u = { ...rawUser };
    u.firstName = u.firstName ?? u.first_name;
    u.lastName = u.lastName ?? u.last_name;
    u.yearLevel = u.yearLevel ?? u.year_level ?? u.current_year_level;
    u.contactNumber = u.contactNumber ?? u.contact_number;
    u.profilePicture = u.profilePicture ?? u.profile_picture;
    return u;
  };

  const decodeToken = (token) => {
    try {
      const payload = token.split('.')[1];
      if (!payload) return null;

      const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
      const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
      const decoded = JSON.parse(atob(padded));

      if (!decoded.id || !decoded.role) return null;

      // Slim tokens (Phase 2+) only carry id, role, is_verified.
      // Only include PII fields when present to avoid overriding /auth/me response with undefined.
      const result = {
        id: decoded.id,
        role: decoded.role,
        is_verified: decoded.is_verified ?? false
      };
      if (decoded.first_name != null) {
        result.first_name = decoded.first_name;
        result.firstName = decoded.first_name;
      }
      if (decoded.program != null) result.program = decoded.program;
      if (decoded.contact_number != null) result.contact_number = decoded.contact_number;
      if (decoded.year_level != null) result.year_level = decoded.year_level;

      return result;
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

    const normalizedInitial = normalizeUser(initialUser);
    if (normalizedInitial) {
      setUser(normalizedInitial);
      localStorage.setItem('user', JSON.stringify(normalizedInitial));
    }

    try {
      const response = await api.get('/auth/me');
      const merged = normalizeUser({
        ...(response.data.user || {}),
        ...(decodedUser || {})
      });
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Listen for session-expired events dispatched by the API interceptor
  useEffect(() => {
    const handleSessionExpired = () => {
      clearInactivityTimer();
      setUser(null);
    };
    window.addEventListener('auth:session-expired', handleSessionExpired);
    return () => window.removeEventListener('auth:session-expired', handleSessionExpired);
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
