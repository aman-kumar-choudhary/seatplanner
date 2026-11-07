import api from './api';

export const getStudents = async (params = {}) => {
  const response = await api.get('/admin/students', { params });
  return response.data;
};

export const getStudentFilters = async () => {
  const response = await api.get('/admin/students/meta/filters');
  return response.data;
};

export const getStudentById = async (id) => {
  const response = await api.get(`/admin/students/${id}`);
  return response.data;
};

export const createStudent = async (data) => {
  const response = await api.post('/admin/students', data);
  return response.data;
};

export const updateStudent = async (id, data) => {
  const response = await api.put(`/admin/students/${id}`, data);
  return response.data;
};

export const deleteStudent = async (id) => {
  const response = await api.delete(`/admin/students/${id}`);
  return response.data;
};

export const importStudentsFile = async (formData) => {
  const response = await api.post('/admin/students/import', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

export const getExportStudentsUrl = (format = 'csv') => {
  return `/api/admin/students/export/file?format=${format}`;
};
