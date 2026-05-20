const express = require('express');
const cors = require('cors');
require('dotenv').config();

const { verificarConexion } = require('./config/baseDatos');
const manejoErrores = require('./middlewares/manejoErrores');

// Importar rutas
const rutasAutenticacion = require('./routes/rutasAutenticacion');
const rutasUsuarios = require('./routes/rutasUsuarios');
const rutasInventario = require('./routes/rutasInventario');
const rutasPrestamos = require('./routes/rutasPrestamos');
const rutasReservas = require('./routes/rutasReservas');
const rutasNotificaciones = require('./routes/rutasNotificaciones');

const app = express();
const PUERTO = process.env.PORT || 5000;

// Middlewares globales
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rutas de la API
app.use('/api/auth', rutasAutenticacion);
app.use('/api/usuarios', rutasUsuarios);
app.use('/api/inventario', rutasInventario);
app.use('/api/prestamos', rutasPrestamos);
app.use('/api/reservas', rutasReservas);
app.use('/api/notificaciones', rutasNotificaciones);

// Ruta de verificación
app.get('/api/salud', (req, res) => {
  res.json({ exito: true, mensaje: 'Servidor funcionando correctamente' });
});

// Middleware de manejo de errores
app.use(manejoErrores);

// Iniciar servidor
const iniciarServidor = async () => {
  await verificarConexion();
  app.listen(PUERTO, () => {
    console.log(`🚀 Servidor ejecutándose en http://localhost:${PUERTO}`);
    console.log(`📡 API disponible en http://localhost:${PUERTO}/api`);
  });
};

iniciarServidor();