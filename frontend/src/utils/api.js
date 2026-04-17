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

const processQueue = (error, token = null) => {
  failedRequestQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error);
    else resolve(token);
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

function getCsrfToken() {
  const match = document.cookie.split(';').find((c) => c.trim().startsWith('csrfToken='));
  return match ? match.trim().slice('csrfToken='.length) : null;
}

// Add token to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    const hasExplicitAuthHeader =
      Boolean(config.headers?.Authorization) || Boolean(config.headers?.authorization);
    if (token && !hasExplicitAuthHeader) {
      config.headers.Authorization = `Bearer ${token}`;
    }
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
    return config;
  },
  (error) => Promise.reject(error),
);

// Response interceptor: capture refresh tokens and handle 401 with retry (Step 3.3)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const originalRequest = error.config;
    if (!originalRequest) {
      return Promise.reject(error);
    }

    const url = originalRequest?.url || '';
    const shouldSkipRefresh =
      url.includes('/auth/me') || isRefreshEndpoint(url) || isPublicAuthEndpoint(url);

    if (error.response?.status === 401 && !shouldSkipRefresh && !originalRequest._retry) {
      if (isRefreshing) {
        // Another refresh is already in flight — queue this request
        return new Promise((resolve, reject) => {
          failedRequestQueue.push({ resolve, reject });
        })
          .then((newToken) => {
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      return new Promise((resolve, reject) => {
        axios
          .post(`${API_URL}/auth/refresh-token`, {}, { withCredentials: true })
          .then(({ data }) => {
            const payload = data?.data && typeof data.data === 'object' ? data.data : data;
            const newToken = payload.token;
            localStorage.setItem('token', newToken);
            api.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            processQueue(null, newToken);
            resolve(api(originalRequest));
          })
          .catch((err) => {
            processQueue(err, null);
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.dispatchEvent(new Event('auth:session-expired'));
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
