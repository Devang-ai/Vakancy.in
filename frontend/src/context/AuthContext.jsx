import React, { createContext, useContext, useState, useEffect } from 'react';
import API from '../services/api';
import authService from '../services/authService';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token') || null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      fetchUserContext();
    } else {
      setLoading(false);
    }
  }, [token]);

  const fetchUserContext = async () => {
    try {
      if (!user) {
        setLoading(true);
      }
      const res = await API.get('/auth/me');
      if (res.success) {
        setUser(res.user);
        setProfile(res.profile);
      }
    } catch (err) {
      console.warn('Failed to restore session:', err.message);
      logout();
    } finally {
      setLoading(false);
    }
  };

  const login = async (identifier, password, role) => {
    try {
      const res = await authService.login(identifier, password, role);
      if (res.success) {
        localStorage.setItem('token', res.token);
        localStorage.setItem('user', JSON.stringify(res.user));
        setToken(res.token);
        setUser(res.user);
        setProfile(res.profile);
      }
      return res;
    } catch (err) {
      if (err?.code === 'ACCOUNT_ROLE_CONFLICT') {
        logout();
      }
      throw err;
    }
  };

  const register = async (formData) => {
    const res = await API.post('/auth/register', formData);
    if (res.success) {
      localStorage.setItem('token', res.token);
      localStorage.setItem('user', JSON.stringify(res.user));
      setToken(res.token);
      setUser(res.user);
      setProfile(res.profile);
    }
    return res;
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
    setProfile(null);
  };

  return (
    <AuthContext.Provider value={{ user, profile, token, loading, login, register, logout, fetchUserContext }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
