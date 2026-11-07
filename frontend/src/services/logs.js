import api from './api';

export const getAuditLogs = async (params = {}) => {
  const response = await api.get('/admin/logs', { params });
  return response.data;
};

export const getLogActions = async () => {
  const response = await api.get('/admin/logs/actions');
  return response.data;
};
