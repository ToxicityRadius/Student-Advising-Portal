import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

if (!process.env.REACT_APP_API_URL && process.env.NODE_ENV === 'production') {
  console.warn('WARNING: REACT_APP_API_URL is not set. Using localhost fallback which will not work in production.');
}

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  },
  withCredentials: true
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

// Add token to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    // Let the browser set Content-Type automatically for FormData uploads
    // (it must include the multipart boundary which axios cannot generate)
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: capture refresh tokens and handle 401 with retry (Step 3.3)
api.interceptors.response.use(
  (response) => {
    // Capture and store refresh tokens returned by any auth endpoint
    if (response.data?.refreshToken) {
      localStorage.setItem('refreshToken', response.data.refreshToken);
    }
    return response;
  },
  (error) => {
    const originalRequest = error.config;
    const url = originalRequest?.url || '';
    const isAuthEndpoint = url.includes('/auth/me') || url.includes('/auth/refresh');

    if (error.response?.status === 401 && !isAuthEndpoint && !originalRequest._retry) {
      const storedRefreshToken = localStorage.getItem('refreshToken');

      if (!storedRefreshToken) {
        // No refresh token available — trigger auth expiry event
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.dispatchEvent(new Event('auth:session-expired'));
        return Promise.reject(error);
      }

      if (isRefreshing) {
        // Another refresh is already in flight — queue this request
        return new Promise((resolve, reject) => {
          failedRequestQueue.push({ resolve, reject });
        }).then((newToken) => {
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          return api(originalRequest);
        }).catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      return new Promise((resolve, reject) => {
        axios.post(`${API_URL}/auth/refresh-token`, { refreshToken: storedRefreshToken }, { withCredentials: true })
          .then(({ data }) => {
            const newToken = data.token;
            const newRefreshToken = data.refreshToken;
            localStorage.setItem('token', newToken);
            if (newRefreshToken) localStorage.setItem('refreshToken', newRefreshToken);
            api.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            processQueue(null, newToken);
            resolve(api(originalRequest));
          })
          .catch((err) => {
            processQueue(err, null);
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            localStorage.removeItem('refreshToken');
            window.dispatchEvent(new Event('auth:session-expired'));
            reject(err);
          })
          .finally(() => {
            isRefreshing = false;
          });
      });
    }

    return Promise.reject(error);
  }
);

export default api;
