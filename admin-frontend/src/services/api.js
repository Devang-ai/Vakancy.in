import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.dispatchEvent(new Event('vakancy:auth-expired'));
    }
    const message = error.response?.data?.message || error.message || 'An unexpected error occurred';
    const apiError = new Error(message);
    apiError.status = error.response?.status;
    apiError.code = error.response?.data?.code;
    apiError.response = error.response;
    return Promise.reject(apiError);
  }
);

export default api;
