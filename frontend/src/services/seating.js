import api from './api';

export const getSections = async () => {
  const response = await api.get('/admin/sections');
  return response.data;
};

export const getSectionById = async (id) => {
  const response = await api.get(`/admin/sections/${id}`);
  return response.data;
};

export const createSection = async (data) => {
  const response = await api.post('/admin/sections', data);
  return response.data;
};

export const updateSection = async (id, data) => {
  const response = await api.put(`/admin/sections/${id}`, data);
  return response.data;
};

export const deleteSection = async (id) => {
  const response = await api.delete(`/admin/sections/${id}`);
  return response.data;
};

export const getSeats = async (params = {}) => {
  const response = await api.get('/admin/seats', { params });
  return response.data;
};

export const assignSeat = async (seatId, studentId) => {
  const response = await api.post('/admin/seats/assign', {
    seat_id: seatId,
    student_id: studentId,
  });
  return response.data;
};

export const reassignSeat = async (studentId, targetSeatId) => {
  const response = await api.post('/admin/seats/reassign', {
    student_id: studentId,
    target_seat_id: targetSeatId,
  });
  return response.data;
};

export const swapSeats = async (seatId1, seatId2) => {
  const response = await api.post('/admin/seats/swap', {
    seat_id_1: seatId1,
    seat_id_2: seatId2,
  });
  return response.data;
};

export const releaseSeat = async (seatId) => {
  const response = await api.post('/admin/seats/release', {
    seat_id: seatId,
  });
  return response.data;
};
