import API from './api';

export const authService = {
  login: async (identifier, password, role) => {
    return await API.post('/auth/login', { email: identifier, identifier, password, role });
  },

  register: async (payload) => {
    return await API.post('/auth/register', payload);
  },

  googleAuth: async ({ credential, role, company_name }) => {
    return await API.post('/auth/google', { credential, role, company_name });
  },

  linkGoogleAccount: async ({ credential, password }) => {
    return await API.post('/auth/google/link', { credential, password });
  },

  getCurrentUser: async () => {
    return await API.get('/auth/me');
  },

  changePassword: async ({ currentPassword, newPassword }) => {
    return await API.post('/auth/change-password', { currentPassword, newPassword });
  },

  sendSetPasswordOtp: async () => {
    return await API.post('/auth/set-password/send-otp');
  },

  setPassword: async ({ otp, newPassword }) => {
    return await API.post('/auth/set-password', { otp, newPassword });
  },

  sendResetOtp: async (email) => {
    return await API.post('/auth/forgot-password/send-otp', { email });
  },

  verifyResetOtp: async ({ email, otp }) => {
    return await API.post('/auth/forgot-password/verify-otp', { email, otp });
  },

  resetPassword: async ({ resetToken, newPassword }) => {
    return await API.post('/auth/reset-password', { resetToken, newPassword });
  },

  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  }
};

export default authService;
