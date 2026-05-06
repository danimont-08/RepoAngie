const { poolConexion } = require('../config/baseDatos');

//OBTENER INSUMOS C2
const ModeloInventario = {
  obtenerTodos: async () => {
    const [filas] = await poolConexion.query(
      'SELECT * FROM inventario ORDER BY nombre_insumo'
    );
    return filas;
  },

  obtenerPorId: async (idInventario) => {
    const [filas] = await poolConexion.query(
      'SELECT * FROM inventario WHERE id_inventario = ?',
      [idInventario]
    );
    return filas[0] || null;
  },

// CREAR INSUMOS -
  crear: async (datosInsumo) => {
    const { nombreInsumo, cantidadTotal, cantidadDisponible } = datosInsumo;
    const [resultado] = await poolConexion.query(
      'INSERT INTO inventario (nombre_insumo, cantidad_total, cantidad_disponible) VALUES (?, ?, ?)',
      [nombreInsumo, cantidadTotal, cantidadDisponible]
    );
    return resultado;
  },

// ACTUALIZAR INSUMOS -
  actualizar: async (idInventario, datosInsumo) => {
    const { nombreInsumo, cantidadTotal, cantidadDisponible } = datosInsumo;
    const [resultado] = await poolConexion.query(
      'UPDATE inventario SET nombre_insumo = ?, cantidad_total = ?, cantidad_disponible = ? WHERE id_inventario = ?',
      [nombreInsumo, cantidadTotal, cantidadDisponible, idInventario]
    );
    return resultado;
  },

  eliminar: async (idInventario) => {
    const [resultado] = await poolConexion.query(
      'DELETE FROM inventario WHERE id_inventario = ?',
      [idInventario]
    );
    return resultado;
  },

  contarTotal: async () => {
    const [filas] = await poolConexion.query('SELECT COUNT(*) as total FROM inventario');
    return filas[0].total;
  },
};

module.exports = ModeloInventario;