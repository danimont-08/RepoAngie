import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/ContextoAutenticacion';
import { servicioReservas } from '../services/servicioReservas';
import { servicioInventario } from '../services/servicioApi';
import { servicioPrestamos } from '../services/servicioPrestamos';

export default function PaginaReservas() {
  const { usuario, esAdmin } = useAuth();

  const [fechaActual, setFechaActual] = useState(new Date());
  const [reservasMes, setReservasMes] = useState([]);
  const [misReservas, setMisReservas] = useState([]);
  const [todasReservas, setTodasReservas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [mensaje, setMensaje] = useState(null);

  // Modal de confirmación de reserva
  const [modalAbierto, setModalAbierto] = useState(false);
  const [fechaSeleccionada, setFechaSeleccionada] = useState(null);
  const [procesando, setProcesando] = useState(false);

  // Formulario inline de préstamo de insumos
  const [formularioPrestamo, setFormularioPrestamo] = useState(null); // null = cerrado | { reservaId, insumos, insumoId, cantidad, enviando }
  const [insumosCache, setInsumosCache] = useState([]);

  // Filtro del panel admin
  const [filtroAdmin, setFiltroAdmin] = useState('activa');

  const mostrarMensaje = (tipo, texto) => {
    setMensaje({ tipo, texto });
    setTimeout(() => setMensaje(null), 5000);
  };

  const cargarDatos = useCallback(async () => {
    try {
      setCargando(true);
      const promesas = [
        servicioReservas.obtenerPorMes(fechaActual.getFullYear(), fechaActual.getMonth() + 1),
        servicioReservas.obtenerMisReservas(),
      ];
      if (esAdmin) {
        promesas.push(servicioReservas.obtenerTodas());
      }

      const res = await Promise.all(promesas);
      setReservasMes(res[0].data.datos || []);
      setMisReservas(res[1].data.datos || []);
      if (esAdmin && res[2]) {
        setTodasReservas(res[2].data.datos || []);
      }
    } catch (error) {
      console.error('Error cargando reservas:', error);
      mostrarMensaje('danger', 'Error al cargar las reservas');
    } finally {
      setCargando(false);
    }
  }, [fechaActual, esAdmin]);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  const cambiarMes = (incremento) => {
    const nuevaFecha = new Date(fechaActual);
    nuevaFecha.setMonth(nuevaFecha.getMonth() + incremento);
    setFechaActual(nuevaFecha);
  };

  // ── Formateo seguro de fechas ─────────────────────────────────────
  const formatearFecha = (strFecha, opciones) => {
    const f = parsearFecha(strFecha);
    if (!f) return strFecha || '';
    return f.toLocaleDateString('es-ES', opciones);
  };

  // ── Lógica de validación de fechas ──────────────────────────────
  const calcularLimiteMinimo = () => {
    const ahora = new Date();
    return new Date(ahora.getTime() + 48 * 60 * 60 * 1000);
  };

  const calcularLimiteMaximo = () => {
    const ahora = new Date();
    const limite = new Date(ahora);
    limite.setDate(limite.getDate() + 90);
    limite.setHours(23, 59, 59, 999);
    return limite;
  };

  // ── Parseo seguro de fecha (evita Invalid Date NaN y bug UTC) ─────────────
  // "YYYY-MM-DD" sin hora → JS interpreta UTC midnight → día anterior en UTC-5.
  // Se añade T00:00:00 para forzar interpretación en hora local.
  const parsearFecha = (strFecha) => {
    if (!strFecha || typeof strFecha !== 'string') return null;
    const s = strFecha.trim();
    const str = /^\d{4}-\d{2}-\d{2}$/.test(s) ? s + 'T00:00:00' : s.replace(' ', 'T');
    const f = new Date(str);
    if (!isNaN(f.getTime())) return f;
    const soloFecha = s.split('T')[0].split(' ')[0];
    const f2 = new Date(soloFecha + 'T00:00:00');
    return isNaN(f2.getTime()) ? null : f2;
  };

  // Fecha de devolución: mismo día del evento a las 23:59 (11:59 p.m.)
  // Se devuelve la misma fecha de la reserva, sin avanzar al día siguiente.
  const calcularDevolucion = (fechaReservaStr) => {
    const f = parsearFecha(fechaReservaStr);
    if (!f) return '';
    // Usar partes en hora local para evitar desfases UTC
    const pad = (n) => String(n).padStart(2, '0');
    return `${f.getFullYear()}-${pad(f.getMonth() + 1)}-${pad(f.getDate())}T23:59`;
  };

  // ── Abrir / cerrar formulario inline de préstamo ─────────────────
  const toggleFormPrestamo = async (reserva) => {
    // Si ya está abierto para esta reserva → cerrar
    if (formularioPrestamo?.reservaId === reserva.id_reserva) {
      setFormularioPrestamo(null);
      return;
    }
    try {
      let lista = insumosCache;
      if (lista.length === 0) {
        const res = await servicioInventario.obtenerTodos();
        lista = (res.data.datos || []).filter(i => i.cantidad_disponible > 0);
        setInsumosCache(lista);
      }
      if (lista.length === 0) {
        mostrarMensaje('warning', 'No hay insumos disponibles en este momento.');
        return;
      }
      setFormularioPrestamo({
        reservaId: reserva.id_reserva,
        fechaReserva: reserva.fecha_reserva,
        insumos: lista,
        insumoId: lista[0].id_inventario,
        cantidad: 1,
        itemsSeleccionados: [],
        enviando: false,
      });
    } catch (e) {
      mostrarMensaje('danger', 'Error al cargar insumos. Inténtalo de nuevo.');
    }
  };

  const cambiarCampoPrestamo = (campo, valor) => {
    setFormularioPrestamo(prev => ({ ...prev, [campo]: valor }));
  };

  const agregarItemPrestamo = () => {
    if (!formularioPrestamo) return;
    const { insumoId, cantidad, insumos, itemsSeleccionados } = formularioPrestamo;
    const insumo = insumos.find(i => i.id_inventario === insumoId);
    if (!insumo) return;

    const existe = itemsSeleccionados.find(i => i.id_inventario === insumoId);
    if (existe) {
      mostrarMensaje('warning', 'Ese insumo ya está en la lista. Si deseas cambiar la cantidad, elimínalo y vuelve a agregarlo.');
      return;
    }

    setFormularioPrestamo(prev => ({
      ...prev,
      itemsSeleccionados: [...prev.itemsSeleccionados, { ...insumo, cantidadSeleccionada: parseInt(cantidad) }],
      insumoId: insumos[0]?.id_inventario || '',
      cantidad: 1
    }));
  };

  const removerItemPrestamo = (id) => {
    setFormularioPrestamo(prev => ({
      ...prev,
      itemsSeleccionados: prev.itemsSeleccionados.filter(i => i.id_inventario !== id)
    }));
  };

  const enviarPrestamo = async () => {
    if (!formularioPrestamo) return;
    const { itemsSeleccionados, fechaReserva } = formularioPrestamo;
    
    if (itemsSeleccionados.length === 0) {
      mostrarMensaje('warning', 'Debes añadir al menos un insumo a tu solicitud.');
      return;
    }

    setFormularioPrestamo(prev => ({ ...prev, enviando: true }));
    try {
      const promesas = itemsSeleccionados.map(item =>
        servicioPrestamos.crear({
          id_inventario: item.id_inventario,
          cantidad: item.cantidadSeleccionada,
          fecha_prestamo: fechaReserva,
          fecha_devolucion: calcularDevolucion(fechaReserva),
          id_reserva: formularioPrestamo.reservaId
        })
      );
      
      await Promise.all(promesas);
      
      mostrarMensaje('success', '¡Préstamos solicitados correctamente! Recuerda devolver los insumos al finalizar el evento.');
      setFormularioPrestamo(null);
      setInsumosCache([]);
    } catch (error) {
      mostrarMensaje('danger', error.response?.data?.mensaje || 'Error al solicitar los préstamos');
      setFormularioPrestamo(prev => ({ ...prev, enviando: false }));
    }
  };

  const procesarClicDia = (dia) => {
    const strFecha = `${fechaActual.getFullYear()}-${(fechaActual.getMonth() + 1).toString().padStart(2, '0')}-${dia.toString().padStart(2, '0')}`;
    const fechaReq = new Date(strFecha + 'T00:00:00');
    const ahora = new Date();
    const horasDeAnticipacion = (fechaReq.getTime() - ahora.getTime()) / (1000 * 60 * 60);

    if (horasDeAnticipacion < 48) {
      mostrarMensaje('warning', 'Las reservas deben hacerse con al menos 48 horas de anticipación.');
      return;
    }
    if (fechaReq > calcularLimiteMaximo()) {
      mostrarMensaje('warning', 'No puedes reservar con más de 90 días de anticipación.');
      return;
    }

    setFechaSeleccionada(strFecha);
    setModalAbierto(true);
  };

  const confirmarReserva = async () => {
    try {
      setProcesando(true);
      await servicioReservas.crear({
        id_apartamento: usuario.idApartamento,
        fecha_reserva: fechaSeleccionada,
      });
      mostrarMensaje('success', '¡Reserva enviada! Queda pendiente de aprobación por el administrador.');
      setModalAbierto(false);
      cargarDatos();
    } catch (error) {
      mostrarMensaje('danger', error.response?.data?.mensaje || 'Error al confirmar la reserva');
    } finally {
      setProcesando(false);
    }
  };

  const cancelarReserva = async (id) => {
    if (!confirm('¿Estás seguro de cancelar esta reserva?')) return;
    try {
      await servicioReservas.cancelar(id);
      mostrarMensaje('success', 'Reserva cancelada.');
      cargarDatos();
    } catch (error) {
      mostrarMensaje('danger', error.response?.data?.mensaje || 'Error al cancelar la reserva');
    }
  };

  const aprobarReserva = async (id) => {
    try {
      await servicioReservas.aprobar(id);
      mostrarMensaje('success', 'Reserva aprobada correctamente.');
      cargarDatos();
    } catch (error) {
      mostrarMensaje('danger', error.response?.data?.mensaje || 'Error al aprobar la reserva');
    }
  };

  const rechazarReserva = async (id) => {
    if (!confirm('¿Estás seguro de rechazar esta reserva?')) return;
    try {
      await servicioReservas.rechazar(id);
      mostrarMensaje('success', 'Reserva rechazada.');
      cargarDatos();
    } catch (error) {
      mostrarMensaje('danger', error.response?.data?.mensaje || 'Error al rechazar la reserva');
    }
  };

  // ── Generación del calendario ────────────────────────────────────
  const diasSemana = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
  const mesActualStr = fechaActual.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
  const primerDia = new Date(fechaActual.getFullYear(), fechaActual.getMonth(), 1);
  const ultimoDia = new Date(fechaActual.getFullYear(), fechaActual.getMonth() + 1, 0);
  const diasDelMes = ultimoDia.getDate();
  const inicioSemana = primerDia.getDay() === 0 ? 6 : primerDia.getDay() - 1;

  const celdas = [];
  for (let i = 0; i < inicioSemana; i++) celdas.push(null);
  for (let d = 1; d <= diasDelMes; d++) celdas.push(d);

  // ── Badges por estado ────────────────────────────────────────────
  const badgeEstado = (estado) => {
    const mapa = {
      activa: 'bg-warning bg-opacity-10 text-warning',
      aprobada: 'bg-success bg-opacity-10 text-success',
      rechazada: 'bg-danger bg-opacity-10 text-danger',
      cancelada: 'bg-secondary bg-opacity-10 text-secondary',
    };
    const etiqueta = {
      activa: 'Pendiente',
      aprobada: 'Aprobada',
      rechazada: 'Rechazada',
      cancelada: 'Cancelada',
    };
    return <span className={`badge ${mapa[estado] || 'bg-secondary'}`}>{etiqueta[estado] || estado}</span>;
  };

  // ── Reservas filtradas para el panel admin ────────────────────────
  const reservasFiltradas = todasReservas.filter(r =>
    filtroAdmin === 'todas' ? true : r.estado === filtroAdmin
  );
  const pendientesCount = todasReservas.filter(r => r.estado === 'activa').length;

  return (
    <div>
      {/* Mensaje */}
      {mensaje && (
        <div className={`alert alert-${mensaje.tipo} alert-dismissible fade show d-flex align-items-center gap-2 small`} role="alert">
          <i className={`bi ${mensaje.tipo === 'success' ? 'bi-check-circle' : mensaje.tipo === 'warning' ? 'bi-exclamation-triangle' : 'bi-exclamation-circle'}`}></i>
          {mensaje.texto}
          <button type="button" className="btn-close" onClick={() => setMensaje(null)}></button>
        </div>
      )}

      {/* Header */}
      <div className="mb-4 bg-white p-4 rounded-4 shadow-sm border-0">
        <h4 className="fw-bold mb-1 text-primary">
          {esAdmin ? 'Gestión de Reservas' : 'Centro de Reservas'}
        </h4>
        <p className="text-muted small mb-0">
          {esAdmin
            ? 'Aprueba, rechaza y gestiona todas las reservas del sistema'
            : 'Consulta disponibilidad y gestiona tus reservas del salón social'}
        </p>
      </div>

      <div className="row g-4">
        {/* ── Calendario ─────────────────────────────────────────── */}
        <div className={esAdmin ? 'col-lg-5' : 'col-lg-7'}>
          <div className="card shadow border-0 rounded-4 h-100 overflow-hidden">
            <div className="card-body p-4">
              <div className="d-flex align-items-center justify-content-between mb-3">
                <div className="d-flex align-items-center gap-2">
                  <div className="rounded-3 p-2 bg-primary bg-opacity-10">
                    <i className="bi bi-calendar3 text-primary"></i>
                  </div>
                  <div>
                    <h6 className="fw-semibold mb-0">Disponibilidad</h6>
                    {!esAdmin && <small className="text-muted">Haz clic en un día disponible para reservar</small>}
                  </div>
                </div>
                <div className="d-flex align-items-center gap-2">
                  <button className="btn btn-sm btn-light" onClick={() => cambiarMes(-1)}>
                    <i className="bi bi-chevron-left"></i>
                  </button>
                  <span className="fw-medium text-capitalize" style={{ minWidth: '110px', textAlign: 'center' }}>
                    {mesActualStr}
                  </span>
                  <button className="btn btn-sm btn-light" onClick={() => cambiarMes(1)}>
                    <i className="bi bi-chevron-right"></i>
                  </button>
                </div>
              </div>

              {cargando ? (
                <div className="text-center py-5">
                  <div className="spinner-border text-primary" role="status"></div>
                </div>
              ) : (
                <>
                  <div className="d-grid text-center mb-2" style={{ gridTemplateColumns: 'repeat(7, 1fr)' }}>
                    {diasSemana.map((dia) => (
                      <div key={dia} className="small fw-semibold text-muted py-1">{dia}</div>
                    ))}
                  </div>
                  <div className="d-grid text-center" style={{ gridTemplateColumns: 'repeat(7, 1fr)', gap: '10px 0' }}>
                    {celdas.map((dia, idx) => {
                      if (dia === null) return <div key={idx} className="py-1"></div>;

                      const strFechaIteracion = `${fechaActual.getFullYear()}-${(fechaActual.getMonth() + 1).toString().padStart(2, '0')}-${dia.toString().padStart(2, '0')}`;
                      const fechaReq = new Date(strFechaIteracion + 'T00:00:00');
                      const ahora = new Date();
                      const horasDeAnticipacion = (fechaReq.getTime() - ahora.getTime()) / (1000 * 60 * 60);

                      const esMuyPronto = horasDeAnticipacion < 48;
                      const esMuyLejano = fechaReq > calcularLimiteMaximo();
                      const noPermitido = esMuyPronto || esMuyLejano;

                      const esHoy = ahora.getDate() === dia && ahora.getMonth() === fechaActual.getMonth() && ahora.getFullYear() === fechaActual.getFullYear();

                      const reservasDelDia = reservasMes.filter(r => {
                        const diaR = new Date(r.fecha_reserva + 'T00:00:00').getDate();
                        return diaR === dia && (r.estado === 'activa' || r.estado === 'aprobada');
                      });
                      const estaReservado = reservasDelDia.length > 0;
                      const reservaAprobada = reservasDelDia.some(r => r.estado === 'aprobada');

                      let claseColor = 'bg-light text-dark';
                      let cursor = 'pointer';
                      let title = 'Disponible — clic para reservar';

                      if (noPermitido && !esAdmin) {
                        claseColor = 'text-muted opacity-25';
                        cursor = 'not-allowed';
                        title = esMuyPronto ? 'Mín 48h de anticipación' : 'Máx 90 días permitidos';
                      } else if (estaReservado) {
                        claseColor = reservaAprobada ? 'bg-success text-white opacity-75' : 'bg-danger text-white opacity-75';
                        cursor = 'not-allowed';
                        title = `${reservaAprobada ? 'Reserva aprobada' : 'Reservado'} — Apt ${reservasDelDia[0].id_apartamento}`;
                      } else if (esHoy) {
                        claseColor = 'bg-primary text-white';
                        if (noPermitido && !esAdmin) cursor = 'not-allowed';
                      }

                      const puedeCliclar = !estaReservado && (!noPermitido || esAdmin);

                      return (
                        <div key={idx} className="py-1 d-flex justify-content-center">
                          <button
                            type="button"
                            disabled={!puedeCliclar}
                            onClick={() => puedeCliclar ? procesarClicDia(dia) : null}
                            className={`btn rounded-circle d-flex align-items-center justify-content-center p-0 border-0 ${claseColor}`}
                            style={{ width: 40, height: 40, cursor: cursor }}
                            title={title}
                          >
                            <span className={esHoy ? 'fw-bold' : ''}>{dia}</span>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Leyenda */}
          <div className="d-flex flex-wrap gap-3 mt-3 ms-1 small">
            <div className="d-flex align-items-center gap-2 text-muted">
              <span className="rounded-circle bg-light border d-inline-block" style={{ width: 12, height: 12 }}></span>
              Disponible
            </div>
            <div className="d-flex align-items-center gap-2 text-muted">
              <span className="rounded-circle bg-danger opacity-75 d-inline-block" style={{ width: 12, height: 12 }}></span>
              Pendiente
            </div>
            <div className="d-flex align-items-center gap-2 text-muted">
              <span className="rounded-circle bg-success opacity-75 d-inline-block" style={{ width: 12, height: 12 }}></span>
              Aprobada
            </div>
            <div className="d-flex align-items-center gap-2 text-muted">
              <span className="rounded-circle bg-primary d-inline-block" style={{ width: 12, height: 12 }}></span>
              Hoy
            </div>
          </div>
        </div>

        {/* ── Panel derecho ───────────────────────────────────────── */}
        <div className={esAdmin ? 'col-lg-7' : 'col-lg-5'}>

          {/* ──── ADMIN: Panel de gestión completo ──── */}
          {esAdmin && (
            <div className="card shadow border-0 h-100 rounded-4 overflow-hidden">
              <div className="card-body p-4">
                <div className="d-flex align-items-center justify-content-between mb-3">
                  <div className="d-flex align-items-center gap-2">
                    <div className="rounded-3 p-2 bg-warning bg-opacity-10">
                      <i className="bi bi-clipboard-check text-warning"></i>
                    </div>
                    <div>
                      <h6 className="fw-semibold mb-0">Panel de Aprobaciones</h6>
                      {pendientesCount > 0 && (
                        <span className="badge bg-warning text-dark small">{pendientesCount} pendiente(s)</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Filtros */}
                <div className="d-flex gap-2 mb-3 flex-wrap">
                  {['activa', 'aprobada', 'rechazada', 'cancelada', 'todas'].map(f => (
                    <button
                      key={f}
                      className={`btn btn-sm ${filtroAdmin === f ? 'btn-primary' : 'btn-outline-secondary'}`}
                      onClick={() => setFiltroAdmin(f)}
                    >
                      {f === 'activa' ? 'Pendientes' : f === 'todas' ? 'Todas' : f.charAt(0).toUpperCase() + f.slice(1)}
                      {f === 'activa' && pendientesCount > 0 && (
                        <span className="badge bg-danger ms-1" style={{ fontSize: 9 }}>{pendientesCount}</span>
                      )}
                    </button>
                  ))}
                </div>

                {cargando ? (
                  <div className="text-center py-4"><div className="spinner-border text-primary spinner-border-sm"></div></div>
                ) : reservasFiltradas.length === 0 ? (
                  <div className="text-center py-4 text-muted border rounded bg-light">
                    <i className="bi bi-calendar-x fs-3 d-block mb-2 opacity-50"></i>
                    <span className="small">No hay reservas en esta categoría.</span>
                  </div>
                ) : (
                  <div className="list-group list-group-flush" style={{ maxHeight: '50vh', overflowY: 'auto' }}>
                    {reservasFiltradas.map(reserva => {
                      // ── Parseo seguro de fecha ──────────────────────
                      const fechaObj = parsearFecha(reserva.fecha_reserva);
                      const diaMes = fechaObj
                        ? fechaObj.toLocaleDateString('es-ES', { month: 'short' }).toUpperCase()
                        : '—';
                      const diaN = fechaObj ? fechaObj.getDate() : '?';

                      return (
                        <div key={reserva.id_reserva} className="list-group-item px-0 py-3 border-bottom">
                          <div className="d-flex justify-content-between align-items-start gap-2">
                            <div className="d-flex gap-3 align-items-start">
                              <div className="bg-primary bg-opacity-10 rounded px-2 py-1 text-center" style={{ minWidth: 46 }}>
                                <div className="small fw-bold text-primary" style={{ fontSize: 10 }}>
                                  {diaMes}
                                </div>
                                <div className="fs-6 fw-bold text-primary" style={{ lineHeight: 1 }}>{diaN}</div>
                              </div>
                              <div>
                                <div className="fw-semibold small">{reserva.nombre_titular}</div>
                                <div className="text-muted" style={{ fontSize: 12 }}>Apt {reserva.id_apartamento}</div>
                                <div className="mt-1">{badgeEstado(reserva.estado)}</div>
                              </div>
                            </div>
                            {/* Acciones solo para reservas pendientes */}
                            {reserva.estado === 'activa' && (
                              <div className="d-flex gap-1 flex-shrink-0">
                                <button
                                  className="btn btn-sm btn-success"
                                  onClick={() => aprobarReserva(reserva.id_reserva)}
                                  title="Aprobar reserva"
                                >
                                  <i className="bi bi-check-lg"></i> Aprobar
                                </button>
                                <button
                                  className="btn btn-sm btn-outline-danger"
                                  onClick={() => rechazarReserva(reserva.id_reserva)}
                                  title="Rechazar reserva"
                                >
                                  <i className="bi bi-x-lg"></i>
                                </button>
                              </div>
                            )}
                            {/* Cancelar para aprobadas */}
                            {reserva.estado === 'aprobada' && (
                              <button
                                className="btn btn-sm btn-outline-secondary"
                                onClick={() => cancelarReserva(reserva.id_reserva)}
                                title="Cancelar reserva aprobada"
                              >
                                <i className="bi bi-x-circle"></i>
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ──── RESIDENTE: Mis reservas ──── */}
          {!esAdmin && (
            <div className="card shadow border-0 h-100 rounded-4 overflow-hidden">
              <div className="card-body p-4">
                <div className="d-flex align-items-center gap-2 mb-3">
                  <div className="rounded-3 p-2 bg-success bg-opacity-10">
                    <i className="bi bi-clock-history text-success"></i>
                  </div>
                  <h6 className="fw-semibold mb-0">Mis Reservas</h6>
                </div>

                {/* Info de reglas */}
                <div className="alert alert-info small mb-3 py-2">
                  <i className="bi bi-info-circle me-1"></i>
                  Mínimo <strong>48h</strong> de anticipación · Máximo <strong>90 días</strong>.
                  Las reservas quedan pendientes hasta que el administrador las apruebe.
                </div>

                {cargando ? (
                  <div className="text-center py-4"><div className="spinner-border spinner-border-sm text-primary"></div></div>
                ) : misReservas.length === 0 ? (
                  <div className="text-center py-4 text-muted border rounded bg-light">
                    <i className="bi bi-calendar-x fs-3 d-block mb-2 opacity-50"></i>
                    <span className="small">No tienes reservas. Haz clic en un día disponible del calendario.</span>
                  </div>
                ) : (
                  <div className="list-group list-group-flush" style={{ maxHeight: '65vh', overflowY: 'auto' }}>
                    {misReservas.map(reserva => {
                      // ── Parseo seguro de fecha ──────────────────────
                      const fechaObj = parsearFecha(reserva.fecha_reserva);
                      const diaMes = fechaObj
                        ? fechaObj.toLocaleDateString('es-ES', { month: 'short' }).toUpperCase()
                        : '—';
                      const diaN = fechaObj ? fechaObj.getDate() : '?';
                      const diaSemana = fechaObj
                        ? fechaObj.toLocaleDateString('es-ES', { weekday: 'long' })
                        : '';

                      const formularioAbierto = formularioPrestamo?.reservaId === reserva.id_reserva;
                      const insumoActual = formularioPrestamo?.insumos?.find(
                        i => i.id_inventario === formularioPrestamo.insumoId
                      );

                      return (
                        <div key={reserva.id_reserva} className="list-group-item px-0 py-3 border-bottom">
                          {/* ── Fila principal ── */}
                          <div className="d-flex justify-content-between align-items-center">
                            <div className="d-flex gap-3 align-items-center">
                              <div className="bg-primary bg-opacity-10 rounded px-2 py-1 text-center" style={{ minWidth: 46 }}>
                                <div className="small fw-bold text-primary" style={{ fontSize: 10 }}>{diaMes}</div>
                                <div className="fs-6 fw-bold text-primary" style={{ lineHeight: 1 }}>{diaN}</div>
                              </div>
                              <div>
                                <div className="fw-semibold small">Salón Social</div>
                                <div className="text-muted" style={{ fontSize: 12 }}>{diaSemana}</div>
                                <div className="mt-1">{badgeEstado(reserva.estado)}</div>
                              </div>
                            </div>
                            {/* Acciones */}
                            <div className="d-flex flex-column gap-1 align-items-end">
                              {reserva.estado === 'aprobada' && (
                                <button
                                  className={`btn btn-sm rounded-pill px-3 shadow-sm ${formularioAbierto ? 'btn-secondary' : 'btn-primary'} d-flex align-items-center gap-1`}
                                  onClick={() => toggleFormPrestamo(reserva)}
                                  title={formularioAbierto ? 'Cerrar formulario' : 'Solicitar préstamo de insumos'}
                                >
                                  <i className={`bi ${formularioAbierto ? 'bi-chevron-up' : 'bi-box-seam'}`}></i>
                                  <span>{formularioAbierto ? 'Cerrar' : 'Pedir Insumos'}</span>
                                </button>
                              )}
                              {reserva.estado === 'activa' && (
                                <button
                                  className="btn btn-sm btn-outline-danger"
                                  onClick={() => cancelarReserva(reserva.id_reserva)}
                                  title="Cancelar reserva"
                                >
                                  <i className="bi bi-x-lg"></i>
                                </button>
                              )}
                            </div>
                          </div>

                          {/* ── Formulario inline de préstamo ── */}
                          {formularioAbierto && formularioPrestamo && (
                            <div className="mt-3 p-4 rounded-4 shadow-sm" style={{ background: '#f8f9fa', border: '1px solid #e9ecef' }}>

                              {/* Alerta obligatoria de devolución */}
                              <div className="alert alert-warning py-2 small mb-3 d-flex align-items-start gap-2">
                                <i className="bi bi-exclamation-triangle-fill text-warning mt-1 flex-shrink-0"></i>
                                <span>
                                  <strong>¡Importante!</strong> El salón se presta de <strong>12:00 m</strong> a <strong>12:00 a.m.</strong> del día siguiente.
                                  Los insumos deben ser devueltos al finalizar el evento, antes de las 12:00 a.m. No cumplir con la devolución puede generar sanciones.
                                </span>
                              </div>

                              <div className="row g-2 mb-3">
                                {/* Seleccionar insumo */}
                                <div className="col-sm-6">
                                  <label className="form-label small fw-semibold text-muted mb-1">
                                    <i className="bi bi-box-seam me-1"></i>Insumo a solicitar
                                  </label>
                                  <select
                                    className="form-select form-select-sm"
                                    value={formularioPrestamo.insumoId}
                                    onChange={e => cambiarCampoPrestamo('insumoId', parseInt(e.target.value))}
                                  >
                                    {formularioPrestamo.insumos.map(i => (
                                      <option key={i.id_inventario} value={i.id_inventario}>
                                        {i.nombre_insumo} — disp: {i.cantidad_disponible}
                                      </option>
                                    ))}
                                  </select>
                                </div>

                                {/* Cantidad */}
                                <div className="col-sm-4">
                                  <label className="form-label small fw-semibold text-muted mb-1">
                                    <i className="bi bi-hash me-1"></i>Cantidad
                                  </label>
                                  <input
                                    type="number"
                                    className="form-control form-control-sm"
                                    min={1}
                                    max={insumoActual?.cantidad_disponible || 1}
                                    value={formularioPrestamo.cantidad}
                                    onChange={e => cambiarCampoPrestamo('cantidad', e.target.value)}
                                  />
                                </div>

                                {/* Botón Añadir */}
                                <div className="col-sm-2 d-flex align-items-end">
                                  <button
                                    type="button"
                                    className="btn btn-sm btn-primary w-100 mb-1"
                                    onClick={agregarItemPrestamo}
                                    disabled={!insumoActual || insumoActual.cantidad_disponible < 1}
                                    style={{ height: '31px' }}
                                  >
                                    <i className="bi bi-plus-lg"></i>
                                  </button>
                                </div>
                              </div>

                              {/* Lista de insumos seleccionados */}
                              {formularioPrestamo.itemsSeleccionados.length > 0 && (
                                <div className="mb-3">
                                  <label className="form-label small fw-semibold text-muted mb-1">
                                    <i className="bi bi-cart me-1"></i>Insumos agregados
                                  </label>
                                  <ul className="list-group list-group-sm mb-2" style={{ fontSize: '0.85rem' }}>
                                    {formularioPrestamo.itemsSeleccionados.map(item => (
                                      <li key={item.id_inventario} className="list-group-item d-flex justify-content-between align-items-center py-1 bg-white">
                                        <span><strong>{item.cantidadSeleccionada}x</strong> {item.nombre_insumo}</span>
                                        <button 
                                          className="btn btn-link text-danger p-0 m-0" 
                                          onClick={() => removerItemPrestamo(item.id_inventario)}
                                          title="Quitar de la lista"
                                        >
                                          <i className="bi bi-trash"></i>
                                        </button>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}

                              {/* Fecha de uso — fija, no editable */}
                              <div className="mb-3">
                                <label className="form-label small fw-semibold text-muted mb-1">
                                  <i className="bi bi-calendar-event me-1"></i>Fecha del evento (tu reserva)
                                </label>
                                <input
                                  type="text"
                                  className="form-control form-control-sm bg-light"
                                  value={(() => {
                                    const f = parsearFecha(formularioPrestamo.fechaReserva);
                                    if (!f) return '';
                                    return f.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) + ' — 12:00 p.m.';
                                  })()}
                                  readOnly
                                  style={{ cursor: 'not-allowed' }}
                                />
                                <div className="form-text" style={{ fontSize: '0.73rem' }}>
                                  La fecha coincide automáticamente con tu reserva aprobada.
                                </div>
                              </div>

                              {/* Fecha de devolución — calculada automáticamente */}
                              <div className="mb-3">
                                <label className="form-label small fw-semibold text-muted mb-1">
                                  <i className="bi bi-arrow-return-left me-1"></i>Límite de devolución
                                </label>
                                <input
                                  type="text"
                                  className="form-control form-control-sm bg-light"
                                  value={(() => {
                                    const d = calcularDevolucion(formularioPrestamo.fechaReserva);
                                    if (!d) return '';
                                    const f = new Date(d);
                                    return isNaN(f.getTime()) ? '' :
                                      f.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) + ' — 11:59 p.m.';
                                  })()}
                                  readOnly
                                  style={{ cursor: 'not-allowed' }}
                                />
                              </div>

                              {/* Botones */}
                              <div className="d-flex gap-2 justify-content-end">
                                <button
                                  className="btn btn-sm btn-outline-secondary"
                                  onClick={() => setFormularioPrestamo(null)}
                                  disabled={formularioPrestamo.enviando}
                                >
                                  Cancelar
                                </button>
                                <button
                                  className="btn btn-sm btn-success"
                                  onClick={enviarPrestamo}
                                  disabled={formularioPrestamo.enviando || formularioPrestamo.itemsSeleccionados.length === 0}
                                >
                                  {formularioPrestamo.enviando ? (
                                    <><span className="spinner-border spinner-border-sm me-1"></span>Enviando...</>
                                  ) : (
                                    <><i className="bi bi-check-lg me-1"></i>Confirmar Préstamo</>
                                  )}
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Modal de confirmación de reserva ──────────────────────── */}
      {modalAbierto && (
        <>
          <div className="modal-backdrop fade show"></div>
          <div className="modal fade show d-block" tabIndex="-1">
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content border-0 shadow">
                <div className="modal-header bg-primary text-white border-bottom-0 rounded-top">
                  <h5 className="modal-title fw-bold">Confirmar Reserva</h5>
                  <button type="button" className="btn-close btn-close-white" onClick={() => setModalAbierto(false)}></button>
                </div>
                <div className="modal-body p-4 text-center">
                  <i className="bi bi-building fs-1 text-primary mb-3"></i>
                  <h5 className="fw-semibold">¿Reservar el salón social?</h5>
                  <p className="text-muted mb-3">
                    Fecha seleccionada:
                    <br />
                    <strong className="fs-5 text-dark mt-1 d-inline-block">
                      {formatearFecha(fechaSeleccionada, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                    </strong>
                  </p>
                  <div className="alert alert-info small text-start d-flex gap-2">
                    <i className="bi bi-info-circle mt-1 flex-shrink-0"></i>
                    <span>
                      Al confirmar, tu reserva quedará <strong>pendiente de aprobación</strong> por el administrador.
                      Solo con la reserva aprobada podrás solicitar préstamos de insumos.
                    </span>
                  </div>
                </div>
                <div className="modal-footer bg-light border-top-0 rounded-bottom">
                  <button type="button" className="btn btn-outline-secondary" onClick={() => setModalAbierto(false)}>
                    Cancelar
                  </button>
                  <button type="button" className="btn btn-primary" onClick={confirmarReserva} disabled={procesando}>
                    {procesando ? (
                      <><span className="spinner-border spinner-border-sm me-2"></span>Procesando...</>
                    ) : 'Confirmar Reserva'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Sin modal de préstamos — el formulario es inline en la lista de reservas */}
    </div>
  );
}