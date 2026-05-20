import apiCliente from './servicioApi';

export const servicioNotificaciones = {
  obtenerTodas: () => apiCliente.get('/notificaciones'),
  marcarLeida: (id) => apiCliente.put(`/notificaciones/${id}/leer`),
  eliminar: (id) => apiCliente.delete(`/notificaciones/${id}`),
};
