import api from './servicioApi';

export const servicioReservas = {
  obtenerTodas: () => api.get('/reservas'),
  obtenerPorMes: (year, month) => api.get(`/reservas/mes?year=${year}&month=${month}`),
  obtenerMisReservas: () => api.get('/reservas/mias'),
  crear: (datos) => api.post('/reservas', datos),
  cancelar: (id) => api.put(`/reservas/${id}/cancelar`),
  aprobar: (id) => api.put(`/reservas/${id}/aprobar`),
  rechazar: (id) => api.put(`/reservas/${id}/rechazar`),
};
