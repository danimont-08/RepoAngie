const bcrypt = require('bcrypt');
const ModeloUsuario = require('../models/modeloUsuario');

const SALT_ROUNDS = 10; //C4

const ControladorUsuarios = {
  obtenerTodos: async (req, res) => {
    try {
      const usuarios = await ModeloUsuario.obtenerTodos();
      return res.json({ exito: true, datos: usuarios });
    } catch (error) {
      console.error('Error obteniendo usuarios:', error);
      return res.status(500).json({ exito: false, mensaje: 'Error al obtener usuarios' });
    }
  },

  obtenerPorId: async (req, res) => {
    try {
      const { idApartamento } = req.params;
      const usuario = await ModeloUsuario.obtenerPorId(idApartamento);

      if (!usuario) {
        return res.status(404).json({ exito: false, mensaje: 'Usuario no encontrado' });
      }

      return res.json({ exito: true, datos: usuario });
    } catch (error) {
      console.error('Error obteniendo usuario:', error);
      return res.status(500).json({ exito: false, mensaje: 'Error al obtener usuario' });
    }
  },

//CREAR USUARIOS -
  crear: async (req, res) => {
    try {
      const { idApartamento, nombreTitular, correo, contrasena, rol } = req.body;

      if (!idApartamento || !nombreTitular || !correo || !contrasena) {
        return res.status(400).json({
          exito: false,
          mensaje: 'Todos los campos son obligatorios',
        });
      }

      const existente = await ModeloUsuario.obtenerPorId(idApartamento);
      if (existente) {
        return res.status(409).json({
          exito: false,
          mensaje: 'Ya existe un usuario registrado para este apartamento',
        });
      }

      const contrasenaHash = await bcrypt.hash(contrasena, SALT_ROUNDS);

//FUNCIÓN CREAR MODELO -
      await ModeloUsuario.crear({
        idApartamento,
        nombreTitular,
        correo,
        contrasena: contrasenaHash,
        rol: rol || 'residente',
      });

      return res.status(201).json({
        exito: true,
        mensaje: 'Usuario creado correctamente',
      });
    } catch (error) {
      console.error('Error creando usuario:', error);
      if (error.code === 'ER_DUP_ENTRY') {
        return res.status(409).json({ exito: false, mensaje: 'El correo ya está registrado' });
      }
      return res.status(500).json({ exito: false, mensaje: 'Error al crear usuario' });
    }
  },

//ACTUALIZAR USUARIOS -
  actualizar: async (req, res) => {
    try {
      const { idApartamento } = req.params;
      const { nombreTitular, correo, rol, contrasena } = req.body;

      const existente = await ModeloUsuario.obtenerPorId(idApartamento);
      if (!existente) {
        return res.status(404).json({ exito: false, mensaje: 'Usuario no encontrado' });
      }

//ACTUALIZAR USUARIOS MODELO -     
      await ModeloUsuario.actualizar(idApartamento, {
        nombreTitular: nombreTitular || existente.nombre_titular,
        correo: correo || existente.correo,
        rol: rol || existente.rol,
      });

      if (contrasena && contrasena.trim()) {
        const contrasenaHash = await bcrypt.hash(contrasena, SALT_ROUNDS);
        await ModeloUsuario.actualizarContrasena(idApartamento, contrasenaHash);
      }

      return res.json({ exito: true, mensaje: 'Usuario actualizado correctamente' });
    } catch (error) {
      console.error('Error actualizando usuario:', error);
      if (error.code === 'ER_DUP_ENTRY') {
        return res.status(409).json({ exito: false, mensaje: 'El correo ya está registrado' });
      }
      return res.status(500).json({ exito: false, mensaje: 'Error al actualizar usuario' });
    }
  },

  cambiarEstado: async (req, res) => {
    try {
      const { idApartamento } = req.params;
      const { estado } = req.body;

      const existente = await ModeloUsuario.obtenerPorId(idApartamento);
      if (!existente) {
        return res.status(404).json({ exito: false, mensaje: 'Usuario no encontrado' });
      }

      const nuevoEstado = estado !== undefined ? estado : (existente.estado ? 0 : 1);
      await ModeloUsuario.cambiarEstado(idApartamento, nuevoEstado);

      const etiquetaEstado = nuevoEstado ? 'activado' : 'desactivado';
      return res.json({
        exito: true,
        mensaje: `Usuario ${etiquetaEstado} correctamente`,
      });
    } catch (error) {
      console.error('Error cambiando estado:', error);
      return res.status(500).json({ exito: false, mensaje: 'Error al cambiar estado' });
    }
  },

  obtenerEstadisticas: async (req, res) => {
    try {
      const totalUsuarios = await ModeloUsuario.contarTotal();
      const estadosCuenta = await ModeloUsuario.contarPorEstado();

      let activos = 0;
      let inactivos = 0;
      estadosCuenta.forEach((fila) => {
        if (fila.estado === 1) activos = fila.cantidad;
        else inactivos = fila.cantidad;
      });

      return res.json({
        exito: true,
        datos: { totalUsuarios, activos, inactivos },
      });
    } catch (error) {
      console.error('Error obteniendo estadísticas:', error);
      return res.status(500).json({ exito: false, mensaje: 'Error al obtener estadísticas' });
    }
  },
};

module.exports = ControladorUsuarios;