import api from './api';

export const getAttendanceReport = async (params = {}) => {
  const response = await api.get('/admin/reports/attendance', { params });
  return response.data;
};

export const getExportReportUrl = (format = 'csv', params = {}) => {
  const searchParams = new URLSearchParams({ format, ...params });
  return `/api/admin/reports/attendance/export?${searchParams.toString()}`;
};
