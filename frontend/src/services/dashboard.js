import api from './api';

export const getDashboardData = async () => {
  const response = await api.get('/admin/dashboard');
  return response.data;
};
