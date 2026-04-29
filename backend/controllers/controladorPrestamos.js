const ModeloPrestamo  = require('../models/modeloPrestamo');
const ModeloReserva   = require('../models/modeloReserva');
const { poolConexion } = require('../config/baseDatos');

const controladorPrestamos = {

  // ──────────── GET /prestamos  (admin / supervisor) ────────────────────────
  obtenerTodos: async (req, res) => {
    try {
      const prestamos = await ModeloPrestamo.obtenerTodos();
      res.json({ exito: true, datos: prestamos });
    } catch (error) {
      console.error('Error al obtener préstamos:', error);
      res.status(500).json({ exito: false, mensaje: 'Error interno del servidor' });
    }
  },

  // ──────────── GET /prestamos/mis-prestamos  (residente) ───────────────────
  obtenerMisPrestamos: async (req, res) => {
    try {
      const idApartamento = req.usuario.idApartamento;
      const prestamos = await ModeloPrestamo.obtenerPorUsuario(idApartamento);
      res.json({ exito: true, datos: prestamos });
    } catch (error) {
      console.error('Error al obtener préstamos del usuario:', error);
      res.status(500).json({ exito: false, mensaje: 'Error interno del servidor' });
    }
  },

  // ──────────── POST /prestamos  ────────────────────────────────────────────
  crear: async (req, res) => {
    try {
      const { id_inventario, cantidad, id_reserva } = req.body;

      // El id_apartamento siempre viene del token para residentes
      let id_apartamento = req.body.id_apartamento;
      if (req.usuario.rol === 'residente') {
        id_apartamento = req.usuario.idApartamento;
      }

      // Validaciones básicas
      if (!id_apartamento || !id_inventario || !cantidad || !id_reserva) {
        return res.status(400).json({
          exito: false,
          mensaje: 'Faltan campos requeridos: id_apartamento, id_inventario, cantidad, id_reserva.'
        });
      }

      // Obtener la fecha_reserva de la reserva indicada para usar como fecha_prestamo
      const [filaReserva] = await poolConexion.query(
        'SELECT id_reserva, fecha_reserva, estado, id_apartamento FROM reservas WHERE id_reserva = ?',
        [id_reserva]
      );

      if (filaReserva.length === 0) {
        return res.status(400).json({ exito: false, mensaje: 'La reserva indicada no existe.' });
      }

      if (filaReserva[0].estado !== 'aprobada') {
        return res.status(400).json({
          exito: false,
          mensaje: 'Solo se pueden solicitar préstamos para reservas con estado APROBADA.'
        });
      }

      // Extraer la fecha de la reserva (llega como string "YYYY-MM-DD" por dateStrings:true).
      const fechaReservaRaw = filaReserva[0].fecha_reserva;
      const soloFecha = String(fechaReservaRaw).slice(0, 10); // "YYYY-MM-DD"

      // fecha_prestamo = día del evento a las 12:00:00 p.m.  (ej: 16 mayo 12:00:00)
      // fecha_espera   = día del evento a las 23:59:59 p.m.  (ej: 16 mayo 23:59:59)
      const fechaPrestamo = `${soloFecha} 12:00:00`;
      const fechaEspera   = `${soloFecha} 23:59:59`;

      console.log(`[Préstamo] Reserva #${id_reserva} | Evento: ${soloFecha} | Préstamo: ${fechaPrestamo} | Devolución: ${fechaEspera}`);

      const resultado = await ModeloPrestamo.crear({
        idApartamento: id_apartamento,
        idReserva:     id_reserva,
        idInventario:  id_inventario,
        cantidad:      parseInt(cantidad),
        fechaPrestamo,
        fechaEspera
      });

      const mensajeRespuesta = resultado.actualizado
        ? 'Solicitud actualizada correctamente. La cantidad ha sido reemplazada.'
        : 'Préstamo creado correctamente. El inventario ha sido actualizado.';

      res.status(201).json({
        exito:      true,
        mensaje:    mensajeRespuesta,
        actualizado: resultado.actualizado,
        id_prestamo: resultado.insertId
      });

    } catch (error) {
      console.error('Error al crear préstamo:', error);
      if (error.message === 'Cantidad insuficiente en inventario' ||
          error.message === 'Insumo no encontrado en el inventario') {
        return res.status(400).json({ exito: false, mensaje: error.message });
      }
      res.status(500).json({ exito: false, mensaje: `Error interno: ${error.message}` });
    }
  },

  // ──────────── PUT /prestamos/:id/devolver  ────────────────────────────────
  // Cualquier rol puede marcar una devolución; el registro se elimina y el
  // inventario se restaura.
  devolver: async (req, res) => {
    try {
      const { id } = req.params;
      await ModeloPrestamo.devolver(id);
      res.json({
        exito: true,
        mensaje: 'Insumo devuelto correctamente. El inventario ha sido restaurado.'
      });
    } catch (error) {
      console.error('Error al devolver préstamo:', error);
      if (error.message.includes('no encontrado')) {
        return res.status(404).json({ exito: false, mensaje: error.message });
      }
      res.status(500).json({ exito: false, mensaje: 'Error interno al procesar devolución' });
    }
  }
};

module.exports = controladorPrestamos;
