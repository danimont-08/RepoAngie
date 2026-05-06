const ModeloInventario = require('../models/modeloInventario');
//C3
const ControladorInventario = {
  obtenerTodos: async (req, res) => {
    try {
      const insumos = await ModeloInventario.obtenerTodos();
      return res.json({ exito: true, datos: insumos });
    } catch (error) {
      console.error('Error obteniendo inventario:', error);
      return res.status(500).json({ exito: false, mensaje: 'Error al obtener inventario' });
    }
  },

  obtenerPorId: async (req, res) => {
    try {
      const { idInventario } = req.params;
      const insumo = await ModeloInventario.obtenerPorId(idInventario);

      if (!insumo) {
        return res.status(404).json({ exito: false, mensaje: 'Insumo no encontrado' });
      }

      return res.json({ exito: true, datos: insumo });
    } catch (error) {
      console.error('Error obteniendo insumo:', error);
      return res.status(500).json({ exito: false, mensaje: 'Error al obtener insumo' });
    }
  },

//CREAR INSUMOS -
  crear: async (req, res) => {
    try {
      const { nombreInsumo, cantidadTotal, cantidadDisponible } = req.body;

      if (!nombreInsumo || cantidadTotal === undefined || cantidadDisponible === undefined) {
        return res.status(400).json({
          exito: false,
          mensaje: 'Todos los campos son obligatorios',
        });
      }

      if (cantidadTotal < 0 || cantidadDisponible < 0) {
        return res.status(400).json({
          exito: false,
          mensaje: 'Las cantidades no pueden ser negativas',
        });
      }

      if (cantidadDisponible > cantidadTotal) {
        return res.status(400).json({
          exito: false,
          mensaje: 'La cantidad disponible no puede ser mayor que la cantidad total',
        });
      }

//FUNCIÓN CREAR MODELO -
      await ModeloInventario.crear({ nombreInsumo, cantidadTotal, cantidadDisponible });

      return res.status(201).json({
        exito: true,
        mensaje: 'Insumo creado correctamente',
      });
    } catch (error) {
      console.error('Error creando insumo:', error);
      return res.status(500).json({ exito: false, mensaje: 'Error al crear insumo' });
    }
  },

//FUNCIÓN ACTUALIZAR -
  actualizar: async (req, res) => {
    try {
      const { idInventario } = req.params;
      const { nombreInsumo, cantidadTotal, cantidadDisponible } = req.body;

      const existente = await ModeloInventario.obtenerPorId(idInventario);
      if (!existente) {
        return res.status(404).json({ exito: false, mensaje: 'Insumo no encontrado' });
      }

      const totalFinal = cantidadTotal !== undefined ? cantidadTotal : existente.cantidad_total;
      const disponibleFinal = cantidadDisponible !== undefined ? cantidadDisponible : existente.cantidad_disponible;

      if (totalFinal < 0 || disponibleFinal < 0) {
        return res.status(400).json({
          exito: false,
          mensaje: 'Las cantidades no pueden ser negativas',
        });
      }

      if (disponibleFinal > totalFinal) {
        return res.status(400).json({
          exito: false,
          mensaje: 'La cantidad disponible no puede ser mayor que la cantidad total',
        });
      }

//FUNCIÓN ACTUALIZAR MODELO -
      await ModeloInventario.actualizar(idInventario, {
        nombreInsumo: nombreInsumo || existente.nombre_insumo,
        cantidadTotal: totalFinal,
        cantidadDisponible: disponibleFinal,
      });

      return res.json({ exito: true, mensaje: 'Insumo actualizado correctamente' });
    } catch (error) {
      console.error('Error actualizando insumo:', error);
      return res.status(500).json({ exito: false, mensaje: 'Error al actualizar insumo' });
    }
  },

  eliminar: async (req, res) => {
    try {
      const { idInventario } = req.params;

      const existente = await ModeloInventario.obtenerPorId(idInventario);
      if (!existente) {
        return res.status(404).json({ exito: false, mensaje: 'Insumo no encontrado' });
      }

      await ModeloInventario.eliminar(idInventario);

      return res.json({ exito: true, mensaje: 'Insumo eliminado correctamente' });
    } catch (error) {
      console.error('Error eliminando insumo:', error);
      return res.status(500).json({ exito: false, mensaje: 'Error al eliminar insumo' });
    }
  },

  obtenerEstadisticas: async (req, res) => {
    try {
      const totalInsumos = await ModeloInventario.contarTotal();
      return res.json({ exito: true, datos: { totalInsumos } });
    } catch (error) {
      console.error('Error obteniendo estadísticas:', error);
      return res.status(500).json({ exito: false, mensaje: 'Error al obtener estadísticas' });
    }
  },
};

module.exports = ControladorInventario;