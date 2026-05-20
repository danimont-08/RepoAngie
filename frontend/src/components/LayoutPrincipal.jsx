import { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/ContextoAutenticacion';
import { servicioNotificaciones } from '../services/servicioNotificaciones';
import './LayoutPrincipal.css';

const reproducirSonidoNotificacion = () => {
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    
    // Tono 1: Agudo y limpio (D5 -> A5)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, ctx.currentTime);
    osc1.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.12);
    
    gain1.gain.setValueAtTime(0.15, ctx.currentTime);
    gain1.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
    
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    
    // Tono 2: Armónico de soporte (A5 -> D6)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(880, ctx.currentTime);
    osc2.frequency.exponentialRampToValueAtTime(1174.66, ctx.currentTime + 0.12);
    
    gain2.gain.setValueAtTime(0.07, ctx.currentTime);
    gain2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.28);
    
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    
    osc1.start();
    osc2.start();
    osc1.stop(ctx.currentTime + 0.35);
    osc2.stop(ctx.currentTime + 0.35);
  } catch (error) {
    console.warn('AudioContext bloqueado por el navegador o no disponible:', error);
  }
};

export default function LayoutPrincipal({ children }) {
  const { usuario, cerrarSesion, esAdmin, esSupervisor } = useAuth();
  const ubicacion = useLocation();
  const [menuAbierto, setMenuAbierto] = useState(false);
  
  // Estados para notificaciones
  const [notificaciones, setNotificaciones] = useState([]);
  const [bandejaAbierta, setBandejaAbierta] = useState(false);

  // Refs para control de reproducción de sonidos
  const countRef = useRef(0);
  const esPrimerCarga = useRef(true);

  const cargarNotificaciones = async () => {
    try {
      if (usuario) {
        const resp = await servicioNotificaciones.obtenerTodas();
        setNotificaciones(resp.data.datos || []);
      }
    } catch (error) {
      console.error('Error cargando notificaciones:', error);
    }
  };

  useEffect(() => {
    cargarNotificaciones();
    // Sondeo de notificaciones cada 5 segundos (tiempo real)
    const interval = setInterval(cargarNotificaciones, 5000);
    return () => clearInterval(interval);
  }, [usuario]);

  // Efecto para monitorear el conteo y reproducir sonido únicamente ante nuevas alertas
  useEffect(() => {
    const sinLeerCount = notificaciones.filter(n => !n.leido).length;
    if (esPrimerCarga.current) {
      countRef.current = sinLeerCount;
      esPrimerCarga.current = false;
    } else if (sinLeerCount > countRef.current) {
      reproducirSonidoNotificacion();
      countRef.current = sinLeerCount;
    } else {
      countRef.current = sinLeerCount;
    }
  }, [notificaciones]);

  const notificacionesSinLeer = notificaciones.filter(n => !n.leido).length;

  const marcarComoLeida = async (id) => {
    try {
      await servicioNotificaciones.marcarLeida(id);
      cargarNotificaciones();
    } catch (error) {
      console.error('Error al marcar leída:', error);
    }
  };

  const marcarTodasComoLeidas = async () => {
    try {
      const sinLeer = notificaciones.filter(n => !n.leido);
      await Promise.all(sinLeer.map(n => servicioNotificaciones.marcarLeida(n.id_notificacion)));
      cargarNotificaciones();
    } catch (error) {
      console.error('Error al marcar todas leídas:', error);
    }
  };

  const eliminarNotificacion = async (id) => {
    try {
      await servicioNotificaciones.eliminar(id);
      cargarNotificaciones();
    } catch (error) {
      console.error('Error al eliminar:', error);
    }
  };

  // Menú diferenciado por rol
  const elementosMenu = [
    { ruta: '/dashboard', etiqueta: 'Panel Principal', icono: 'bi-speedometer2' },
    // Solo admin ve Usuarios
    ...(esAdmin ? [{ ruta: '/usuarios', etiqueta: 'Usuarios', icono: 'bi-people' }] : []),
    // Admin y Supervisor ven Inventario
    ...(esAdmin || esSupervisor ? [{ ruta: '/inventario', etiqueta: 'Inventario', icono: 'bi-box-seam' }] : []),
    // Admin y Residente ven Reservas (Supervisor NO)
    ...(!esSupervisor ? [{ ruta: '/reservas', etiqueta: 'Reservas', icono: 'bi-calendar-event' }] : []),
    // Solo Residente ve Mis Préstamos
    ...(!esAdmin && !esSupervisor ? [{ ruta: '/mis-prestamos', etiqueta: 'Mis Préstamos', icono: 'bi-box-arrow-right' }] : []),
    // Admin y Supervisor ven Reportes
    ...(esAdmin || esSupervisor ? [{ ruta: '/reportes', etiqueta: 'Reportes', icono: 'bi-file-earmark-bar-graph' }] : []),
  ];

  const etiquetaRol = esAdmin ? 'Administrador' : esSupervisor ? 'Supervisor' : 'Residente';

  const esRutaActiva = (ruta) => ubicacion.pathname === ruta;

  return (
    <div className="d-flex">
      {/* Overlay móvil */}
      {menuAbierto && (
        <div className="overlay-sidebar d-lg-none" onClick={() => setMenuAbierto(false)} />
      )}

      {/* Sidebar */}
      <aside className={`sidebar bg-azul-oscuro text-white d-flex flex-column ${menuAbierto ? 'abierto' : ''}`}>
        {/* Logo */}
        <div className="p-3 border-bottom border-light border-opacity-10">
          <div className="d-flex align-items-center gap-2">
            <i className="bi bi-building fs-4 text-logo-salon"></i>
            <div>
              <h6 className="mb-0 fw-bold">Salón Social</h6>
              <small className="text-white-50">Gestión Residencial</small>
            </div>
            <button
              className="btn btn-sm text-white-50 ms-auto d-lg-none"
              onClick={() => setMenuAbierto(false)}
            >
              <i className="bi bi-x-lg"></i>
            </button>
          </div>
        </div>

        {/* Navegación */}
        <nav className="flex-grow-1 p-3">
          <ul className="nav flex-column">
            {elementosMenu.map((item) => (
              <li className="nav-item" key={item.ruta}>
                <Link
                  to={item.ruta}
                  className={`nav-link d-flex align-items-center gap-2 ${esRutaActiva(item.ruta) ? 'active' : ''}`}
                  onClick={() => setMenuAbierto(false)}
                >
                  <i className={`bi ${item.icono}`}></i>
                  {item.etiqueta}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* Info usuario */}
        <div className="p-3 border-top border-light border-opacity-10">
          <div className="d-flex align-items-center gap-2 mb-2">
            <div
              className="rounded-circle bg-circulo-perfil d-flex align-items-center justify-content-center fw-bold text-white"
              style={{ width: 36, height: 36, fontSize: 14 }}
            >
              {usuario?.nombreTitular?.charAt(0) || 'U'}
            </div>
            <div className="text-truncate">
              <div className="small fw-medium text-truncate">{usuario?.nombreTitular}</div>
              <div className="text-white-50" style={{ fontSize: 11 }}>
                {etiquetaRol} · Apt {usuario?.idApartamento}
              </div>
            </div>
          </div>
          <button
            onClick={cerrarSesion}
            className="btn btn-sm w-100 text-white-50 text-start d-flex align-items-center gap-2"
            style={{ background: 'rgba(255,255,255,0.05)' }}
          >
            <i className="bi bi-box-arrow-left"></i>
            Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* Contenido principal */}
      <div className="contenido-principal d-flex flex-column" style={{ minWidth: 0 }}>
        {/* Header Superior */}
        <header className="bg-white border-bottom px-3 px-md-4 py-2 d-flex align-items-center justify-content-between sticky-top" style={{ height: '60px', zIndex: 1000 }}>
          <div className="d-flex align-items-center gap-2">
            <button className="btn btn-sm text-secondary d-lg-none me-1" onClick={() => setMenuAbierto(true)}>
              <i className="bi bi-list fs-4"></i>
            </button>
            <h5 className="mb-0 fw-bold text-dark d-none d-sm-block">
              {ubicacion.pathname === '/dashboard' ? 'Panel de Control' :
               ubicacion.pathname === '/usuarios' ? 'Gestión de Usuarios' :
               ubicacion.pathname === '/inventario' ? 'Inventario y Préstamos' :
               ubicacion.pathname === '/reservas' ? 'Gestión de Reservas' :
               ubicacion.pathname === '/mis-prestamos' ? 'Mis Préstamos' :
               ubicacion.pathname === '/reportes' ? 'Descarga de Informes' : 'Salón Social'}
            </h5>
          </div>

          <div className="d-flex align-items-center gap-3">
            {/* Campana de Notificaciones */}
            <div className="position-relative">
              <button 
                className="btn btn-light btn-sm rounded-circle position-relative p-0 d-flex align-items-center justify-content-center"
                onClick={() => setBandejaAbierta(!bandejaAbierta)}
                style={{ width: '38px', height: '38px' }}
              >
                <i className={`bi ${notificacionesSinLeer > 0 ? 'bi-bell-fill text-primary animate-bell' : 'bi-bell text-secondary'} fs-5`}></i>
                {notificacionesSinLeer > 0 && (
                  <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger" style={{ fontSize: '9px', transform: 'translate(-35%, 10%)' }}>
                    {notificacionesSinLeer}
                  </span>
                )}
              </button>

              {/* Bandeja desplegable de notificaciones */}
              {bandejaAbierta && (
                <>
                  <div className="position-fixed top-0 start-0 end-0 bottom-0" style={{ zIndex: 999 }} onClick={() => setBandejaAbierta(false)}></div>
                  <div className="bandeja-notificaciones bg-white border rounded-3 shadow-lg position-absolute end-0 mt-2 p-0" style={{ width: '330px', zIndex: 1000, top: '100%' }}>
                    <div className="p-3 border-bottom d-flex justify-content-between align-items-center bg-light rounded-top-3">
                      <span className="fw-bold small text-dark">Alertas Inteligentes</span>
                      {notificacionesSinLeer > 0 && (
                        <button className="btn btn-link btn-xs p-0 text-decoration-none small text-primary fw-medium" style={{ fontSize: '12px' }} onClick={marcarTodasComoLeidas}>
                          Marcar leídas
                        </button>
                      )}
                    </div>
                    <div className="listado-notificaciones overflow-auto" style={{ maxHeight: '320px' }}>
                      {notificaciones.length === 0 ? (
                        <div className="p-4 text-center text-muted small">No tienes notificaciones nuevas.</div>
                      ) : (
                        notificaciones.map(n => (
                          <div key={n.id_notificacion} className={`p-3 border-bottom ${n.leido ? 'bg-white' : 'bg-light-alert'}`} style={{ transition: 'background-color 0.2s' }}>
                            <div className="d-flex justify-content-between align-items-start gap-1">
                              <span className={`small fw-bold ${n.leido ? 'text-secondary' : 'text-dark'}`}>{n.titulo}</span>
                              <span className="text-muted" style={{ fontSize: '9px', whiteSpace: 'nowrap' }}>
                                {new Date(n.fecha_creacion).toLocaleDateString(undefined, {month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'})}
                              </span>
                            </div>
                            <p className="mb-2 text-muted small mt-1" style={{ fontSize: '12px', lineHeight: '1.4' }}>{n.mensaje}</p>
                            <div className="d-flex justify-content-end gap-2">
                              {!n.leido && (
                                <button className="btn btn-xs btn-outline-primary py-0 px-2 small-btn" style={{ fontSize: '11px' }} onClick={() => marcarComoLeida(n.id_notificacion)}>
                                  <i className="bi bi-check2"></i> Leer
                                </button>
                              )}
                              <button className="btn btn-xs btn-outline-danger py-0 px-2 small-btn" style={{ fontSize: '11px' }} onClick={() => eliminarNotificacion(n.id_notificacion)}>
                                  <i className="bi bi-trash"></i>
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Perfil en header */}
            <div className="d-flex align-items-center gap-2">
              <div
                className="rounded-circle bg-azul-oscuro d-flex align-items-center justify-content-center fw-bold text-white text-uppercase"
                style={{ width: 35, height: 35, fontSize: 13 }}
              >
                {usuario?.nombreTitular?.charAt(0) || 'U'}
              </div>
              <div className="d-none d-md-block text-start" style={{ lineHeight: '1.1' }}>
                <span className="small fw-semibold text-dark d-block">{usuario?.nombreTitular?.split(' ')[0]}</span>
                <span className="text-muted" style={{ fontSize: '10px' }}>Apt {usuario?.idApartamento}</span>
              </div>
            </div>
          </div>
        </header>

        {/* Contenido */}
        <main className="p-3 p-md-4 flex-grow-1 overflow-auto bg-light bg-opacity-50">
          {children}
        </main>
      </div>
    </div>
  );
}
