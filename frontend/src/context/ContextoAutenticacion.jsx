import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { servicioAuth } from '../services/servicioApi';

const ContextoAutenticacion = createContext(null);

export function ProveedorAutenticacion({ children }) {
  const [usuario, setUsuario] = useState(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    // Usamos sessionStorage: se borra automáticamente al cerrar la pestaña/ventana
    const verificarSesion = async () => {
      const token = sessionStorage.getItem('token_salon');
      const usuarioGuardado = sessionStorage.getItem('usuario_salon');

      if (token && usuarioGuardado) {
        try {
          const respuesta = await servicioAuth.verificarToken();
          if (respuesta.data.exito) {
            setUsuario(respuesta.data.usuario);
          } else {
            limpiarSesion();
          }
        } catch {
          limpiarSesion();
        }
      }
      setCargando(false);
    };
    verificarSesion();
  }, []);

  const limpiarSesion = () => {
    sessionStorage.removeItem('token_salon');
    sessionStorage.removeItem('usuario_salon');
    setUsuario(null);
  };

  const iniciarSesion = useCallback(async (idApartamento, contrasena) => {
    try {
      const respuesta = await servicioAuth.iniciarSesion(idApartamento, contrasena);
      const datos = respuesta.data;

      if (datos.exito) {
        sessionStorage.setItem('token_salon', datos.token);
        sessionStorage.setItem('usuario_salon', JSON.stringify(datos.usuario));
        setUsuario(datos.usuario);
        return { exito: true, mensaje: datos.mensaje };
      }
      return { exito: false, mensaje: 'Credenciales incorrectas' };
    } catch (error) {
      const mensaje = error.response?.data?.mensaje || 'Error al iniciar sesión';
      return { exito: false, mensaje };
    }
  }, []);

  const cerrarSesion = useCallback(() => {
    limpiarSesion();
  }, []);

  const esAdmin = usuario?.rol === 'administrador';
  const esSupervisor = usuario?.rol === 'supervisor';
  const esResidente = usuario?.rol === 'residente';

  return (
    <ContextoAutenticacion.Provider
      value={{ usuario, cargando, iniciarSesion, cerrarSesion, esAdmin, esSupervisor, esResidente }}
    >
      {children}
    </ContextoAutenticacion.Provider>
  );
}

export function useAuth() {
  const contexto = useContext(ContextoAutenticacion);
  if (!contexto) {
    throw new Error('useAuth debe usarse dentro de ProveedorAutenticacion');
  }
  return contexto;
}