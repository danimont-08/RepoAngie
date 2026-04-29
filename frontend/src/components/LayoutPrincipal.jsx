import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/ContextoAutenticacion';
import './LayoutPrincipal.css';

export default function LayoutPrincipal({ children }) {
  const { usuario, cerrarSesion, esAdmin, esSupervisor } = useAuth();
  const ubicacion = useLocation();
  const [menuAbierto, setMenuAbierto] = useState(false);

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
      <div className="contenido-principal">
        {/* Header móvil */}
        <header className="d-lg-none bg-white border-bottom px-3 py-2 d-flex align-items-center gap-2">
          <button className="btn btn-sm text-secondary" onClick={() => setMenuAbierto(true)}>
            <i className="bi bi-list fs-4"></i>
          </button>
          <h6 className="mb-0 fw-semibold">Salón Social</h6>
        </header>

        {/* Contenido */}
        <main className="p-3 p-md-4">
          {children}
        </main>
      </div>
    </div>
  );
}
