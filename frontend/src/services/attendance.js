import api from './api';

export const getSessions = async () => {
  const response = await api.get('/admin/sessions');
  return response.data;
};

export const getSessionById = async (id) => {
  const response = await api.get(`/admin/sessions/${id}`);
  return response.data;
};

export const createSession = async (data) => {
  const response = await api.post('/admin/sessions', data);
  return response.data;
};

export const updateSession = async (id, data) => {
  const response = await api.put(`/admin/sessions/${id}`, data);
  return response.data;
};

export const deleteSession = async (id) => {
  const response = await api.delete(`/admin/sessions/${id}`);
  return response.data;
};

export const markAttendance = async (sessionId, studentId, status) => {
  const response = await api.post('/admin/attendance/mark', {
    session_id: sessionId,
    student_id: studentId,
    status: status,
  });
  return response.data;
};

export const bulkMarkAttendance = async (sessionId, studentIds, status) => {
  const response = await api.post('/admin/attendance/bulk-mark', {
    session_id: sessionId,
    student_ids: studentIds,
    status: status,
  });
  return response.data;
};

export const getAttendanceList = async (params = {}) => {
  const response = await api.get('/admin/attendance', { params });
  return response.data;
};
