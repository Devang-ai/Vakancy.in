import axios from 'axios';

const API = axios.create({
  baseURL: '/api',
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
  }
  const payload = error.response?.data || { message: error.message };
  if (payload && typeof payload === 'object') {
    if (!payload.message && error.message) {
      payload.message = error.message;
    }
    if (!payload.response && error.response) {
      payload.response = error.response;
    }
  }
  return Promise.reject(payload);
});

export default API;
