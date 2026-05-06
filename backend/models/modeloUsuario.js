const { poolConexion } = require('../config/baseDatos'); //C4

// OBTENER USUARIOS -
const ModeloUsuario = {
  obtenerTodos: async () => {
    const [filas] = await poolConexion.query(
      'SELECT id_apartamento, nombre_titular, correo, rol, estado, fecha_registro FROM usuarios ORDER BY id_apartamento'
    );
    return filas;
  },

//OBTENER USUARIOS POR ID -
  obtenerPorId: async (idApartamento) => {
    const [filas] = await poolConexion.query(
      'SELECT id_apartamento, nombre_titular, correo, rol, estado, fecha_registro FROM usuarios WHERE id_apartamento = ?',
      [idApartamento]
    );
    return filas[0] || null;
  },

  obtenerPorCorreo: async (correo) => {
    const [filas] = await poolConexion.query(
      'SELECT * FROM usuarios WHERE correo = ?',
      [correo]
    );
    return filas[0] || null;
  },

  obtenerParaLogin: async (idApartamento) => {
    const [filas] = await poolConexion.query(
      'SELECT * FROM usuarios WHERE id_apartamento = ?',
      [idApartamento]
    );
    return filas[0] || null;
  },

// CREAR USUARIOS -
  crear: async (datosUsuario) => {
    const { idApartamento, nombreTitular, correo, contrasena, rol } = datosUsuario;
    const [resultado] = await poolConexion.query(
      'INSERT INTO usuarios (id_apartamento, nombre_titular, correo, contrasena, rol, estado) VALUES (?, ?, ?, ?, ?, 1)',
      [idApartamento, nombreTitular, correo, contrasena, rol || 'residente']
    );
    return resultado;
  },

//ACTUALIZAR USUARIOS -
  actualizar: async (idApartamento, datosUsuario) => {
    const { nombreTitular, correo, rol } = datosUsuario;
    const [resultado] = await poolConexion.query(
      'UPDATE usuarios SET nombre_titular = ?, correo = ?, rol = ? WHERE id_apartamento = ?',
      [nombreTitular, correo, rol, idApartamento]
    );
    return resultado;
  },

  actualizarContrasena: async (idApartamento, contrasenaHash) => {
    const [resultado] = await poolConexion.query(
      'UPDATE usuarios SET contrasena = ? WHERE id_apartamento = ?',
      [contrasenaHash, idApartamento]
    );
    return resultado;
  },

  cambiarEstado: async (idApartamento, nuevoEstado) => {
    const [resultado] = await poolConexion.query(
      'UPDATE usuarios SET estado = ? WHERE id_apartamento = ?',
      [nuevoEstado, idApartamento]
    );
    return resultado;
  },

  contarPorEstado: async () => {
    const [filas] = await poolConexion.query(
      'SELECT estado, COUNT(*) as cantidad FROM usuarios GROUP BY estado'
    );
    return filas;
  },

  contarTotal: async () => {
    const [filas] = await poolConexion.query('SELECT COUNT(*) as total FROM usuarios');
    return filas[0].total;
  },
};

module.exports = ModeloUsuario;