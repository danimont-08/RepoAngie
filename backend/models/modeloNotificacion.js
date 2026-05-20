const { poolConexion } = require('../config/baseDatos');

class ModeloNotificacion {
  // Crear una nueva notificación
  static async crear({ idApartamento, titulo, mensaje }) {
    const [resultado] = await poolConexion.query(
      'INSERT INTO notificaciones (id_apartamento, titulo, mensaje, leido) VALUES (?, ?, ?, 0)',
      [idApartamento || null, titulo, mensaje]
    );
    return resultado;
  }

  // Obtener las notificaciones de un usuario según su rol
  static async obtenerPorUsuario(idApartamento, rol) {
    if (rol === 'administrador' || rol === 'supervisor') {
      const [filas] = await poolConexion.query(`
        SELECT * FROM notificaciones
        WHERE id_apartamento IS NULL OR id_apartamento = ?
        ORDER BY fecha_creacion DESC
        LIMIT 50
      `, [idApartamento]);
      return filas;
    } else {
      const [filas] = await poolConexion.query(`
        SELECT * FROM notificaciones
        WHERE id_apartamento = ?
        ORDER BY fecha_creacion DESC
        LIMIT 50
      `, [idApartamento]);
      return filas;
    }
  }

  // Marcar una notificación como leída
  static async marcarComoLeida(idNotificacion) {
    const [resultado] = await poolConexion.query(
      'UPDATE notificaciones SET leido = 1 WHERE id_notificacion = ?',
      [idNotificacion]
    );
    return resultado;
  }

  // Eliminar una notificación
  static async eliminar(idNotificacion) {
    const [resultado] = await poolConexion.query(
      'DELETE FROM notificaciones WHERE id_notificacion = ?',
      [idNotificacion]
    );
    return resultado;
  }
}

module.exports = ModeloNotificacion;
