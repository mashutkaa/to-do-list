import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

const isAuthEndpoint = (url = '') =>
  url.includes('/auth/login') || url.includes('/auth/register');

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error),
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const requestUrl = error.config?.url ?? '';
    const isUnauthorized = error.response?.status === 401;

    // Login/register 401s are credential errors, not expired sessions.
    if (isUnauthorized && !isAuthEndpoint(requestUrl)) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');

      if (window.location.pathname !== '/auth') {
        window.location.assign('/auth');
      }
    }

    return Promise.reject(error);
  },
);

export default api;
