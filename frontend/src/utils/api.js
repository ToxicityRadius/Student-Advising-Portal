import axios from 'axios';

const isProduction = process.env.NODE_ENV === 'production';
const API_URL =
  process.env.REACT_APP_API_URL || (isProduction ? '/api' : 'http://localhost:5000/api');

if (!process.env.REACT_APP_API_URL && isProduction) {
  console.warn('WARNING: REACT_APP_API_URL is not set. Falling back to relative /api base URL.');
}

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// Queue management for concurrent requests that arrive while a token refresh is in flight
let isRefreshing = false;
let failedRequestQueue = [];
const ANON_BOOTSTRAP_REFRESH_GUARD_KEY = 'auth:anon-refresh-tried';
const ANON_BOOTSTRAP_REFRESH_GUARD_TTL_MS = 60 * 1000;
const SESSION_EXPIRED_EVENT_COOLDOWN_MS = 2000;
let lastSessionExpiredEventAt = 0;

const processQueue = (error) => {
  failedRequestQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error);
    else resolve();
  });
  failedRequestQueue = [];
};

const isRefreshEndpoint = (url = '') =>
  url.includes('/auth/refresh-token') || url.includes('/auth/refresh');

const PUBLIC_AUTH_ENDPOINTS = [
  '/auth/login',
  '/auth/register',
  '/auth/verify-code',
  '/auth/resend-code',
  '/auth/forgot-password',
  '/auth/reset-password',
  '/auth/google',
];

const isPublicAuthEndpoint = (url = '') =>
  PUBLIC_AUTH_ENDPOINTS.some((endpoint) => url.includes(endpoint));

const CSRF_SAFE_METHODS = new Set(['get', 'head', 'options']);

// ---------------------------------------------------------------------------
// Token storage helpers — used as a fallback for browsers that block
// third-party / cross-site Set-Cookie headers (e.g. Safari ITP on iOS).
// The httpOnly cookie remains the primary mechanism on desktop browsers.
// ---------------------------------------------------------------------------
const AUTH_TOKEN_KEY = 'auth_token';
const AUTH_REFRESH_TOKEN_KEY = 'auth_refresh_token';

export function getStoredToken() {
  try {
    return window.localStorage.getItem(AUTH_TOKEN_KEY) || null;
  } catch {
    return null;
  }
}

export function storeAuthTokens(token, refreshToken) {
  try {
    if (token) window.localStorage.setItem(AUTH_TOKEN_KEY, token);
    if (refreshToken) window.localStorage.setItem(AUTH_REFRESH_TOKEN_KEY, refreshToken);
  } catch {
    // Ignore storage failures in restricted contexts (e.g. private browsing).
  }
}

export function clearStoredTokens() {
  try {
    window.localStorage.removeItem(AUTH_TOKEN_KEY);
    window.localStorage.removeItem(AUTH_REFRESH_TOKEN_KEY);
  } catch {
    // Ignore storage failures.
  }
}

function getStoredRefreshToken() {
  try {
    return window.localStorage.getItem(AUTH_REFRESH_TOKEN_KEY) || null;
  } catch {
    return null;
  }
}

function getCsrfToken() {
  const match = document.cookie.split(';').find((c) => c.trim().startsWith('csrfToken='));
  return match ? match.trim().slice('csrfToken='.length) : null;
}

function hasLocalUserHint() {
  if (typeof window === 'undefined') {
    return false;
  }

  try {
    return Boolean(window.localStorage.getItem('user'));
  } catch (_err) {
    return false;
  }
}

function hasTriedAnonymousBootstrapRefresh() {
  if (typeof window === 'undefined') {
    return false;
  }

  try {
    const raw = window.sessionStorage.getItem(ANON_BOOTSTRAP_REFRESH_GUARD_KEY);
    const attemptedAt = raw ? Number(raw) : NaN;
    if (!Number.isFinite(attemptedAt)) {
      return false;
    }

    return Date.now() - attemptedAt < ANON_BOOTSTRAP_REFRESH_GUARD_TTL_MS;
  } catch (_err) {
    return false;
  }
}

function markAnonymousBootstrapRefreshAttempted() {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.sessionStorage.setItem(ANON_BOOTSTRAP_REFRESH_GUARD_KEY, String(Date.now()));
  } catch (_err) {
    // Ignore storage write failures in restricted browsing contexts.
  }
}

