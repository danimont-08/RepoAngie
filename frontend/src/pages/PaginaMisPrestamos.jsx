import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/ContextoAutenticacion';
import { servicioPrestamos } from '../services/servicioPrestamos';
import './PaginaMisPrestamos.css';

/* ── Helpers de fecha ─────────────────────────────────────────────────── */
// "YYYY-MM-DD" sin hora → JS lo parsea UTC → día anterior en UTC-5.
// Forzar T00:00:00 para que el parseo sea en hora local.
const parsearLocal = (str) => {
  if (!str) return null;
  const s = String(str);
  return new Date(/^\d{4}-\d{2}-\d{2}$/.test(s) ? s + 'T00:00:00' : s.replace(' ', 'T'));
};

const fechaCorta = (str) => {
  if (!str) return 'N/A';
  const f = parsearLocal(str);
  if (!f || isNaN(f.getTime())) return String(str);
  return f.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
};

const horaStr = (str) => {
  if (!str) return '';
  const f = parsearLocal(str);
  if (!f || isNaN(f.getTime())) return '';
  return f.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
};

const estaVencido = (fechaEspera) => {
  if (!fechaEspera) return false;
  const f = parsearLocal(fechaEspera);
  return !!f && !isNaN(f.getTime()) && new Date() > f;
};

