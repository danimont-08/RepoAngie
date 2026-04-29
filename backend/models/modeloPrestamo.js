const { poolConexion } = require('../config/baseDatos');

/**
 * Modelo de Préstamos de Insumos
 * Tabla: prestamos_insumos
 * Columnas exactas: id_prestamo, id_apartamento, id_reserva, id_inventario,
 *                   cantidad, fecha_prestamo, fecha_espera, nombre_insumo
 *
 * Lógica de estado:
 *   - Un préstamo existe => insumo actualmente prestado
 *   - Al devolver el insumo => el registro se ELIMINA y el inventario se restaura
 */
const ModeloPrestamo = {

  // ─── Obtener todos (admin/supervisor) ────────────────────────────────────
  obtenerTodos: async () => {
    const [filas] = await poolConexion.query(`
      SELECT
        p.id_prestamo,
        p.id_apartamento,
        p.id_reserva,
        p.id_inventario,
        p.cantidad,
        p.fecha_prestamo,
        p.fecha_espera,
        p.nombre_insumo,
        u.nombre_titular
      FROM prestamos_insumos p
      JOIN usuarios u ON p.id_apartamento = u.id_apartamento
      ORDER BY p.fecha_prestamo DESC
    `);
    return filas;
  },

  // ─── Obtener por usuario (residente) ─────────────────────────────────────
  obtenerPorUsuario: async (idApartamento) => {
    const [filas] = await poolConexion.query(`
      SELECT
        p.id_prestamo,
        p.id_apartamento,
        p.id_reserva,
        p.id_inventario,
        p.cantidad,
        p.fecha_prestamo,
        p.fecha_espera,
        p.nombre_insumo
      FROM prestamos_insumos p
      WHERE p.id_apartamento = ?
      ORDER BY p.fecha_prestamo DESC
    `, [idApartamento]);
    return filas;
  },

  // ─── Crear / actualizar préstamo (UPSERT) + ajustar inventario ───────────
  // Si ya existe un registro para el mismo apartamento + insumo + fecha,
  // se actualiza la cantidad en lugar de insertar un duplicado.
  crear: async ({ idApartamento, idReserva, idInventario, cantidad, fechaPrestamo, fechaEspera }) => {
    const conexion = await poolConexion.getConnection();
    try {
      await conexion.beginTransaction();

      // 1. Bloquear fila de inventario y obtener datos
      const [inventario] = await conexion.query(
        'SELECT cantidad_disponible, nombre_insumo FROM inventario WHERE id_inventario = ? FOR UPDATE',
        [idInventario]
      );

      if (inventario.length === 0) {
        throw new Error('Insumo no encontrado en el inventario');
      }

      const nombreInsumo        = inventario[0].nombre_insumo;
      const soloFecha           = String(fechaPrestamo).slice(0, 10); // 'YYYY-MM-DD'

      // 2. Verificar si ya existe un préstamo para (apartamento + insumo + fecha)
      const [existentes] = await conexion.query(
        `SELECT id_prestamo, cantidad
         FROM prestamos_insumos
         WHERE id_apartamento = ?
           AND id_inventario  = ?
           AND DATE(fecha_prestamo) = ?
         LIMIT 1`,
        [idApartamento, idInventario, soloFecha]
      );

      let resultado;
      let actualizado = false;

      if (existentes.length > 0) {
        // ── UPSERT: actualizar registro existente ──────────────────────────
        const { id_prestamo, cantidad: cantidadAnterior } = existentes[0];
        const diferencia = cantidad - cantidadAnterior; // puede ser negativa (reducción)

        // Verificar que haya stock suficiente para la diferencia positiva
        if (diferencia > 0 && inventario[0].cantidad_disponible < diferencia) {
          throw new Error('Cantidad insuficiente en inventario');
        }

        // Ajustar inventario solo en la diferencia
        if (diferencia !== 0) {
          await conexion.query(
            'UPDATE inventario SET cantidad_disponible = cantidad_disponible - ? WHERE id_inventario = ?',
            [diferencia, idInventario]
          );
        }

        // Actualizar el préstamo existente con la nueva cantidad e id_reserva
        await conexion.query(
          `UPDATE prestamos_insumos
           SET cantidad = ?, id_reserva = ?, fecha_espera = ?
           WHERE id_prestamo = ?`,
          [cantidad, idReserva, fechaEspera, id_prestamo]
        );

        resultado  = { insertId: id_prestamo };
        actualizado = true;

      } else {
        // ── INSERT normal ──────────────────────────────────────────────────
        if (inventario[0].cantidad_disponible < cantidad) {
          throw new Error('Cantidad insuficiente en inventario');
        }

        await conexion.query(
          'UPDATE inventario SET cantidad_disponible = cantidad_disponible - ? WHERE id_inventario = ?',
          [cantidad, idInventario]
        );

        const [res] = await conexion.query(
          `INSERT INTO prestamos_insumos
             (id_apartamento, id_reserva, id_inventario, cantidad, fecha_prestamo, fecha_espera, nombre_insumo)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [idApartamento, idReserva, idInventario, cantidad, fechaPrestamo, fechaEspera, nombreInsumo]
        );

        resultado = res;
      }

      await conexion.commit();
      return { ...resultado, actualizado };
    } catch (error) {
      await conexion.rollback();
      throw error;
    } finally {
      conexion.release();
    }
  },

  // ─── Devolver insumo: eliminar registro + restaurar inventario ────────────
  devolver: async (idPrestamo) => {
    const conexion = await poolConexion.getConnection();
    try {
      await conexion.beginTransaction();

      // 1. Obtener datos del préstamo antes de eliminarlo
      const [prestamos] = await conexion.query(
        'SELECT id_inventario, cantidad FROM prestamos_insumos WHERE id_prestamo = ? FOR UPDATE',
        [idPrestamo]
      );

      if (prestamos.length === 0) {
        throw new Error('Préstamo no encontrado');
      }

      const { id_inventario, cantidad } = prestamos[0];

      // 2. Restaurar inventario
      await conexion.query(
        'UPDATE inventario SET cantidad_disponible = cantidad_disponible + ? WHERE id_inventario = ?',
        [cantidad, id_inventario]
      );

      // 3. Eliminar el registro del préstamo
      const [resultado] = await conexion.query(
        'DELETE FROM prestamos_insumos WHERE id_prestamo = ?',
        [idPrestamo]
      );

      await conexion.commit();
      return resultado;
    } catch (error) {
      await conexion.rollback();
      throw error;
    } finally {
      conexion.release();
    }
  }
};

module.exports = ModeloPrestamo;
