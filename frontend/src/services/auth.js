import api from './api';

export const loginAdmin = async (username, password) => {
  const response = await api.post('/auth/login', { username, password });
  return response.data;
};

export const logoutAdmin = async () => {
  try {
    await api.post('/auth/logout');
  } finally {
    localStorage.removeItem('token');
    localStorage.removeItem('admin');
  }
};

export const getAdminProfile = async () => {
  const response = await api.get('/auth/me');
  return response.data;
};

export const changePassword = async (currentPassword, newPassword) => {
  const response = await api.put('/auth/change-password', {
    current_password: currentPassword,
    new_password: newPassword,
  });
  return response.data;
};

export const updateProfile = async (name) => {
  const response = await api.put('/auth/profile', { name });
  return response.data;
};
