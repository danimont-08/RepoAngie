import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/ContextoAutenticacion';
import { servicioInventario } from '../services/servicioApi';
import { servicioReservas } from '../services/servicioReservas';
import ModalInventario from '../components/ModalInventario';
import ModalPrestar from '../components/ModalPrestar';
import ModalPrestamosActivos from '../components/ModalPrestamosActivos';
import { servicioPrestamos } from '../services/servicioPrestamos';
import './PaginaInventario.css';

export default function PaginaInventario() {
  const { esAdmin, esSupervisor, esResidente } = useAuth();
  const puedeEditar = esAdmin || esSupervisor;

  const [insumos, setInsumos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [modalAbierto, setModalAbierto] = useState(false);
  const [insumoEditar, setInsumoEditar] = useState(null);
  const [mensaje, setMensaje] = useState(null);
  const [tieneReservaAprobada, setTieneReservaAprobada] = useState(false);

  const [modalPrestarAbierto, setModalPrestarAbierto] = useState(false);
  const [insumoPrestar, setInsumoPrestar] = useState(null);
  const [modalPrestamosActivosAbierto, setModalPrestamosActivosAbierto] = useState(false);

  const cargarInsumos = useCallback(async () => {
    try {
      setCargando(true);
      const respuesta = await servicioInventario.obtenerTodos();
      setInsumos(respuesta.data.datos || []);
    } catch (error) {
      console.error('Error cargando inventario:', error);
      mostrarMensaje('danger', 'Error al cargar inventario');
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargarInsumos();
  }, [cargarInsumos]);

  // Verificar si el residente tiene al menos una reserva aprobada
  useEffect(() => {
    if (!esResidente) return;
    servicioReservas.obtenerMisReservas()
      .then(res => {
        const aprobadas = (res.data.datos || []).filter(r => r.estado === 'aprobada');
        setTieneReservaAprobada(aprobadas.length > 0);
      })
      .catch(() => setTieneReservaAprobada(false));
  }, [esResidente]);

  const mostrarMensaje = (tipo, texto) => {
    setMensaje({ tipo, texto });
    setTimeout(() => setMensaje(null), 4000);
  };

  const abrirModalCrear = () => {
    setInsumoEditar(null);
    setModalAbierto(true);
  };

  const abrirModalEditar = (insumo) => {
    setInsumoEditar(insumo);
    setModalAbierto(true);
  };

  const cerrarModal = () => {
    setModalAbierto(false);
    setInsumoEditar(null);
  };

  const guardarInsumo = async (datosFormulario) => {
    try {
      if (insumoEditar) {
        await servicioInventario.actualizar(insumoEditar.id_inventario, datosFormulario);
        mostrarMensaje('success', 'Insumo actualizado correctamente');
      } else {
        await servicioInventario.crear(datosFormulario);
        mostrarMensaje('success', 'Insumo creado correctamente');
      }
      cerrarModal();
      cargarInsumos();
    } catch (error) {
      const mensajeError = error.response?.data?.mensaje || 'Error al guardar insumo';
      mostrarMensaje('danger', mensajeError);
    }
  };

  const abrirModalPrestar = (insumo) => {
    setInsumoPrestar(insumo);
    setModalPrestarAbierto(true);
  };

  const guardarPrestamo = async (datos) => {
    try {
      const respuesta = await servicioPrestamos.crear(datos);
      const msg = respuesta.data?.mensaje || 'Préstamo registrado exitosamente';
      mostrarMensaje('success', msg);
      setModalPrestarAbierto(false);
      setInsumoPrestar(null);
      cargarInsumos();
    } catch (error) {
      mostrarMensaje('danger', error.response?.data?.mensaje || 'Error al registrar préstamo');
    }
  };

  const eliminarInsumo = async (insumo) => {
    if (!confirm(`¿Está seguro de eliminar "${insumo.nombre_insumo}"?`)) return;
    try {
      await servicioInventario.eliminar(insumo.id_inventario);
      mostrarMensaje('success', 'Insumo eliminado correctamente');
      cargarInsumos();
    } catch (error) {
      mostrarMensaje('danger', 'Error al eliminar insumo');
    }
  };

  const insumosFiltrados = insumos.filter((i) =>
    i.nombre_insumo.toLowerCase().includes(busqueda.toLowerCase())
  );

  const calcularPorcentaje = (disponible, total) => {
    if (total === 0) return 0;
    return Math.round((disponible / total) * 100);
  };

  const obtenerColorBarra = (porcentaje) => {
    if (porcentaje > 60) return '#10B981';
    if (porcentaje > 30) return '#F59E0B';
    return '#EF4444';
  };

  return (
    <div>
      {/* Mensaje */}
      {mensaje && (
        <div className={`alert alert-${mensaje.tipo} alert-dismissible fade show d-flex align-items-center justify-content-between small`} role="alert">
          <div className="d-flex align-items-center gap-2">
             <i className={`bi ${mensaje.tipo === 'success' ? 'bi-check-circle' : 'bi-exclamation-circle'}`}></i>
             {mensaje.texto}
             {mensaje.texto.includes('reservación') && (
               <Link to="/reservas" className="btn btn-sm btn-danger px-2 py-0 ms-2" onClick={() => setMensaje(null)}>Agendar ahora</Link>
             )}
          </div>
          <button type="button" className="btn-close" onClick={() => setMensaje(null)}></button>
        </div>
      )}

      {/* Header */}
      <div className="d-flex flex-column flex-sm-row justify-content-between align-items-start align-items-sm-center gap-3 mb-4">
        <div>
          <h4 className="fw-bold mb-1">Inventario del Salón</h4>
          <p className="text-muted small mb-0">Control de insumos y artículos disponibles</p>
        </div>
        <div className="d-flex flex-wrap gap-2">
          {!puedeEditar && (
            <button className="btn btn-outline-primary d-flex align-items-center gap-2" onClick={() => setModalPrestamosActivosAbierto(true)}>
              <i className="bi bi-card-checklist"></i>
              Mis Préstamos
            </button>
          )}
          {puedeEditar && (
            <>
              <button className="btn btn-outline-primary d-flex align-items-center gap-2" onClick={() => setModalPrestamosActivosAbierto(true)}>
                <i className="bi bi-card-checklist"></i>
                Préstamos Activos
              </button>
              <button className="btn btn-nuevo-insumo d-flex align-items-center gap-2" onClick={abrirModalCrear}>
                <i className="bi bi-plus-lg"></i>
                Nuevo Insumo
              </button>
            </>
          )}
        </div>
      </div>

      {/* Búsqueda */}
      <div className="mb-3" style={{ maxWidth: 400 }}>
        <div className="input-group">
          <span className="input-group-text bg-white">
            <i className="bi bi-search text-muted"></i>
          </span>
          <input
            type="text"
            className="form-control border-start-0"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar insumo..."
          />
        </div>
      </div>

      {/* Tabla */}
      <div className="card shadow-sm border-0">
        <div className="table-responsive">
          <table className="table table-hover mb-0">
            <thead className="table-light">
              <tr>
                <th className="small fw-semibold text-muted">Insumo</th>
                <th className="small fw-semibold text-muted text-center">Total</th>
                <th className="small fw-semibold text-muted text-center">Disponible</th>
                <th className="small fw-semibold text-muted d-none d-sm-table-cell">Disponibilidad</th>
                <th className="small fw-semibold text-muted text-end">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {cargando ? (
                <tr>
                  <td colSpan={5} className="text-center py-4 text-muted">
                    <div className="spinner-border spinner-border-sm me-2"></div>
                    Cargando inventario...
                  </td>
                </tr>
              ) : insumosFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-4 text-muted">
                    <i className="bi bi-box-seam fs-3 d-block mb-2 text-secondary opacity-50"></i>
                    No se encontraron insumos
                  </td>
                </tr>
              ) : (
                insumosFiltrados.map((insumo) => {
                  const porcentaje = calcularPorcentaje(insumo.cantidad_disponible, insumo.cantidad_total);
                  const colorBarra = obtenerColorBarra(porcentaje);

                  return (
                    <tr key={insumo.id_inventario}>
                      <td className="fw-medium">{insumo.nombre_insumo}</td>
                      <td className="text-center">{insumo.cantidad_total}</td>
                      <td className="text-center fw-medium">{insumo.cantidad_disponible}</td>
                      <td className="d-none d-sm-table-cell">
                        <div className="d-flex align-items-center gap-2">
                          <div className="barra-disponibilidad flex-grow-1">
                            <div
                              className="barra-disponibilidad-relleno"
                              style={{ width: `${porcentaje}%`, backgroundColor: colorBarra }}
                            ></div>
                          </div>
                          <span className="small text-muted" style={{ minWidth: 35 }}>{porcentaje}%</span>
                        </div>
                      </td>
                      <td className="text-end">
                        {/* Residente: solo si tiene reserva aprobada | Admin/Supervisor: siempre */}
                        {(!esResidente || tieneReservaAprobada) && (
                          <button
                            className="btn btn-sm btn-outline-success me-1"
                            onClick={() => abrirModalPrestar(insumo)}
                            title={esResidente ? 'Solicitar insumo' : 'Prestar'}
                            disabled={insumo.cantidad_disponible === 0}
                          >
                            <i className="bi bi-box-arrow-right"></i>
                          </button>
                        )}
                        {puedeEditar && (
                          <>
                            <button
                              className="btn btn-sm btn-outline-primary me-1"
                              onClick={() => abrirModalEditar(insumo)}
                              title="Editar"
                            >
                              <i className="bi bi-pencil"></i>
                            </button>
                            {esAdmin && (
                              <button
                                className="btn btn-sm btn-outline-danger"
                                onClick={() => eliminarInsumo(insumo)}
                                title="Eliminar"
                              >
                                <i className="bi bi-trash"></i>
                              </button>
                            )}
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {modalAbierto && (
        <ModalInventario
          insumo={insumoEditar}
          onGuardar={guardarInsumo}
          onCerrar={cerrarModal}
        />
      )}

      {modalPrestarAbierto && insumoPrestar && (
        <ModalPrestar
          insumo={insumoPrestar}
          onGuardar={guardarPrestamo}
          onCerrar={() => {
            setModalPrestarAbierto(false);
            setInsumoPrestar(null);
          }}
        />
      )}

      {modalPrestamosActivosAbierto && (
        <ModalPrestamosActivos
          onCerrar={() => setModalPrestamosActivosAbierto(false)}
          recargarInventario={cargarInsumos}
        />
      )}
    </div>
  );
}