// Fecha de hoy en hora LOCAL "YYYY-MM-DD" (toISOString es UTC y puede dar día incorrecto)
const hoyISO = () => {
  const h = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${h.getFullYear()}-${pad(h.getMonth() + 1)}-${pad(h.getDate())}`;
};

/* ── Componente principal ─────────────────────────────────────────────── */
export default function PaginaMisPrestamos() {
  const { usuario } = useAuth();

  const [todosMisPrestamos, setTodosMisPrestamos] = useState([]);
  const [cargando, setCargando]   = useState(true);
  const [error, setError]         = useState(null);
  const [procesando, setProcesando] = useState(null);
  const [mensaje, setMensaje]     = useState(null);
  const [filtroHoy, setFiltroHoy] = useState(false); // mostrar todos por defecto

  /* ── Carga de datos ───────────────────────────────────────────────── */
  const cargar = useCallback(async () => {
    try {
      setCargando(true);
      setError(null);
      const res = await servicioPrestamos.obtenerMisPrestamos();
      setTodosMisPrestamos(res.data.datos || []);
    } catch (err) {
      console.error('Error cargando mis préstamos:', err);
      setError('No se pudieron cargar tus préstamos. Intenta de nuevo.');
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  // Recargar cuando el usuario vuelve a esta pestaña (ej: solicitó desde Inventario y volvió aquí)
  useEffect(() => {
    const alTomarFoco = () => cargar();
    window.addEventListener('focus', alTomarFoco);
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) cargar();
    });
    return () => {
      window.removeEventListener('focus', alTomarFoco);
    };
  }, [cargar]);

  /* ── Devolver ─────────────────────────────────────────────────────── */
  const devolver = async (idPrestamo, nombreInsumo) => {
    if (!confirm(`¿Confirmar devolución de "${nombreInsumo}"?\nLa cantidad volverá al inventario.`)) return;
    try {
      setProcesando(idPrestamo);
      await servicioPrestamos.devolver(idPrestamo);
      mostrarMensaje('success', `✅ "${nombreInsumo}" devuelto correctamente.`);
      await cargar();
    } catch (err) {
      mostrarMensaje('danger', err.response?.data?.mensaje || 'Error al devolver el insumo.');
    } finally {
      setProcesando(null);
    }
  };

  const mostrarMensaje = (tipo, texto) => {
    setMensaje({ tipo, texto });
    setTimeout(() => setMensaje(null), 4000);
  };

  /* ── Filtrado ─────────────────────────────────────────────────────── */
  const hoy = hoyISO();
  const prestamos = filtroHoy
    ? todosMisPrestamos.filter(p => String(p.fecha_prestamo || '').slice(0, 10) === hoy)
    : todosMisPrestamos;

  const prestamosHoy    = todosMisPrestamos.filter(p => String(p.fecha_prestamo || '').slice(0, 10) === hoy);
  const prestamosVencidos = todosMisPrestamos.filter(p => estaVencido(p.fecha_espera));

  /* ── Render ────────────────────────────────────────────────────────── */
  return (
    <div className="pagina-mis-prestamos">

      {/* ── Encabezado ── */}
      <div className="mb-4">
        <h4 className="fw-bold mb-1">
          <i className="bi bi-box-arrow-right me-2 text-success"></i>
          Mis Préstamos de Insumos
        </h4>
        <p className="text-muted small mb-0">
          Apt {usuario?.idApartamento} · {usuario?.nombreTitular}
        </p>
      </div>

      {/* ── Mensaje flotante ── */}
      {mensaje && (
        <div className={`alert alert-${mensaje.tipo} alert-dismissible fade show small d-flex align-items-center gap-2`}>
          <i className={`bi ${mensaje.tipo === 'success' ? 'bi-check-circle' : 'bi-exclamation-circle'}`}></i>
          {mensaje.texto}
          <button type="button" className="btn-close ms-auto" onClick={() => setMensaje(null)}></button>
        </div>
      )}

      {/* ── Tarjetas resumen ── */}
      <div className="row g-3 mb-4">
        <div className="col-6 col-md-4">
          <div className="tarjeta-resumen tarjeta-verde">
            <div className="tarjeta-resumen__icono">
              <i className="bi bi-calendar-check"></i>
            </div>
            <div>
              <div className="tarjeta-resumen__valor">{cargando ? '—' : prestamosHoy.length}</div>
              <div className="tarjeta-resumen__etiqueta">Préstamos hoy</div>
            </div>
          </div>
        </div>
        <div className="col-6 col-md-4">
          <div className="tarjeta-resumen tarjeta-azul">
            <div className="tarjeta-resumen__icono">
              <i className="bi bi-boxes"></i>
            </div>
            <div>
              <div className="tarjeta-resumen__valor">{cargando ? '—' : todosMisPrestamos.length}</div>
              <div className="tarjeta-resumen__etiqueta">Total activos</div>
            </div>
          </div>
        </div>
        <div className="col-6 col-md-4">
          <div className={`tarjeta-resumen ${prestamosVencidos.length > 0 ? 'tarjeta-roja' : 'tarjeta-gris'}`}>
            <div className="tarjeta-resumen__icono">
              <i className="bi bi-alarm"></i>
            </div>
            <div>
              <div className="tarjeta-resumen__valor">{cargando ? '—' : prestamosVencidos.length}</div>
              <div className="tarjeta-resumen__etiqueta">Vencidos</div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Filtro Hoy / Todos ── */}
      <div className="d-flex align-items-center gap-2 mb-3">
        <div className="btn-group btn-group-sm" role="group">
          <button
            type="button"
            className={`btn ${filtroHoy ? 'btn-primary' : 'btn-outline-primary'}`}
            onClick={() => setFiltroHoy(true)}
          >
            <i className="bi bi-calendar-day me-1"></i>Hoy
          </button>
          <button
            type="button"
            className={`btn ${!filtroHoy ? 'btn-primary' : 'btn-outline-primary'}`}
            onClick={() => setFiltroHoy(false)}
          >
            <i className="bi bi-list-ul me-1"></i>Todos
          </button>
        </div>
        <button className="btn btn-sm btn-outline-secondary ms-auto" onClick={cargar} disabled={cargando}>
          <i className={`bi bi-arrow-clockwise ${cargando ? 'spin' : ''}`}></i>
        </button>
      </div>

      {/* ── Contenido ── */}
      {cargando ? (
        <div className="text-center py-5 text-muted">
          <div className="spinner-border text-primary mb-3" role="status"></div>
          <p className="small">Cargando tus préstamos...</p>
        </div>
      ) : error ? (
        <div className="alert alert-danger">
          <i className="bi bi-exclamation-triangle me-2"></i>{error}
          <button className="btn btn-sm btn-outline-danger ms-3" onClick={cargar}>Reintentar</button>
        </div>
      ) : prestamos.length === 0 ? (
        <div className="estado-vacio">
          <i className="bi bi-inbox estado-vacio__icono"></i>
          <p className="estado-vacio__titulo">
            {filtroHoy ? 'No tienes préstamos activos para hoy' : 'No tienes préstamos activos'}
          </p>
          <p className="estado-vacio__sub">
            {filtroHoy
              ? 'Los insumos que solicites para la fecha de tu reserva aparecerán aquí.'
              : 'Ve al inventario para solicitar préstamos de insumos.'}
          </p>
        </div>
      ) : (
        <div className="lista-prestamos">
          {prestamos.map(p => {
            const vencido = estaVencido(p.fecha_espera);
            return (
              <div key={p.id_prestamo} className={`tarjeta-prestamo ${vencido ? 'tarjeta-prestamo--vencido' : ''}`}>

                {/* Nombre del insumo + badge vencido */}
                <div className="tarjeta-prestamo__header">
                  <div className="d-flex align-items-center gap-2">
                    <div className="tarjeta-prestamo__icono-insumo">
                      <i className="bi bi-box-seam"></i>
                    </div>
                    <div>
                      <div className="tarjeta-prestamo__nombre">{p.nombre_insumo}</div>
                      <div className="tarjeta-prestamo__cantidad">
                        <i className="bi bi-stack me-1"></i>
                        {p.cantidad} unidad{p.cantidad !== 1 ? 'es' : ''} prestada{p.cantidad !== 1 ? 's' : ''}
                      </div>
                    </div>
                  </div>
                  {vencido ? (
                    <span className="badge bg-danger">VENCIDO</span>
                  ) : (
                    <span className="badge bg-success bg-opacity-75">Activo</span>
                  )}
                </div>

                {/* Fechas */}
                <div className="tarjeta-prestamo__fechas">
                  <div className="tarjeta-prestamo__fecha-item">
                    <i className="bi bi-calendar-event text-primary"></i>
                    <div>
                      <div className="tarjeta-prestamo__fecha-etiqueta">Fecha del evento</div>
                      <div className="tarjeta-prestamo__fecha-valor">{fechaCorta(p.fecha_prestamo)}</div>
                    </div>
                  </div>
                  <div className="tarjeta-prestamo__fecha-item">
                    <i className={`bi bi-clock ${vencido ? 'text-danger' : 'text-warning'}`}></i>
                    <div>
                      <div className="tarjeta-prestamo__fecha-etiqueta">Límite de devolución</div>
                      <div className={`tarjeta-prestamo__fecha-valor ${vencido ? 'text-danger fw-bold' : ''}`}>
                        {fechaCorta(p.fecha_espera)} · {horaStr(p.fecha_espera)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Acción */}
                <div className="tarjeta-prestamo__footer">
                  <button
                    className="btn btn-sm btn-outline-success w-100 d-flex align-items-center justify-content-center gap-2"
                    onClick={() => devolver(p.id_prestamo, p.nombre_insumo)}
                    disabled={procesando === p.id_prestamo}
                  >
                    {procesando === p.id_prestamo ? (
                      <span className="spinner-border spinner-border-sm"></span>
                    ) : (
                      <i className="bi bi-arrow-return-left"></i>
                    )}
                    Marcar como devuelto
                  </button>
                </div>

              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}
