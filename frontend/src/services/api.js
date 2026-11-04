import axios from 'axios';

const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || '/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

// Interceptor to inject Bearer token
API.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

// Response Interceptor for global 401 unauth handling
API.interceptors.response.use((response) => {
  return response.data;
}, (error) => {
  if (error.response && error.response.status === 401) {
    // Clear invalid token if unauth
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.dispatchEvent(new Event('vakancy:auth-expired'));
  }
  let payload = error.response?.data || { message: error.message };
  if (typeof payload === 'string') {
    payload = { message: payload };
  }
  if (payload && typeof payload === 'object') {
    if (!payload.message && error.message) {
      payload.message = error.message;
    }
    if (!payload.response && error.response) {
      payload.response = error.response;
    }
    if (!payload.status && error.response) {
      payload.status = error.response.status;
    }
    if (!payload.code && error.response?.data?.code) {
      payload.code = error.response.data.code;
    }
  }
  return Promise.reject(payload);
});

export default API;
