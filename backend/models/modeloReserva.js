const { poolConexion } = require('../config/baseDatos');

class ModeloReserva {
  // OBTENER TODAS LAS RESERVAS POR MES C3 -
  static async obtenerPorMes(year, month) {
  
    const fechaInicio = `${year}-${month.toString().padStart(2, '0')}-01`;
    
    const nextMonth = month === 12 ? 1 : month + 1;
    const nextYear = month === 12 ? year + 1 : year;
    const fechaFin = `${nextYear}-${nextMonth.toString().padStart(2, '0')}-01`;

    const [filas] = await poolConexion.query(`
      SELECT r.id_reserva, r.fecha_reserva, r.estado, u.nombre_titular, u.id_apartamento
      FROM reservas r
      JOIN usuarios u ON r.id_apartamento = u.id_apartamento
      WHERE r.fecha_reserva >= ? AND r.fecha_reserva < ?
      ORDER BY r.fecha_reserva ASC
    `, [fechaInicio, fechaFin]);
    return filas;
  }

// OBTENER TODAS LAS RESERVAS -
  static async obtenerTodas() {
    const [filas] = await poolConexion.query(`
      SELECT r.id_reserva, r.fecha_reserva, r.estado, r.fecha_creacion, u.nombre_titular, u.id_apartamento
      FROM reservas r
      JOIN usuarios u ON r.id_apartamento = u.id_apartamento
      ORDER BY r.fecha_reserva DESC
    `);
    return filas;
  }

  static async obtenerPorUsuario(idApartamento) {
    const [filas] = await poolConexion.query(`
      SELECT * FROM reservas
      WHERE id_apartamento = ?
      ORDER BY fecha_reserva DESC
    `, [idApartamento]);
    return filas;
  }

  // VERIFICACIÓN RESERVA ACTIVA
  static async tieneReservaActiva(idApartamento, fecha) {
    const [filas] = await poolConexion.query(`
      SELECT id_reserva FROM reservas
      WHERE id_apartamento = ? AND fecha_reserva = ? AND estado IN ('activa', 'aprobada')
    `, [idApartamento, fecha]);
    return filas.length > 0;
  }

  // RESTRICCIÓN: VERIFICAR SI EL USUARIO YA TIENE UNA RESERVA ACTIVA/APROBADA VIGENTE
  static async tieneReservaActivaVigente(idApartamento) {
    const hoy = new Date().toISOString().split('T')[0]; 
    const [filas] = await poolConexion.query(`
      SELECT id_reserva FROM reservas
      WHERE id_apartamento = ? AND fecha_reserva >= ? AND estado IN ('activa', 'aprobada')
      LIMIT 1
    `, [idApartamento, hoy]);
    return filas.length > 0;
  }

  //VERIFICACIÓN DE APROBACIÓN RESERVA
  static async tieneReservaAprobada(idApartamento, fecha) {
    const [filas] = await poolConexion.query(`
      SELECT id_reserva FROM reservas
      WHERE id_apartamento = ? AND fecha_reserva = ? AND estado = 'aprobada'
    `, [idApartamento, fecha]);
    return filas.length > 0;
  }

  static async verificarDisponibilidad(fechaReserva) {
    const [filas] = await poolConexion.query(
      'SELECT id_reserva FROM reservas WHERE fecha_reserva = ? AND estado NOT IN ("cancelada", "rechazada")',
      [fechaReserva]
    );
    return filas.length === 0;
  }


// CREAR NUEVA RESERVA -
  static async crear({ idApartamento, fechaReserva }) {
    const [resultado] = await poolConexion.query(
      'INSERT INTO reservas (id_apartamento, fecha_reserva, estado) VALUES (?, ?, "activa")',
      [idApartamento, fechaReserva]
    );
    return resultado;
  }

  static async cancelar(idReserva) {
    const [resultado] = await poolConexion.query(
      'UPDATE reservas SET estado = "cancelada" WHERE id_reserva = ?',
      [idReserva]
    );
    return resultado;
  }

  static async aprobar(idReserva) {
    const [resultado] = await poolConexion.query(
      'UPDATE reservas SET estado = "aprobada" WHERE id_reserva = ? AND estado = "activa"',
      [idReserva]
    );
    if (resultado.affectedRows === 0) {
      throw new Error('Reserva no encontrada o ya procesada');
    }
    return resultado;
  }

  static async rechazar(idReserva) {
    const [resultado] = await poolConexion.query(
      'UPDATE reservas SET estado = "rechazada" WHERE id_reserva = ? AND estado = "activa"',
      [idReserva]
    );
    if (resultado.affectedRows === 0) {
      throw new Error('Reserva no encontrada o ya procesada');
    }
    return resultado;
  }
}

module.exports = ModeloReserva;
