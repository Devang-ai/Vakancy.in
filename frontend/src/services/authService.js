import API from './api';

export const authService = {
  login: async (identifier, password, role) => {
    return await API.post('/auth/login', { email: identifier, identifier, password, role });
  },

  register: async (payload) => {
    return await API.post('/auth/register', payload);
  },

  getCurrentUser: async () => {
    return await API.get('/auth/me');
  },

  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  }
};

export default authService;
