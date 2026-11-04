import React, { createContext, useContext, useState, useEffect } from 'react';
import API from '../services/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem('user');
      return savedUser ? JSON.parse(savedUser) : null;
    } catch {
      localStorage.removeItem('user');
      return null;
    }
  });
  const [token, setToken] = useState(() => localStorage.getItem('token') || null);
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);

  const clearSession = () => {
    setToken(null);
    setUser(null);
    setPermissions([]);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  };

  useEffect(() => {
    const handleExpiredSession = () => clearSession();
    window.addEventListener('vakancy:auth-expired', handleExpiredSession);
    return () => window.removeEventListener('vakancy:auth-expired', handleExpiredSession);
  }, []);

  useEffect(() => {
    if (token) {
      API.get('/auth/me')
        .then(async (res) => {
          if (res.success && res.user) {
            setUser(res.user);
            localStorage.setItem('user', JSON.stringify(res.user));
            try {
              const profileResponse = await API.get('/admin/profile/me');
              setPermissions(profileResponse.profile?.permissions || []);
            } catch (profileError) {
              if (profileError.status === 401) throw profileError;
              setPermissions([]);
            }
          } else {
            logout();
          }
        })
        .catch(() => {
          logout();
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [token]);

  const login = async (email, password) => {
    const res = await API.post('/auth/login', { email, password });
    if (res.success && res.token) {
      const publicRoles = ['candidate', 'employer'];
      if (publicRoles.includes(res.user.role)) {
        throw new Error('Access denied: Candidate and Employer accounts cannot access the Internal Admin Portal.');
      }
      setToken(res.token);
      setUser(res.user);
      localStorage.setItem('token', res.token);
      localStorage.setItem('user', JSON.stringify(res.user));
      try {
        const profileResponse = await API.get('/admin/profile/me');
        setPermissions(profileResponse.profile?.permissions || []);
      } catch (profileError) {
        if (profileError.status === 401) throw profileError;
        setPermissions([]);
      }
    }
    return res;
  };

  const logout = () => {
    clearSession();
  };

  return (
    <AuthContext.Provider value={{ user, token, permissions, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
