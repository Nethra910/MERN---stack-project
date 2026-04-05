import axios from 'axios';

// ✅ Create axios instance with baseURL and timeout
const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5001/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ✅ Request interceptor - Add JWT token to every request
API.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// ✅ Response interceptor - Handle common errors
API.interceptors.response.use(
  (response) => response,
  (error) => {
    // ✅ Handle 401 Unauthorized (token expired or invalid)
    if (error.response?.status === 401) {
      // Clear stored data
      localStorage.removeItem('token');
      localStorage.removeItem('user');

      // ✅ FIX: Guard window access (safe in browser, avoids SSR crash)
      if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  }
);

export default API;