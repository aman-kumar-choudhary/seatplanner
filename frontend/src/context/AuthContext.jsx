import React, { createContext, useContext, useState, useEffect } from 'react';
import { loginAdmin, logoutAdmin, getAdminProfile } from '../services/auth';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [admin, setAdmin] = useState(() => {
    const saved = localStorage.getItem('admin');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const verifyAuth = async () => {
      if (token) {
        try {
          const profile = await getAdminProfile();
          setAdmin(profile);
          localStorage.setItem('admin', JSON.stringify(profile));
        } catch (error) {
          console.error('Failed to verify token:', error);
          setAdmin(null);
          setToken(null);
          localStorage.removeItem('token');
          localStorage.removeItem('admin');
        }
      }
      setLoading(false);
    };

    verifyAuth();
  }, [token]);

  const login = async (username, password) => {
    const data = await loginAdmin(username, password);
    setToken(data.access_token);
    setAdmin(data.admin);
    localStorage.setItem('token', data.access_token);
    localStorage.setItem('admin', JSON.stringify(data.admin));
    return data;
  };

  const logout = async () => {
    try {
      await logoutAdmin();
    } catch (e) {
      console.warn('Logout request warning:', e);
    } finally {
      setAdmin(null);
      setToken(null);
      localStorage.removeItem('token');
      localStorage.removeItem('admin');
    }
  };

  const refreshProfile = async () => {
    try {
      const profile = await getAdminProfile();
      setAdmin(profile);
      localStorage.setItem('admin', JSON.stringify(profile));
    } catch (e) {
      console.error('Failed to refresh profile:', e);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        admin,
        token,
        isAuthenticated: !!token,
        loading,
        login,
        logout,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
