import { useState, useEffect } from 'react';
import { servicioPrestamos } from '../services/servicioPrestamos';
import { useAuth } from '../context/ContextoAutenticacion';

/**
 * Modal que lista los préstamos activos.
 * Con la nueva estructura de 8 columnas NO hay campo "estado":
 *   - Que exista un registro = préstamo activo
 *   - Al devolver = el registro se elimina y el inventario se restaura
 */
export default function ModalPrestamosActivos({ onCerrar, recargarInventario }) {
  const { esAdmin, esSupervisor } = useAuth();
  const puedeEditar = esAdmin || esSupervisor;

  const [prestamos, setPrestamos]   = useState([]);
  const [cargando, setCargando]     = useState(true);
  const [procesando, setProcesando] = useState(null);
  const [error, setError]           = useState(null);

  // ── Carga ────────────────────────────────────────────────────────────────
  const cargarPrestamos = async () => {
    try {
      setCargando(true);
      setError(null);
      const res = puedeEditar
        ? await servicioPrestamos.obtenerTodos()
        : await servicioPrestamos.obtenerMisPrestamos();
      setPrestamos(res.data.datos || []);
    } catch (err) {
      console.error('Error cargando préstamos:', err);
      setError('No se pudieron cargar los préstamos.');
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => { cargarPrestamos(); }, []);

  // ── Devolución ───────────────────────────────────────────────────────────
  const devolverInsumo = async (idPrestamo, nombreInsumo) => {
    if (!confirm(`¿Confirmar devolución de "${nombreInsumo}"?\nLa cantidad volverá a estar disponible en el inventario.`)) return;
    try {
      setProcesando(idPrestamo);
      await servicioPrestamos.devolver(idPrestamo);
      // El registro se elimina, así que lo quitamos del estado local
      setPrestamos(prev => prev.filter(p => p.id_prestamo !== idPrestamo));
      if (recargarInventario) recargarInventario();
    } catch (err) {
      console.error('Error al devolver:', err);
      alert('Error al devolver insumo: ' + (err.response?.data?.mensaje || 'Desconocido'));
    } finally {
      setProcesando(null);
    }
  };

  // ── Helpers de fecha ────────────────────────────────────────────────────
  // Parsea en hora LOCAL: "YYYY-MM-DD" sin hora → agrega T00:00:00 para evitar UTC midnight
  const parsearFechaLocal = (str) => {
    if (!str) return null;
    const s = String(str);
    // Si es solo fecha sin hora, forzar hora local con T00:00:00
    return new Date(/^\d{4}-\d{2}-\d{2}$/.test(s) ? s + 'T00:00:00' : s.replace(' ', 'T'));
  };

  const formatearFecha = (fechaStr) => {
    if (!fechaStr) return 'N/A';
    const f = parsearFechaLocal(fechaStr);
    if (!f || isNaN(f.getTime())) return String(fechaStr);
    return f.toLocaleString('es-ES', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };

  const formatearSoloFecha = (fechaStr) => {
    if (!fechaStr) return 'N/A';
    const f = parsearFechaLocal(fechaStr);
    if (!f || isNaN(f.getTime())) return String(fechaStr);
    return f.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const estaVencido = (fechaEspera) => {
    if (!fechaEspera) return false;
    const f = parsearFechaLocal(fechaEspera);
    return !!f && !isNaN(f.getTime()) && new Date() > f;
  };

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <>
      <div className="modal-backdrop fade show"></div>
      <div className="modal fade show d-block" tabIndex="-1">
        <div className="modal-dialog modal-dialog-centered modal-lg">
          <div className="modal-content border-0 shadow">

            <div className="modal-header bg-light border-bottom-0">
              <h5 className="modal-title fw-bold">
                <i className="bi bi-card-checklist me-2 text-primary"></i>
                {puedeEditar ? 'Préstamos Activos' : 'Mis Préstamos Activos'}
              </h5>
              <button type="button" className="btn-close" onClick={onCerrar}></button>
            </div>

            <div className="modal-body p-0">

              {error && (
                <div className="alert alert-danger m-3 mb-0">{error}</div>
              )}

              <div className="table-responsive" style={{ maxHeight: '60vh' }}>
                <table className="table table-hover mb-0">
                  <thead className="table-light sticky-top">
                    <tr>
                      {puedeEditar && <th className="small fw-semibold text-muted px-3">Usuario</th>}
                      <th className="small fw-semibold text-muted px-3">Insumo</th>
                      <th className="small fw-semibold text-muted text-center">Cant.</th>
                      <th className="small fw-semibold text-muted text-center">Fecha Evento</th>
                      <th className="small fw-semibold text-muted">Límite Devolución</th>
                      <th className="small fw-semibold text-muted text-end px-3">Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cargando ? (
                      <tr>
                        <td colSpan={puedeEditar ? 6 : 5} className="text-center py-5 text-muted">
                          <div className="spinner-border spinner-border-sm me-2"></div>
                          Cargando préstamos...
                        </td>
                      </tr>
                    ) : prestamos.length === 0 ? (
                      <tr>
                        <td colSpan={puedeEditar ? 6 : 5} className="text-center py-5 text-muted">
                          <i className="bi bi-check-circle fs-2 d-block mb-2 text-success opacity-50"></i>
                          No hay préstamos activos
                        </td>
                      </tr>
                    ) : (
                      prestamos.map(p => {
                        const vencido = estaVencido(p.fecha_espera);
                        return (
                          <tr key={p.id_prestamo} className={vencido ? 'table-danger' : ''}>
                            {puedeEditar && (
                              <td className="px-3 align-middle">
                                <div className="fw-medium small">Apt {p.id_apartamento}</div>
                                <div className="text-muted" style={{ fontSize: '0.75rem' }}>{p.nombre_titular}</div>
                              </td>
                            )}
                            <td className="align-middle fw-medium px-3">
                              {p.nombre_insumo}
                            </td>
                            <td className="align-middle text-center">
                              <span className="badge bg-secondary">{p.cantidad}</span>
                            </td>
                            <td className="align-middle text-center small text-primary fw-medium">
                              {formatearSoloFecha(p.fecha_prestamo)}
                            </td>
                            <td className="align-middle">
                              <span className={`small ${vencido ? 'text-danger fw-bold' : 'text-muted'}`}>
                                {formatearFecha(p.fecha_espera)}
                                {vencido && (
                                  <span className="badge bg-danger ms-1" style={{ fontSize: '0.65rem' }}>
                                    VENCIDO
                                  </span>
                                )}
                              </span>
                            </td>
                            <td className="align-middle text-end px-3">
                              <button
                                className="btn btn-sm btn-outline-success d-inline-flex align-items-center gap-1"
                                onClick={() => devolverInsumo(p.id_prestamo, p.nombre_insumo)}
                                disabled={procesando === p.id_prestamo}
                              >
                                {procesando === p.id_prestamo ? (
                                  <span className="spinner-border spinner-border-sm"></span>
                                ) : (
                                  <i className="bi bi-arrow-return-left"></i>
                                )}
                                Devolver
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {!cargando && prestamos.length > 0 && (
                <div className="px-3 py-2 bg-light border-top d-flex justify-content-between align-items-center">
                  <span className="small text-muted">
                    {prestamos.length} préstamo{prestamos.length !== 1 ? 's' : ''} activo{prestamos.length !== 1 ? 's' : ''}
                  </span>
                  {prestamos.some(p => estaVencido(p.fecha_espera)) && (
                    <span className="small text-danger fw-semibold">
                      <i className="bi bi-exclamation-triangle me-1"></i>
                      Hay préstamos vencidos
                    </span>
                  )}
                </div>
              )}
            </div>

            <div className="modal-footer border-top-0 bg-light">
              <button type="button" className="btn btn-outline-secondary" onClick={onCerrar}>
                Cerrar
              </button>
            </div>

          </div>
        </div>
      </div>
    </>
  );
}
