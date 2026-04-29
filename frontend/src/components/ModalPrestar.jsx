import { useState, useEffect } from 'react';
import { servicioUsuarios } from '../services/servicioApi';
import { servicioReservas } from '../services/servicioReservas';
import { useAuth } from '../context/ContextoAutenticacion';

/**
 * Modal para registrar un préstamo de insumo.
 * Las fechas se asignan automáticamente en el backend a partir de la reserva seleccionada:
 *   - fecha_prestamo = fecha de la reserva a las 00:00:00
 *   - fecha_espera   = misma fecha a las 23:59:59
 */
export default function ModalPrestar({ insumo, onGuardar, onCerrar }) {
  const { esAdmin, esSupervisor, usuario } = useAuth();
  const puedeEditar = esAdmin || esSupervisor;

  // ── Estado ─────────────────────────────────────────────────────────────────
  const [usuarios, setUsuarios]               = useState([]);
  const [cargandoUsuarios, setCargandoUsuarios] = useState(false);
  const [reservasAprobadas, setReservasAprobadas] = useState([]);
  const [cargandoReservas, setCargandoReservas] = useState(false);

  const [datosFormulario, setDatosFormulario] = useState({
    id_apartamento: puedeEditar ? '' : (usuario?.idApartamento ?? ''),
    cantidad:       1,
    id_reserva:     ''
  });

  // ── Cargar usuarios (sólo admin/supervisor) ────────────────────────────────
  useEffect(() => {
    if (!puedeEditar) return;
    setCargandoUsuarios(true);
    servicioUsuarios.obtenerTodos()
      .then(res => setUsuarios(res.data.datos || []))
      .catch(err => console.error('Error cargando usuarios:', err))
      .finally(() => setCargandoUsuarios(false));
  }, [puedeEditar]);

  // ── Cargar reservas aprobadas cuando cambia el apartamento seleccionado ────
  useEffect(() => {
    const aptId = puedeEditar
      ? datosFormulario.id_apartamento
      : usuario?.idApartamento;

    if (!aptId) {
      setReservasAprobadas([]);
      return;
    }

    setCargandoReservas(true);
    // Obtenemos todas las reservas (admin) o las propias (residente)
    const promesa = puedeEditar
      ? servicioReservas.obtenerTodas()
      : servicioReservas.obtenerMisReservas();

    promesa
      .then(res => {
        const todas = res.data.datos || [];
        // Filtrar: reservas aprobadas del apartamento seleccionado
        const aprobadas = todas.filter(
          r => r.estado === 'aprobada' && String(r.id_apartamento) === String(aptId)
        );
        setReservasAprobadas(aprobadas);
        // Resetear la reserva seleccionada cuando cambia apartamento
        setDatosFormulario(prev => ({ ...prev, id_reserva: '' }));
      })
      .catch(err => console.error('Error cargando reservas:', err))
      .finally(() => setCargandoReservas(false));
  }, [datosFormulario.id_apartamento, puedeEditar, usuario]);

  // ── Helpers ────────────────────────────────────────────────────────────────
  const handleChange = (e) => {
    const { name, value } = e.target;
    setDatosFormulario(prev => ({ ...prev, [name]: value }));
  };

  const formatearFechaReserva = (fechaStr) => {
    if (!fechaStr) return '';
    const s = String(fechaStr);
    // "YYYY-MM-DD" sin hora → UTC midnight en JS → día anterior en UTC-5. Forzar hora local.
    const f = new Date(/^\d{4}-\d{2}-\d{2}$/.test(s) ? s + 'T00:00:00' : s.replace(' ', 'T'));
    if (isNaN(f.getTime())) return fechaStr;
    return f.toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  };

  const reservaSeleccionada = reservasAprobadas.find(
    r => String(r.id_reserva) === String(datosFormulario.id_reserva)
  );

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = (e) => {
    e.preventDefault();

    const aptId = puedeEditar
      ? parseInt(datosFormulario.id_apartamento)
      : usuario?.idApartamento;

    onGuardar({
      id_apartamento: aptId,
      id_inventario:  insumo.id_inventario,
      cantidad:       parseInt(datosFormulario.cantidad),
      id_reserva:     parseInt(datosFormulario.id_reserva)
      // Las fechas las asigna el backend automáticamente desde la reserva
    });
  };

  const aptSeleccionadoId = puedeEditar
    ? datosFormulario.id_apartamento
    : usuario?.idApartamento;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <>
      <div className="modal-backdrop fade show"></div>
      <div className="modal fade show d-block" tabIndex="-1">
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content border-0 shadow">

            <div className="modal-header bg-light border-bottom-0">
              <h5 className="modal-title fw-bold">
                <i className="bi bi-box-arrow-right me-2 text-success"></i>
                Registrar Préstamo
              </h5>
              <button type="button" className="btn-close" onClick={onCerrar}></button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="modal-body">

                {/* Info del insumo */}
                <div className="alert alert-info py-2 small mb-3">
                  <strong>Insumo:</strong> {insumo?.nombre_insumo}<br />
                  <strong>Disponible:</strong> {insumo?.cantidad_disponible} unidades
                </div>

                {/* Selector de usuario (sólo admin/supervisor) */}
                {puedeEditar && (
                  <div className="mb-3">
                    <label className="form-label small fw-semibold text-muted">
                      Usuario (Apartamento)
                    </label>
                    <select
                      className="form-select"
                      name="id_apartamento"
                      value={datosFormulario.id_apartamento}
                      onChange={handleChange}
                      required
                      disabled={cargandoUsuarios}
                    >
                      <option value="">Seleccione un apartamento...</option>
                      {usuarios.map(u => (
                        <option key={u.id_apartamento} value={u.id_apartamento}>
                          Apt {u.id_apartamento} — {u.nombre_titular}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Selector de reserva aprobada */}
                <div className="mb-3">
                  <label className="form-label small fw-semibold text-muted">
                    Reserva Aprobada
                  </label>
                  {cargandoReservas ? (
                    <div className="text-muted small py-1">
                      <span className="spinner-border spinner-border-sm me-1"></span>
                      Cargando reservas...
                    </div>
                  ) : !aptSeleccionadoId ? (
                    <div className="text-muted small py-1">
                      <i className="bi bi-info-circle me-1"></i>
                      Selecciona un apartamento primero.
                    </div>
                  ) : reservasAprobadas.length === 0 ? (
                    <div className="alert alert-warning py-2 small mb-0">
                      <i className="bi bi-exclamation-triangle me-1"></i>
                      Este apartamento no tiene reservas aprobadas. Aprueba una reserva primero.
                    </div>
                  ) : (
                    <select
                      className="form-select"
                      name="id_reserva"
                      value={datosFormulario.id_reserva}
                      onChange={handleChange}
                      required
                    >
                      <option value="">Seleccione una reserva...</option>
                      {reservasAprobadas.map(r => (
                        <option key={r.id_reserva} value={r.id_reserva}>
                          #{r.id_reserva} — {formatearFechaReserva(r.fecha_reserva)}
                        </option>
                      ))}
                    </select>
                  )}
                  {reservaSeleccionada && (
                    <div className="mt-2 p-2 bg-success bg-opacity-10 rounded small text-success">
                      <i className="bi bi-calendar-check me-1"></i>
                      <strong>Fecha préstamo:</strong> {formatearFechaReserva(reservaSeleccionada.fecha_reserva)} &mdash; 12:00 p.m.<br />
                      <i className="bi bi-clock me-1"></i>
                      <strong>Límite devolución:</strong> mismo día a las 11:59 p.m.
                    </div>
                  )}
                </div>

                {/* Cantidad */}
                <div className="mb-3">
                  <label className="form-label small fw-semibold text-muted">
                    Cantidad a prestar
                  </label>
                  <input
                    type="number"
                    className="form-control"
                    name="cantidad"
                    min="1"
                    max={insumo?.cantidad_disponible || 1}
                    value={datosFormulario.cantidad}
                    onChange={handleChange}
                    required
                  />
                  <div className="form-text" style={{ fontSize: '0.75rem' }}>
                    Máximo disponible: {insumo?.cantidad_disponible}
                  </div>
                </div>

              </div>

              <div className="modal-footer border-top-0 bg-light">
                <button type="button" className="btn btn-outline-secondary" onClick={onCerrar}>
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn btn-success"
                  disabled={!datosFormulario.id_reserva || reservasAprobadas.length === 0}
                >
                  <i className="bi bi-check2 me-1"></i>
                  Confirmar Préstamo
                </button>
              </div>
            </form>

          </div>
        </div>
      </div>
    </>
  );
}
