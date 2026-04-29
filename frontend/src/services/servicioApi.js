import axios from 'axios';

const apiCliente = axios.create({
  baseURL: 'http://localhost:5000/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para agregar token a cada petición (sessionStorage)
apiCliente.interceptors.request.use(
  (config) => {
    const token = sessionStorage.getItem('token_salon');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptor de respuesta: si 401 → sesión inválida → limpiar y redirigir al login
apiCliente.interceptors.response.use(
  (respuesta) => respuesta,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Solo redirigir si no estamos ya en la pantalla de login
      if (!window.location.pathname.includes('/login')) {
        sessionStorage.removeItem('token_salon');
        sessionStorage.removeItem('usuario_salon');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// ==================== AUTENTICACIÓN ====================
export const servicioAuth = {
  iniciarSesion: (idApartamento, contrasena) =>
    apiCliente.post('/auth/login', { idApartamento, contrasena }),

  verificarToken: () =>
    apiCliente.get('/auth/verificar'),
};

// ==================== USUARIOS ====================
export const servicioUsuarios = {
  obtenerTodos: () =>
    apiCliente.get('/usuarios'),

  obtenerPorId: (idApartamento) =>
    apiCliente.get(`/usuarios/${idApartamento}`),

  crear: (datosUsuario) =>
    apiCliente.post('/usuarios', datosUsuario),

  actualizar: (idApartamento, datosUsuario) =>
    apiCliente.put(`/usuarios/${idApartamento}`, datosUsuario),

  cambiarEstado: (idApartamento, estado) =>
    apiCliente.patch(`/usuarios/${idApartamento}/estado`, { estado }),

  obtenerEstadisticas: () =>
    apiCliente.get('/usuarios/estadisticas'),
};

// ==================== INVENTARIO ====================
export const servicioInventario = {
  obtenerTodos: () =>
    apiCliente.get('/inventario'),

  obtenerPorId: (idInventario) =>
    apiCliente.get(`/inventario/${idInventario}`),

  crear: (datosInsumo) =>
    apiCliente.post('/inventario', datosInsumo),

  actualizar: (idInventario, datosInsumo) =>
    apiCliente.put(`/inventario/${idInventario}`, datosInsumo),

  eliminar: (idInventario) =>
    apiCliente.delete(`/inventario/${idInventario}`),

  obtenerEstadisticas: () =>
    apiCliente.get('/inventario/estadisticas'),
};

export default apiCliente;