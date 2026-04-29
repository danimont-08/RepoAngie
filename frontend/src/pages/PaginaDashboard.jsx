import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/ContextoAutenticacion';
import { servicioUsuarios, servicioInventario } from '../services/servicioApi';
import { servicioReservas } from '../services/servicioReservas';
import { servicioPrestamos } from '../services/servicioPrestamos';
import './PaginaDashboard.css';

// Formatea fechas en hora LOCAL.
// "YYYY-MM-DD" sin hora → JS lo parsea como UTC midnight → día anterior en UTC-5.
// Se añade T00:00:00 para forzar interpretación local.
const formatearFechaSegura = (strFecha, opciones) => {
  if (!strFecha) return '';
  const s = String(strFecha);
  const f = new Date(/^\d{4}-\d{2}-\d{2}$/.test(s) ? s + 'T00:00:00' : s.replace(' ', 'T'));
  if (!isNaN(f.getTime())) return f.toLocaleDateString('es-ES', opciones);
  // Fallback: extraer solo la parte de fecha
  const soloFecha = s.split('T')[0].split(' ')[0];
  const f2 = new Date(soloFecha + 'T00:00:00');
  return isNaN(f2.getTime()) ? strFecha : f2.toLocaleDateString('es-ES', opciones);
};

/* ──────────────────── DASHBOARD ADMINISTRADOR ──────────────────── */
function DashboardAdmin({ usuario }) {
  const [estadisticas, setEstadisticas] = useState(null);
  const [reservasPendientes, setReservasPendientes] = useState([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const cargar = async () => {
      try {
        const [respUsuarios, respInventario, respReservas] = await Promise.all([
          servicioUsuarios.obtenerEstadisticas(),
          servicioInventario.obtenerEstadisticas(),
          servicioReservas.obtenerTodas(),
        ]);
        setEstadisticas({
          ...respUsuarios.data.datos,
          ...respInventario.data.datos,
        });
        const todas = respReservas.data.datos || [];
        setReservasPendientes(todas.filter(r => r.estado === 'activa'));
      } catch (error) {
        console.error('Error cargando estadísticas admin:', error);
      } finally {
        setCargando(false);
      }
    };
    cargar();
  }, []);

  const obtenerSaludo = () => {
    const hora = new Date().getHours();
    if (hora < 12) return 'Buenos días';
    if (hora < 18) return 'Buenas tardes';
    return 'Buenas noches';
  };

  const tarjetas = estadisticas ? [
    { titulo: 'Total Usuarios', valor: estadisticas.totalUsuarios, icono: 'bi-people', colorFondo: 'bg-primary bg-opacity-10', colorIcono: 'text-primary' },
    { titulo: 'Usuarios Activos', valor: estadisticas.activos, icono: 'bi-person-check', colorFondo: 'bg-success bg-opacity-10', colorIcono: 'text-success' },
    { titulo: 'Usuarios Inactivos', valor: estadisticas.inactivos, icono: 'bi-person-x', colorFondo: 'bg-warning bg-opacity-10', colorIcono: 'text-warning' },
    { titulo: 'Total Insumos', valor: estadisticas.totalInsumos, icono: 'bi-box-seam', colorFondo: 'bg-info bg-opacity-10', colorIcono: 'text-info' },
  ] : [];

  return (
    <div>
      <div className="mb-4">
        <h3 className="fw-bold">{obtenerSaludo()}, {usuario?.nombreTitular?.split(' ')[0]}</h3>
        <p className="text-muted mb-0">Panel de Administración del Salón Social</p>
      </div>

      {cargando ? (
        <div className="row g-3 mb-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="col-sm-6 col-xl-3">
              <div className="card tarjeta-estadistica shadow-sm">
                <div className="card-body placeholder-glow">
                  <span className="placeholder col-6 mb-2 d-block"></span>
                  <span className="placeholder col-4 placeholder-lg"></span>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="row g-3 mb-4">
          {tarjetas.map(t => (
            <div key={t.titulo} className="col-sm-6 col-xl-3">
              <div className="card tarjeta-estadistica shadow-sm">
                <div className="card-body">
                  <div className="d-flex align-items-center justify-content-between mb-2">
                    <span className="small fw-medium text-muted">{t.titulo}</span>
                    <div className={`rounded-3 p-2 ${t.colorFondo}`}>
                      <i className={`bi ${t.icono} ${t.colorIcono}`}></i>
                    </div>
                  </div>
                  <h3 className="fw-bold mb-0">{t.valor}</h3>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="row g-3">
        {/* Reservas pendientes */}
        <div className="col-lg-6">
          <div className="card shadow-sm border-0 h-100">
            <div className="card-body">
              <div className="d-flex align-items-center gap-2 mb-3">
                <div className="rounded-3 p-2 bg-warning bg-opacity-10">
                  <i className="bi bi-calendar-check text-warning"></i>
                </div>
                <h6 className="fw-semibold mb-0">Reservas Pendientes de Aprobación</h6>
              </div>
              {reservasPendientes.length === 0 ? (
                <p className="text-muted small mb-0">No hay reservas pendientes.</p>
              ) : (
                <div className="list-group list-group-flush">
                  {reservasPendientes.slice(0, 5).map(r => (
                    <div key={r.id_reserva} className="list-group-item px-0 py-2 d-flex justify-content-between align-items-center">
                      <div>
                        <div className="small fw-semibold">{r.nombre_titular} · Apt {r.id_apartamento}</div>
                        <div className="small text-muted">{formatearFechaSegura(r.fecha_reserva, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
                      </div>
                      <span className="badge bg-warning bg-opacity-10 text-warning">Pendiente</span>
                    </div>
                  ))}
                </div>
              )}
              <div className="mt-3">
                <Link to="/reservas" className="btn btn-sm btn-primary w-100">
                  <i className="bi bi-calendar-event me-1"></i> Gestionar Reservas
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Acceso rápido */}
        <div className="col-lg-6">
          <div className="card shadow-sm border-0 h-100">
            <div className="card-body">
              <div className="d-flex align-items-center gap-2 mb-3">
                <div className="rounded-3 p-2 bg-success bg-opacity-10">
                  <i className="bi bi-lightning text-success"></i>
                </div>
                <h6 className="fw-semibold mb-0">Acceso Rápido</h6>
              </div>
              <div className="d-grid gap-2">
                <Link to="/usuarios" className="btn btn-outline-primary d-flex align-items-center gap-2">
                  <i className="bi bi-people"></i> Gestionar Usuarios
                </Link>
                <Link to="/inventario" className="btn btn-outline-info d-flex align-items-center gap-2">
                  <i className="bi bi-box-seam"></i> Ver Inventario
                </Link>
                <Link to="/reservas" className="btn btn-outline-warning d-flex align-items-center gap-2">
                  <i className="bi bi-calendar-event"></i> Aprobar / Rechazar Reservas
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ──────────────────── DASHBOARD SUPERVISOR ──────────────────── */
function DashboardSupervisor({ usuario }) {
  const [prestamos, setPrestamos] = useState([]);
  const [insumos, setInsumos] = useState([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const cargar = async () => {
      try {
        const [respPrestamos, respInsumos] = await Promise.all([
          servicioPrestamos.obtenerTodos(),
          servicioInventario.obtenerTodos(),
        ]);
        setPrestamos(respPrestamos.data.datos || []);
        setInsumos(respInsumos.data.datos || []);
      } catch (error) {
        console.error('Error cargando datos supervisor:', error);
      } finally {
        setCargando(false);
      }
    };
    cargar();
  }, []);

  // Con la nueva tabla de 8 campos, todos los registros en prestamos_insumos son activos
  // (no existe columna estado; al devolver el registro se elimina)
  const prestamosActivos = prestamos;
  const prestamosPendientesDevolucion = []; // ya no aplica, se devuelve directamente
  const insumosConStockBajo = insumos.filter(i => i.cantidad_disponible === 0);

  const obtenerSaludo = () => {
    const hora = new Date().getHours();
    if (hora < 12) return 'Buenos días';
    if (hora < 18) return 'Buenas tardes';
    return 'Buenas noches';
  };

  return (
    <div>
      <div className="mb-4">
        <h3 className="fw-bold">{obtenerSaludo()}, {usuario?.nombreTitular?.split(' ')[0]}</h3>
        <p className="text-muted mb-0">Panel de Supervisión de Préstamos e Insumos</p>
      </div>

      {/* Tarjetas de resumen */}
      <div className="row g-3 mb-4">
        <div className="col-sm-4">
          <div className="card tarjeta-estadistica shadow-sm">
            <div className="card-body">
              <div className="d-flex align-items-center justify-content-between mb-2">
                <span className="small fw-medium text-muted">Préstamos Activos</span>
                <div className="rounded-3 p-2 bg-success bg-opacity-10">
                  <i className="bi bi-box-arrow-right text-success"></i>
                </div>
              </div>
              <h3 className="fw-bold mb-0">{cargando ? '—' : prestamosActivos.length}</h3>
            </div>
          </div>
        </div>
        <div className="col-sm-4">
          <div className="card tarjeta-estadistica shadow-sm">
            <div className="card-body">
              <div className="d-flex align-items-center justify-content-between mb-2">
                <span className="small fw-medium text-muted">Insumos Prestados Hoy</span>
                <div className="rounded-3 p-2 bg-warning bg-opacity-10">
                  <i className="bi bi-clock-history text-warning"></i>
                </div>
              </div>
              <h3 className="fw-bold mb-0">{cargando ? '—' : prestamos.filter(p => {
                const hoy = new Date().toISOString().split('T')[0];
                const fp  = String(p.fecha_prestamo || '').split('T')[0].split(' ')[0];
                return fp === hoy;
              }).length}</h3>
            </div>
          </div>
        </div>
        <div className="col-sm-4">
          <div className="card tarjeta-estadistica shadow-sm">
            <div className="card-body">
              <div className="d-flex align-items-center justify-content-between mb-2">
                <span className="small fw-medium text-muted">Insumos Agotados</span>
                <div className="rounded-3 p-2 bg-danger bg-opacity-10">
                  <i className="bi bi-exclamation-triangle text-danger"></i>
                </div>
              </div>
              <h3 className="fw-bold mb-0">{cargando ? '—' : insumosConStockBajo.length}</h3>
            </div>
          </div>
        </div>
      </div>

      <div className="row g-3">
        {/* Préstamos pendientes devolución */}
        <div className="col-lg-7">
          <div className="card shadow-sm border-0">
            <div className="card-body">
              <div className="d-flex align-items-center gap-2 mb-3">
                <div className="rounded-3 p-2 bg-success bg-opacity-10">
                  <i className="bi bi-box-arrow-right text-success"></i>
                </div>
                <h6 className="fw-semibold mb-0">Préstamos Activos</h6>
              </div>
              {cargando ? (
                <div className="text-center py-3"><div className="spinner-border spinner-border-sm text-warning"></div></div>
              ) : prestamosActivos.length === 0 ? (
                <p className="text-muted small mb-0">No hay préstamos activos actualmente.</p>
              ) : (
                <div className="list-group list-group-flush">
                  {prestamosActivos.slice(0, 5).map(p => (
                    <div key={p.id_prestamo} className="list-group-item px-0 py-2">
                      <div className="d-flex justify-content-between align-items-center">
                        <div>
                          <div className="small fw-semibold">{p.nombre_titular} · Apt {p.id_apartamento}</div>
                          <div className="small text-muted">{p.nombre_insumo} — {p.cantidad} unidad(es)</div>
                        </div>
                        <span className="badge bg-success bg-opacity-10 text-success">Activo</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div className="mt-3">
                <Link to="/inventario" className="btn btn-sm btn-warning w-100">
                  <i className="bi bi-box-seam me-1"></i> Ir al Inventario y Préstamos
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Insumos con stock bajo o agotados */}
        <div className="col-lg-5">
          <div className="card shadow-sm border-0">
            <div className="card-body">
              <div className="d-flex align-items-center gap-2 mb-3">
                <div className="rounded-3 p-2 bg-danger bg-opacity-10">
                  <i className="bi bi-exclamation-triangle text-danger"></i>
                </div>
                <h6 className="fw-semibold mb-0">Insumos Agotados</h6>
              </div>
              {cargando ? (
                <div className="text-center py-3"><div className="spinner-border spinner-border-sm text-danger"></div></div>
              ) : insumosConStockBajo.length === 0 ? (
                <p className="text-muted small mb-0">Todos los insumos tienen stock disponible.</p>
              ) : (
                <div className="list-group list-group-flush">
                  {insumosConStockBajo.map(i => (
                    <div key={i.id_inventario} className="list-group-item px-0 py-2 d-flex justify-content-between align-items-center">
                      <span className="small fw-medium">{i.nombre_insumo}</span>
                      <span className="badge bg-danger bg-opacity-10 text-danger">0 / {i.cantidad_total}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ──────────────────── DASHBOARD RESIDENTE ──────────────────── */
function DashboardResidente({ usuario }) {
  const [misReservas, setMisReservas] = useState([]);
  const [misPrestamos, setMisPrestamos] = useState([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const cargar = async () => {
      try {
        const [respReservas, respPrestamos] = await Promise.all([
          servicioReservas.obtenerMisReservas(),
          servicioPrestamos.obtenerMisPrestamos(),
        ]);
        setMisReservas(respReservas.data.datos || []);
        setMisPrestamos(respPrestamos.data.datos || []);
      } catch (error) {
        console.error('Error cargando datos residente:', error);
      } finally {
        setCargando(false);
      }
    };
    cargar();
  }, []);

  const obtenerSaludo = () => {
    const hora = new Date().getHours();
    if (hora < 12) return 'Buenos días';
    if (hora < 18) return 'Buenas tardes';
    return 'Buenas noches';
  };

  const reservasActivas = misReservas.filter(r => r.estado === 'activa' || r.estado === 'aprobada');
  // Todos los registros en prestamos_insumos son activos (no hay columna estado)
  const prestamosActivos = misPrestamos;

  return (
    <div>
      <div className="mb-4">
        <h3 className="fw-bold">{obtenerSaludo()}, {usuario?.nombreTitular?.split(' ')[0]}</h3>
        <p className="text-muted mb-0">Bienvenido al sistema de reservas del Salón Social · Apt {usuario?.idApartamento}</p>
      </div>

      <div className="row g-3 mb-4">
        <div className="col-sm-6">
          <div className="card tarjeta-estadistica shadow-sm">
            <div className="card-body">
              <div className="d-flex align-items-center justify-content-between mb-2">
                <span className="small fw-medium text-muted">Mis Reservas Activas</span>
                <div className="rounded-3 p-2 bg-primary bg-opacity-10">
                  <i className="bi bi-calendar-check text-primary"></i>
                </div>
              </div>
              <h3 className="fw-bold mb-0">{cargando ? '—' : reservasActivas.length}</h3>
            </div>
          </div>
        </div>
        <div className="col-sm-6">
          <div className="card tarjeta-estadistica shadow-sm">
            <div className="card-body">
              <div className="d-flex align-items-center justify-content-between mb-2">
                <span className="small fw-medium text-muted">Mis Préstamos Activos</span>
                <div className="rounded-3 p-2 bg-success bg-opacity-10">
                  <i className="bi bi-box-arrow-right text-success"></i>
                </div>
              </div>
              <h3 className="fw-bold mb-0">{cargando ? '—' : prestamosActivos.length}</h3>
            </div>
          </div>
        </div>
      </div>

      <div className="row g-3">
        {/* Mis próximas reservas */}
        <div className="col-12">
          <div className="card shadow-sm border-0">
            <div className="card-body">
              <div className="d-flex align-items-center gap-2 mb-3">
                <div className="rounded-3 p-2 bg-primary bg-opacity-10">
                  <i className="bi bi-calendar-event text-primary"></i>
                </div>
                <h6 className="fw-semibold mb-0">Mis Próximas Reservas</h6>
              </div>
              {cargando ? (
                <div className="text-center py-3"><div className="spinner-border spinner-border-sm text-primary"></div></div>
              ) : reservasActivas.length === 0 ? (
                <p className="text-muted small mb-0">No tienes reservas activas.</p>
              ) : (
                <div className="list-group list-group-flush">
                  {reservasActivas.slice(0, 4).map(r => (
                    <div key={r.id_reserva} className="list-group-item px-0 py-2 d-flex justify-content-between align-items-center">
                      <span className="small fw-medium">{formatearFechaSegura(r.fecha_reserva, { weekday: 'short', day: 'numeric', month: 'short' })}</span>
                      <span className={`badge ${r.estado === 'aprobada' ? 'bg-success bg-opacity-10 text-success' : 'bg-warning bg-opacity-10 text-warning'}`}>
                        {r.estado === 'aprobada' ? 'Aprobada' : 'Pendiente'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
              <div className="mt-3">
                <Link to="/reservas" className="btn btn-sm btn-primary w-100">
                  <i className="bi bi-plus-circle me-1"></i> Revisar reservas
                </Link>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

/* ──────────────────── COMPONENTE PRINCIPAL ──────────────────── */
export default function PaginaDashboard() {
  const { usuario, esAdmin, esSupervisor } = useAuth();

  if (esAdmin) return <DashboardAdmin usuario={usuario} />;
  if (esSupervisor) return <DashboardSupervisor usuario={usuario} />;
  return <DashboardResidente usuario={usuario} />;
}