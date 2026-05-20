const ModeloNotificacion = require('../models/modeloNotificacion');

const controladorNotificaciones = {
  obtenerMisNotificaciones: async (req, res) => {
    try {
      const idApartamento = req.usuario.idApartamento;
      const rol = req.usuario.rol;
      
      const notificaciones = await ModeloNotificacion.obtenerPorUsuario(idApartamento, rol);
      res.json({ exito: true, datos: notificaciones });
    } catch (error) {
      console.error('Error al obtener notificaciones:', error);
      res.status(500).json({ exito: false, mensaje: 'Error interno del servidor' });
    }
  },

  marcarLeida: async (req, res) => {
    try {
      const { id } = req.params;
      await ModeloNotificacion.marcarComoLeida(id);
      res.json({ exito: true, mensaje: 'Notificación marcada como leída' });
    } catch (error) {
      console.error('Error al marcar notificación como leída:', error);
      res.status(500).json({ exito: false, mensaje: 'Error al actualizar la notificación' });
    }
  },

  eliminarNotificacion: async (req, res) => {
    try {
      const { id } = req.params;
      await ModeloNotificacion.eliminar(id);
      res.json({ exito: true, mensaje: 'Notificación eliminada' });
    } catch (error) {
      console.error('Error al eliminar notificación:', error);
      res.status(500).json({ exito: false, mensaje: 'Error al eliminar la notificación' });
    }
  }
};

module.exports = controladorNotificaciones;
