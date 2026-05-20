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
  const [todasLasReservas, setTodasLasReservas] = useState([]);
  const [cargando, setCargando] = useState(true);

  // Filtros
  const [filtroMes, setFiltroMes] = useState('todos');
  const [filtroAnio, setFiltroAnio] = useState(new Date().getFullYear().toString());
  const [filtroApt, setFiltroApt] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('todos');

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
        setTodasLasReservas(respReservas.data.datos || []);
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

  // Filtrado de reservas
  const reservasFiltradas = todasLasReservas.filter(res => {
    if (!res.fecha_reserva) return false;
    const partes = String(res.fecha_reserva).split('-'); // "YYYY-MM-DD"
    const mesVal = parseInt(partes[1]).toString(); // '5' en lugar de '05'
    const anioVal = partes[0];
    
    const coincideMes = filtroMes === 'todos' || mesVal === filtroMes;
    const coincideAnio = filtroAnio === 'todos' || anioVal === filtroAnio;
    const coincideApt = !filtroApt || res.id_apartamento.toString().includes(filtroApt);
    const coincideEstado = filtroEstado === 'todos' || res.estado === filtroEstado;
    
    return coincideMes && coincideAnio && coincideApt && coincideEstado;
  });

  // Reservas pendientes reales (sin filtrar)
  const reservasPendientes = todasLasReservas.filter(r => r.estado === 'activa');

  // Próximas reservas ordenadas para el semáforo (futuras y que sean activas o aprobadas)
  const hoyStr = new Date().toISOString().split('T')[0];
  const proximasReservas = todasLasReservas
    .filter(r => r.fecha_reserva >= hoyStr && (r.estado === 'activa' || r.estado === 'aprobada'))
    .sort((a, b) => a.fecha_reserva.localeCompare(b.fecha_reserva));

  const calcularSemaforo = (fechaStr, estado) => {
    const ahora = new Date();
    ahora.setHours(0, 0, 0, 0);
    
    const fechaRes = new Date(fechaStr + 'T00:00:00');
    fechaRes.setHours(0, 0, 0, 0);
    
    const diffMs = fechaRes.getTime() - ahora.getTime();
    const diffDias = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDias < 0) {
      return { color: '#6c757d', badge: 'bg-secondary bg-opacity-10 text-secondary', texto: 'Pasada', dias: diffDias };
    } else if (diffDias <= 1) {
      return { color: '#dc3545', badge: 'bg-danger bg-opacity-10 text-danger', texto: 'Urgente (Hoy/Mañana)', dias: diffDias, urgente: true };
    } else if (diffDias <= 3) {
      return { color: '#ffc107', badge: 'bg-warning bg-opacity-10 text-warning', texto: 'Próxima (2-3 días)', dias: diffDias };
    } else {
      return { color: '#198754', badge: 'bg-success bg-opacity-10 text-success', texto: 'A tiempo (>3 días)', dias: diffDias };
    }
  };

  // Renderizador de gráfico de barras SVG
  const renderBarChart = () => {
    const total = reservasFiltradas.length;
    if (total === 0) {
      return <div className="text-center py-5 text-muted small">No hay reservas para mostrar con los filtros actuales.</div>;
    }

    let labels = [];
    let counts = [];

    if (filtroMes === 'todos') {
      labels = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
      counts = Array(12).fill(0);
      reservasFiltradas.forEach(r => {
        const mes = parseInt(String(r.fecha_reserva).split('-')[1]) - 1;
        if (mes >= 0 && mes < 12) counts[mes]++;
      });
    } else {
      labels = ['Semana 1', 'Semana 2', 'Semana 3', 'Semana 4+'];
      counts = Array(4).fill(0);
      reservasFiltradas.forEach(r => {
        const dia = parseInt(String(r.fecha_reserva).split('-')[2]);
        if (dia <= 7) counts[0]++;
        else if (dia <= 14) counts[1]++;
        else if (dia <= 21) counts[2]++;
        else counts[3]++;
      });
    }

    const maxVal = Math.max(...counts, 1);
    const chartHeight = 130;

    return (
      <div className="w-100">
        <div className="d-flex align-items-end gap-2 px-2 pb-2 border-bottom shadow-inner" style={{ height: `${chartHeight}px` }}>
          {counts.map((val, idx) => {
            const pct = val / maxVal;
            const barHeight = Math.max(pct * (chartHeight - 15), val > 0 ? 8 : 0);
            
            return (
              <div key={idx} className="flex-grow-1 d-flex flex-column align-items-center position-relative group-bar">
                {val > 0 && (
                  <div className="bar-tooltip bg-dark text-white rounded px-2 py-1 text-center position-absolute" style={{ fontSize: '10px', top: '-30px', display: 'none', zIndex: 10, whiteSpace: 'nowrap' }}>
                    {val} {val === 1 ? 'reserva' : 'reservas'}
                  </div>
                )}
                <div 
                  className="bg-primary rounded-top bar-item w-100" 
                  style={{ 
                    height: `${barHeight}px`, 
                    transition: 'height 0.4s ease',
                    backgroundColor: val > 0 ? '#0d6efd' : '#e9ecef',
                    cursor: val > 0 ? 'pointer' : 'default'
                  }}
                ></div>
                <span className="text-muted mt-2 text-truncate w-100 text-center" style={{ fontSize: '10px' }}>{labels[idx]}</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Renderizador de gráfico Donut SVG
  const renderDonutChart = () => {
    const total = reservasFiltradas.length;
    if (total === 0) {
      return <div className="text-center py-5 text-muted small">Sin estadísticas de distribución.</div>;
    }

    const estados = {
      aprobada: reservasFiltradas.filter(r => r.estado === 'aprobada' || r.estado === 'completada').length,
      activa: reservasFiltradas.filter(r => r.estado === 'activa').length,
      cancelada: reservasFiltradas.filter(r => r.estado === 'cancelada' || r.estado === 'rechazada').length,
    };

    const data = [
      { label: 'Aprobadas', count: estados.aprobada, color: '#198754' },
      { label: 'Pendientes', count: estados.activa, color: '#ffc107' },
      { label: 'Canceladas/Rech.', count: estados.cancelada, color: '#dc3545' },
    ].filter(d => d.count > 0);

    if (data.length === 0) {
      return <div className="text-center py-5 text-muted small">Sin datos disponibles.</div>;
    }

    let acumulado = 0;
    const radio = 38;
    const circ = 2 * Math.PI * radio; // ~238.76

    return (
      <div className="d-flex flex-column align-items-center justify-content-center h-100">
        <div className="d-flex align-items-center gap-3">
          <svg width="110" height="110" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r={radio} fill="transparent" stroke="#f0f0f0" strokeWidth="8" />
            {data.map((item, index) => {
              const porcentaje = item.count / total;
              const strokeLength = porcentaje * circ;
              const strokeOffset = circ - (acumulado * circ) + (circ * 0.25);
              acumulado += porcentaje;
              
              return (
                <circle
                  key={index}
                  cx="50"
                  cy="50"
                  r={radio}
                  fill="transparent"
                  stroke={item.color}
                  strokeWidth="8"
                  strokeDasharray={`${strokeLength} ${circ - strokeLength}`}
                  strokeDashoffset={strokeOffset}
                  style={{ transition: 'stroke-dashoffset 0.5s ease' }}
                />
              );
            })}
            <text x="50" y="55" textAnchor="middle" className="fw-bold" style={{ fontSize: '13px', fill: '#333' }}>
              {total}
            </text>
          </svg>
          <div>
            {data.map((item, index) => (
              <div key={index} className="d-flex align-items-center gap-2 mb-1">
                <span style={{ display: 'inline-block', width: 9, height: 9, backgroundColor: item.color, borderRadius: '50%' }}></span>
                <span className="small text-dark" style={{ fontSize: '11px', whiteSpace: 'nowrap' }}>
                  {item.label}: <strong>{item.count}</strong>
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div>
      {/* Las estadísticas globales */}
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
              <div className="card tarjeta-estadistica shadow-sm border-0">
                <div className="card-body">
                  <div className="d-flex align-items-center justify-content-between mb-2">
                    <span className="small fw-medium text-muted">{t.titulo}</span>
                    <div className={`rounded-3 p-2 ${t.colorFondo}`}>
                      <i className={`bi ${t.icono} ${t.colorIcono}`}></i>
                    </div>
                  </div>
                  <h3 className="fw-bold mb-0 text-dark">{t.valor}</h3>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* --- PANEL DE FILTROS PARA LAS GRÁFICAS (PUNTO 11) --- */}
      <div className="card shadow-sm border-0 mb-4">
        <div className="card-body">
          <h6 className="fw-bold mb-3 d-flex align-items-center gap-2 text-dark">
            <i className="bi bi-funnel text-primary"></i> Bitácora e Interactividad de Gráficas
          </h6>
          <div className="row g-2">
            <div className="col-sm-3">
              <label className="form-label small text-muted mb-1">Año</label>
              <select className="form-select form-select-sm" value={filtroAnio} onChange={e => setFiltroAnio(e.target.value)}>
                <option value="todos">Todos</option>
                <option value="2025">2025</option>
                <option value="2026">2026</option>
                <option value="2027">2027</option>
              </select>
            </div>
            <div className="col-sm-3">
              <label className="form-label small text-muted mb-1">Mes</label>
              <select className="form-select form-select-sm" value={filtroMes} onChange={e => setFiltroMes(e.target.value)}>
                <option value="todos">Todos los meses</option>
                <option value="1">Enero</option>
                <option value="2">Febrero</option>
                <option value="3">Marzo</option>
                <option value="4">Abril</option>
                <option value="5">Mayo</option>
                <option value="6">Junio</option>
                <option value="7">Julio</option>
                <option value="8">Agosto</option>
                <option value="9">Septiembre</option>
                <option value="10">Octubre</option>
                <option value="11">Noviembre</option>
                <option value="12">Diciembre</option>
              </select>
            </div>
            <div className="col-sm-3">
              <label className="form-label small text-muted mb-1">Apartamento</label>
              <input 
                type="text" 
                className="form-control form-control-sm" 
                placeholder="Filtro rápido Apt" 
                value={filtroApt} 
                onChange={e => setFiltroApt(e.target.value)} 
              />
            </div>
            <div className="col-sm-3">
              <label className="form-label small text-muted mb-1">Estado</label>
              <select className="form-select form-select-sm" value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}>
                <option value="todos">Todos</option>
                <option value="activa">Pendientes</option>
                <option value="aprobada">Aprobadas</option>
                <option value="cancelada">Canceladas</option>
                <option value="rechazada">Rechazadas</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* --- GRÁFICAS INTERACTIVAS (PUNTO 11) --- */}
      <div className="row g-3 mb-4">
        {/* Gráfico de Barras */}
        <div className="col-lg-7">
          <div className="card shadow-sm border-0 h-100">
            <div className="card-body d-flex flex-column justify-content-between">
              <h6 className="fw-semibold text-dark mb-3">Reservas en el Tiempo (Año / Semana)</h6>
              <div className="flex-grow-1 d-flex align-items-center">
                {renderBarChart()}
              </div>
            </div>
          </div>
        </div>

        {/* Gráfico de Donut */}
        <div className="col-lg-5">
          <div className="card shadow-sm border-0 h-100">
            <div className="card-body">
              <h6 className="fw-semibold text-dark mb-3">Distribución por Estado</h6>
              {renderDonutChart()}
            </div>
          </div>
        </div>
      </div>

      <div className="row g-3 mb-4">
        {/* --- SEMÁFORO DE PRÓXIMAS RESERVAS (PUNTO 10) --- */}
        <div className="col-lg-6">
          <div className="card shadow-sm border-0 h-100">
            <div className="card-body">
              <div className="d-flex align-items-center gap-2 mb-3">
                <div className="rounded-3 p-2 bg-danger bg-opacity-10">
                  <i className="bi bi-clock-history text-danger animate-pulse"></i>
                </div>
                <h6 className="fw-semibold mb-0 text-dark">Semáforo de Próximas Reservas</h6>
              </div>
              {cargando ? (
                <div className="text-center py-4"><div className="spinner-border spinner-border-sm text-danger"></div></div>
              ) : proximasReservas.length === 0 ? (
                <p className="text-muted small mb-0">No hay próximas reservas programadas.</p>
              ) : (
                <div className="list-group list-group-flush">
                  {proximasReservas.slice(0, 5).map(r => {
                    const sem = calcularSemaforo(r.fecha_reserva, r.estado);
                    return (
                      <div key={r.id_reserva} className="list-group-item px-0 py-2 d-flex justify-content-between align-items-center bg-transparent">
                        <div>
                          <div className="small fw-semibold text-dark">{r.nombre_titular} · Apt {r.id_apartamento}</div>
                          <div className="small text-muted">{formatearFechaSegura(r.fecha_reserva, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
                        </div>
                        <div className="text-end d-flex flex-column align-items-end">
                          <span className={`badge ${sem.badge} d-inline-flex align-items-center gap-1`}>
                            <span className={`dot-semaforo ${sem.urgente ? 'dot-semaforo-urgente' : ''}`} style={{ width: 8, height: 8, backgroundColor: sem.color, borderRadius: '50%' }}></span>
                            {sem.texto}
                          </span>
                          <span className="text-muted small mt-1" style={{ fontSize: '10px' }}>
                            {r.estado === 'activa' ? 'Pendiente aprobación' : 'Aprobada'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Reservas pendientes de aprobación */}
        <div className="col-lg-6">
          <div className="card shadow-sm border-0 h-100">
            <div className="card-body">
              <div className="d-flex align-items-center gap-2 mb-3">
                <div className="rounded-3 p-2 bg-warning bg-opacity-10">
                  <i className="bi bi-calendar-check text-warning"></i>
                </div>
                <h6 className="fw-semibold mb-0 text-dark">Reservas Pendientes de Aprobación</h6>
              </div>
              {cargando ? (
                <div className="text-center py-4"><div className="spinner-border spinner-border-sm text-warning"></div></div>
              ) : reservasPendientes.length === 0 ? (
                <p className="text-muted small mb-0">No hay reservas pendientes.</p>
              ) : (
                <div className="list-group list-group-flush">
                  {reservasPendientes.slice(0, 5).map(r => (
                    <div key={r.id_reserva} className="list-group-item px-0 py-2 d-flex justify-content-between align-items-center bg-transparent">
                      <div>
                        <div className="small fw-semibold text-dark">{r.nombre_titular} · Apt {r.id_apartamento}</div>
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
      </div>

      {/* Acceso rápido */}
      <div className="card shadow-sm border-0 mb-2">
        <div className="card-body">
          <div className="d-flex align-items-center gap-2 mb-3">
            <div className="rounded-3 p-2 bg-success bg-opacity-10">
              <i className="bi bi-lightning text-success"></i>
            </div>
            <h6 className="fw-semibold mb-0 text-dark">Acceso Rápido Administrativo</h6>
          </div>
          <div className="row g-2">
            <div className="col-md-4">
              <Link to="/usuarios" className="btn btn-outline-primary w-100 d-flex align-items-center justify-content-center gap-2 py-2 small fw-medium">
                <i className="bi bi-people"></i> Gestionar Usuarios
              </Link>
            </div>
            <div className="col-md-4">
              <Link to="/inventario" className="btn btn-outline-info w-100 d-flex align-items-center justify-content-center gap-2 py-2 small fw-medium">
                <i className="bi bi-box-seam"></i> Ver Inventario
              </Link>
            </div>
            <div className="col-md-4">
              <Link to="/reportes" className="btn btn-outline-success w-100 d-flex align-items-center justify-content-center gap-2 py-2 small fw-medium">
                <i className="bi bi-file-earmark-bar-graph"></i> Descargar Reportes
              </Link>
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