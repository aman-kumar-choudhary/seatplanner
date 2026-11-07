import api from './api';

export const getPublicSeating = async () => {
  const response = await api.get('/public/seating');
  return response.data;
};

export const searchPublicStudent = async (query) => {
  const response = await api.get('/public/students/search', {
    params: { q: query },
  });
  return response.data;
};
