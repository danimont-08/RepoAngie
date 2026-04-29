const express = require('express');
const router = express.Router();
const controladorReservas = require('../controllers/controladorReservas');
const { verificarToken, verificarRol } = require('../middlewares/autenticacion');

// Todas las rutas requieren autenticación
router.use(verificarToken);

// Rutas generales
router.get('/', verificarRol('administrador', 'supervisor'), controladorReservas.obtenerTodas);
router.get('/mes', controladorReservas.obtenerPorMes);
router.get('/mias', controladorReservas.obtenerMisReservas);
// Solo admin y residente pueden crear reservas (supervisor no)
router.post('/', verificarRol('administrador', 'residente'), controladorReservas.crear);
router.put('/:id/cancelar', controladorReservas.cancelar);

// Rutas de aprobación (solo administrador)
router.put('/:id/aprobar', verificarRol('administrador'), controladorReservas.aprobar);
router.put('/:id/rechazar', verificarRol('administrador'), controladorReservas.rechazar);

module.exports = router;
