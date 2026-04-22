import React, { createContext, useState, useEffect, useContext, useRef, useCallback } from 'react';
import api, { clearStoredTokens } from '../utils/api';

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
  const lastResetTime = useRef(0);
  const THROTTLE_MS = 30000; // only reset timer every 30s at most

  const normalizeUser = useCallback((rawUser) => {
    if (!rawUser) return null;
    const normalized = { ...rawUser };
    normalized.firstName = normalized.firstName ?? normalized.first_name;
    normalized.lastName = normalized.lastName ?? normalized.last_name;
    normalized.yearLevel =
      normalized.yearLevel ?? normalized.year_level ?? normalized.current_year_level;
    normalized.contactNumber = normalized.contactNumber ?? normalized.contact_number;
    normalized.profilePicture = normalized.profilePicture ?? normalized.profile_picture;
    return normalized;
  }, []);

  const persistUser = useCallback(
    (rawUser) => {
      const normalized = normalizeUser(rawUser);
      setUser(normalized);
      if (normalized) {
        localStorage.setItem('user', JSON.stringify(normalized));
      } else {
        localStorage.removeItem('user');
      }
      return normalized;
    },
    [normalizeUser],
  );

  const clearInactivityTimer = () => {
    if (inactivityTimer.current) {
      clearTimeout(inactivityTimer.current);
      inactivityTimer.current = null;
    }
  };

  const doLogout = useCallback(async () => {
    clearInactivityTimer();
    try {
      await api.post('/auth/logout');
    } catch {}
    // Clear locally-stored tokens so mobile browsers (Safari ITP) stop
    // sending stale Authorization: Bearer headers after logout.
    clearStoredTokens();
    persistUser(null);
  }, [persistUser]);

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
      ACTIVITY_EVENTS.forEach((e) => window.removeEventListener(e, resetInactivityTimer));
      return;
    }
    ACTIVITY_EVENTS.forEach((e) =>
      window.addEventListener(e, resetInactivityTimer, { passive: true }),
    );
    resetInactivityTimer();
    return () => {
      clearInactivityTimer();
      ACTIVITY_EVENTS.forEach((e) => window.removeEventListener(e, resetInactivityTimer));
    };
  }, [user, resetInactivityTimer]);

  const refreshUser = useCallback(async () => {
    const response = await api.get('/auth/me');
    return persistUser(response.data?.user || null);
  }, [persistUser]);

  useEffect(() => {
    const hydrate = async () => {
      const cached = localStorage.getItem('user');
      if (cached) {
        try {
          persistUser(JSON.parse(cached));
        } catch {
          localStorage.removeItem('user');
        }
      }

      try {
        await refreshUser();
      } catch {
        persistUser(null);
      } finally {
        setLoading(false);
      }
    };

    hydrate();
  }, [persistUser, refreshUser]);

  // Listen for session-expired events dispatched by the API interceptor
  useEffect(() => {
    const handleSessionExpired = () => {
      clearInactivityTimer();
      persistUser(null);
    };
    window.addEventListener('auth:session-expired', handleSessionExpired);
    return () => window.removeEventListener('auth:session-expired', handleSessionExpired);
  }, [persistUser]);

  // Sync auth state across browser tabs via localStorage 'storage' events
  useEffect(() => {
    const handleStorageChange = (event) => {
      if (event.key !== 'user') {
        return;
      }

      if (!event.newValue) {
        clearInactivityTimer();
        setUser(null);
        return;
      }

      try {
        setUser(normalizeUser(JSON.parse(event.newValue)));
      } catch {
        clearInactivityTimer();
        setUser(null);
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [normalizeUser]);

  const login = async (email, password) => {
    const response = await api.post('/auth/login', { email, password });
    const payload = response.data || {};

    // 2FA verification happens before auth cookies are issued.
    if (payload.requiresVerification) {
      return payload;
    }

    // Restricted onboarding flows still receive auth cookies, but should keep
    // the caller on dedicated routes until requirements are resolved.
    if (payload.mustChangePassword || payload.mustChangeEmail) {
      try {
        await refreshUser();
      } catch {
        // Keep legacy response behavior even if /auth/me hydration fails.
      }
      return payload;
    }

    const hydratedUser = await refreshUser();
    return {
      ...payload,
      user: hydratedUser || payload.user || null,
    };
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
    refreshUser,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'admin',
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
