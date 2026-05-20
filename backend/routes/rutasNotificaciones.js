const express = require('express');
const router = express.Router();
const controladorNotificaciones = require('../controllers/controladorNotificaciones');
const { verificarToken } = require('../middlewares/autenticacion');

// Todas las rutas requieren token de autenticación
router.use(verificarToken);

router.get('/', controladorNotificaciones.obtenerMisNotificaciones);
router.put('/:id/leer', controladorNotificaciones.marcarLeida);
router.delete('/:id', controladorNotificaciones.eliminarNotificacion);

module.exports = router;
