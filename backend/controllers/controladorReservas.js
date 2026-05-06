const ModeloReserva = require('../models/modeloReserva');

const controladorReservas = { //C2
  obtenerTodas: async (req, res) => {
    try {
      const reservas = await ModeloReserva.obtenerTodas();
      res.json({ exito: true, datos: reservas });
    } catch (error) {
      console.error('Error al obtener reservas:', error);
      res.status(500).json({ exito: false, mensaje: 'Error interno del servidor' });
    }
  },

  obtenerPorMes: async (req, res) => {
    try {
      const { year, month } = req.query;
      if (!year || !month) return res.status(400).json({ mensaje: 'Faltan parámetros year y month' });
      
      const reservas = await ModeloReserva.obtenerPorMes(parseInt(year), parseInt(month));
      res.json({ exito: true, datos: reservas });
    } catch (error) {
      console.error('Error al obtener reservas por mes:', error);
      res.status(500).json({ exito: false, mensaje: 'Error interno del servidor' });
    }
  },

  obtenerMisReservas: async (req, res) => {
    try {
      const idApartamento = req.usuario.idApartamento;
      const reservas = await ModeloReserva.obtenerPorUsuario(idApartamento);
      res.json({ exito: true, datos: reservas });
    } catch (error) {
      console.error('Error al obtener reservas del usuario:', error);
      res.status(500).json({ exito: false, mensaje: 'Error interno del servidor' });
    }
  },

//CREAR RESERVA -
  crear: async (req, res) => {
    try {
      const { fecha_reserva } = req.body; //TOKEN
      let id_apartamento = req.body.id_apartamento;
      if (req.usuario.rol === 'residente') {
        id_apartamento = req.usuario.idApartamento;
      }

      if (!id_apartamento || !fecha_reserva) {
        return res.status(400).json({ exito: false, mensaje: 'Faltan campos requeridos' });
      }

      // Validar anticipación mínima de 48 horas
      const ahora = new Date();
      const fechaReq = new Date(fecha_reserva + 'T00:00:00');
      const diferenciaMs = fechaReq.getTime() - ahora.getTime();
      const horasDeAnticipacion = diferenciaMs / (1000 * 60 * 60);

      if (horasDeAnticipacion < 48) {
        return res.status(400).json({
          exito: false,
          mensaje: 'Las reservas deben hacerse con al menos 48 horas de anticipación.',
        });
      }

      // MÁXIMO 90 DÍAS DE ANTICIPACIÓN
      const limiteMaximo = new Date();
      limiteMaximo.setDate(limiteMaximo.getDate() + 90);
      limiteMaximo.setHours(23, 59, 59, 999);

      if (fechaReq > limiteMaximo) {
        return res.status(400).json({
          exito: false,
          mensaje: 'No puedes reservar con más de 90 días de anticipación.',
        });
      }

      // VALIDAR DISPONIBILIDAD DE LA FECHA
      const disponible = await ModeloReserva.verificarDisponibilidad(fecha_reserva);
      if (!disponible) {
        return res.status(400).json({ exito: false, mensaje: 'Esa fecha ya se encuentra reservada. Por favor, elige otra.' });
      }

      // RESTRICCIÓN: VALIDAR QUE NO TENGA OTRA RESERVA ACTIVA EN VIGENCIA
      const yaHayReservaActiva = await ModeloReserva.tieneReservaActivaVigente(id_apartamento);
      if (yaHayReservaActiva) {
        return res.status(400).json({ 
          exito: false, 
          mensaje: 'Ya tienes una reserva activa o aprobada en vigencia. Solo puedes tener una reserva activa a la vez.' 
        });
      }

//FUNCIÓN CREAR RESERVA -
      const resultado = await ModeloReserva.crear({
        idApartamento: id_apartamento,
        fechaReserva: fecha_reserva
      });

      res.status(201).json({ 
        exito: true, 
        mensaje: 'Reserva creada exitosamente. Queda pendiente de aprobación por el administrador.',
        id_reserva: resultado.insertId 
      });
    } catch (error) {
      console.error('Error al crear reserva:', error);
      if (error.code === 'ER_DUP_ENTRY') {
         return res.status(400).json({ exito: false, mensaje: 'Esa fecha ya se encuentra reservada.' });
      }
      res.status(500).json({ exito: false, mensaje: 'Error interno del servidor al crear reserva' });
    }
  },

  cancelar: async (req, res) => {
    try {
      const { id } = req.params;
      
      // Verificar pertenencia si es residente
      const reservas = await ModeloReserva.obtenerPorUsuario(req.usuario.idApartamento);
      const reserva = (req.usuario.rol === 'administrador' || req.usuario.rol === 'supervisor') 
        ? true
        : reservas.find(r => r.id_reserva === parseInt(id));

      if (!reserva) {
        return res.status(403).json({ exito: false, mensaje: 'No tienes permiso para cancelar esta reserva' });
      }

      await ModeloReserva.cancelar(id);
      res.json({ exito: true, mensaje: 'Reserva cancelada correctamente' });
    } catch (error) {
      console.error('Error al cancelar reserva:', error);
      res.status(500).json({ exito: false, mensaje: 'Error al procesar la cancelación' });
    }
  },

  aprobar: async (req, res) => {
    try {
      const { id } = req.params;
      await ModeloReserva.aprobar(id);
      res.json({ exito: true, mensaje: 'Reserva aprobada correctamente' });
    } catch (error) {
      console.error('Error al aprobar reserva:', error);
      if (error.message.includes('no encontrada') || error.message.includes('ya procesada')) {
        return res.status(400).json({ exito: false, mensaje: error.message });
      }
      res.status(500).json({ exito: false, mensaje: 'Error al aprobar la reserva' });
    }
  },

  rechazar: async (req, res) => {
    try {
      const { id } = req.params;
      await ModeloReserva.rechazar(id);
      res.json({ exito: true, mensaje: 'Reserva rechazada correctamente' });
    } catch (error) {
      console.error('Error al rechazar reserva:', error);
      if (error.message.includes('no encontrada') || error.message.includes('ya procesada')) {
        return res.status(400).json({ exito: false, mensaje: error.message });
      }
      res.status(500).json({ exito: false, mensaje: 'Error al rechazar la reserva' });
    }
  },
};

module.exports = controladorReservas;
