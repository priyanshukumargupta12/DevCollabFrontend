import axios from 'axios';

/**
 * Axios instance pre-configured for the backend API.
 * Base URL points to /api which is proxied to http://localhost:5000/api in dev.
 */
const getBaseUrl = () => {
  let url = import.meta.env.VITE_API_URL || '/api';
  if (url.startsWith('http') && !url.endsWith('/api') && !url.endsWith('/api/')) {
    url = url.replace(/\/$/, '') + '/api';
  }
  return url;
};

const api = axios.create({
  baseURL: getBaseUrl(),
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000, // 10 second request timeout
});

export const getBackendUrl = () => {
  const url = getBaseUrl();
  return url.startsWith('http') 
    ? url.replace(/\/api$/, '') 
    : (window.location.hostname === 'localhost' 
        ? 'http://localhost:5000' 
        : window.location.origin);
};


// ─── Request Interceptor ───────────────────────────────────────────────────
// Attach JWT Bearer token from localStorage to every outgoing request.
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ─── Response Interceptor ──────────────────────────────────────────────────
// Handle 401 (token expired / invalid) globally — clear storage and redirect.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token is invalid or expired; clean up and redirect to login
      localStorage.removeItem('auth_token');
      localStorage.removeItem('auth_user');

      // Only redirect if not already on an auth page
      const authPaths = ['/login', '/register'];
      if (!authPaths.includes(window.location.pathname)) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