function clearAnonymousBootstrapRefreshGuard() {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.sessionStorage.removeItem(ANON_BOOTSTRAP_REFRESH_GUARD_KEY);
  } catch (_err) {
    // Ignore storage write failures in restricted browsing contexts.
  }
}

function clearLocalUserHint() {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.removeItem('user');
  } catch (_err) {
    // Ignore storage failures in restricted contexts.
  }
}

function dispatchSessionExpiredEvent() {
  if (typeof window === 'undefined') {
    return;
  }

  const now = Date.now();
  if (now - lastSessionExpiredEventAt < SESSION_EXPIRED_EVENT_COOLDOWN_MS) {
    return;
  }

  lastSessionExpiredEventAt = now;
  window.dispatchEvent(new Event('auth:session-expired'));
}

// Attach CSRF token on state-changing requests.
api.interceptors.request.use(
  (config) => {
    // Let the browser set Content-Type automatically for FormData uploads
    // (it must include the multipart boundary which axios cannot generate)
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
    }
    // Attach CSRF token on state-changing requests (double-submit cookie pattern)
    if (!CSRF_SAFE_METHODS.has((config.method || 'get').toLowerCase())) {
      const csrfToken = getCsrfToken();
      if (csrfToken) {
        config.headers['X-CSRF-Token'] = csrfToken;
      }
    }
    // Attach stored Bearer token as Authorization header fallback.
    // This is the primary auth path for mobile browsers (e.g. Safari on iOS)
    // where cross-site httpOnly cookies are blocked by ITP.  We only inject
    // the header when no Authorization is already present so explicit overrides
    // from callers are respected.
    if (!config.headers['Authorization']) {
      const storedToken = getStoredToken();
      if (storedToken) {
        config.headers['Authorization'] = `Bearer ${storedToken}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// Response interceptor: refresh cookie-based auth session and retry once on 401.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const originalRequest = error.config;
    if (!originalRequest) {
      return Promise.reject(error);
    }

    const url = originalRequest?.url || '';
    const isAuthMeEndpoint = url.includes('/auth/me');
    const isAnonymousBootstrap = isAuthMeEndpoint && !hasLocalUserHint();
    const shouldSkipRefresh =
      isRefreshEndpoint(url) ||
      isPublicAuthEndpoint(url) ||
      originalRequest._skipAuthRefresh === true ||
      (isAnonymousBootstrap && hasTriedAnonymousBootstrapRefresh() && !isRefreshing);

    if (error.response?.status === 401 && !shouldSkipRefresh && !originalRequest._retry) {
      if (isAnonymousBootstrap) {
        markAnonymousBootstrapRefreshAttempted();
      }

      if (isRefreshing) {
        // Another refresh is already in flight — queue this request
        return new Promise((resolve, reject) => {
          failedRequestQueue.push({ resolve, reject });
        })
          .then(() => api(originalRequest))
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      // Include the locally-stored refresh token in the request body as a
      // fallback for mobile browsers where the httpOnly cookie is blocked.
      const storedRefreshToken = getStoredRefreshToken();
      const refreshBody = storedRefreshToken ? { refreshToken: storedRefreshToken } : {};

      return new Promise((resolve, reject) => {
        axios
          .post(`${API_URL}/auth/refresh-token`, refreshBody, { withCredentials: true })
          .then((refreshRes) => {
            // If the refresh endpoint returns new tokens in the body (mobile
            // cross-site flow), persist them for subsequent requests.
            const newToken = refreshRes?.data?.token;
            const newRefresh = refreshRes?.data?.refreshToken;
            if (newToken) storeAuthTokens(newToken, newRefresh);
            clearAnonymousBootstrapRefreshGuard();
            processQueue(null);
            resolve(api(originalRequest));
          })
          .catch((err) => {
            processQueue(err);
            clearLocalUserHint();
            clearStoredTokens();

            const status = err?.response?.status;
            if (!status || status >= 500) {
              clearAnonymousBootstrapRefreshGuard();
            }

            dispatchSessionExpiredEvent();
            reject(err);
          })
          .finally(() => {
            isRefreshing = false;
          });
      });
    }

    return Promise.reject(error);
  },
);

export default api;
