import { useState, useEffect } from 'react';
import { servicioReservas } from '../services/servicioReservas';
import { servicioPrestamos } from '../services/servicioPrestamos';
import { servicioInventario } from '../services/servicioApi';
import './PaginaReportes.css';

export default function PaginaReportes() {
  const [tipoReporte, setTipoReporte] = useState('reservas');
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('todos');
  const [filtroBusqueda, setFiltroBusqueda] = useState('');

  const [datosOriginales, setDatosOriginales] = useState([]);
  const [datosFiltrados, setDatosFiltrados] = useState([]);
  const [cargando, setCargando] = useState(false);

  const cargarDatos = async () => {
    setCargando(true);
    try {
      if (tipoReporte === 'reservas') {
        const resp = await servicioReservas.obtenerTodas();
        setDatosOriginales(resp.data.datos || []);
      } else if (tipoReporte === 'prestamos') {
        const resp = await servicioPrestamos.obtenerTodos();
        setDatosOriginales(resp.data.datos || []);
      } else if (tipoReporte === 'inventario') {
        const resp = await servicioInventario.obtenerTodos();
        setDatosOriginales(resp.data.datos || []);
      }
    } catch (error) {
      console.error('Error cargando reportes:', error);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, [tipoReporte]);

  useEffect(() => {
    let filtrados = [...datosOriginales];

    // Filtro de fecha para Reservas y Préstamos
    if (tipoReporte === 'reservas' && (fechaInicio || fechaFin)) {
      filtrados = filtrados.filter(item => {
        const f = item.fecha_reserva; // "YYYY-MM-DD"
        if (fechaInicio && f < fechaInicio) return false;
        if (fechaFin && f > fechaFin) return false;
        return true;
      });
    } else if (tipoReporte === 'prestamos' && (fechaInicio || fechaFin)) {
      filtrados = filtrados.filter(item => {
        if (!item.fecha_prestamo) return false;
        const f = item.fecha_prestamo.split(' ')[0].split('T')[0]; // "YYYY-MM-DD"
        if (fechaInicio && f < fechaInicio) return false;
        if (fechaFin && f > fechaFin) return false;
        return true;
      });
    }

    // Filtro de Estado para Reservas
    if (tipoReporte === 'reservas' && filtroEstado !== 'todos') {
      filtrados = filtrados.filter(item => item.estado === filtroEstado);
    }

    // Filtro de búsqueda textual (Nombre o Apartamento)
    if (filtroBusqueda) {
      const q = filtroBusqueda.toLowerCase();
      filtrados = filtrados.filter(item => {
        if (tipoReporte === 'inventario') {
          return item.nombre_insumo?.toLowerCase().includes(q);
        } else {
          return (
            item.nombre_titular?.toLowerCase().includes(q) ||
            item.id_apartamento?.toString().includes(q) ||
            (tipoReporte === 'prestamos' && item.nombre_insumo?.toLowerCase().includes(q))
          );
        }
      });
    }

    setDatosFiltrados(filtrados);
  }, [datosOriginales, fechaInicio, fechaFin, filtroEstado, filtroBusqueda, tipoReporte]);

  const descargarPDF = () => {
    const titulo = `Reporte de ${tipoReporte === 'reservas' ? 'Reservas' : tipoReporte === 'prestamos' ? 'Préstamos' : 'Inventario'}`;
    const fecha = new Date().toLocaleDateString('es-ES');
    
    // Crear una ventana temporal para imprimir
    const ventanaImpresion = window.open('', '_blank');
    
    let contenido = `
      <html>
        <head>
          <title>${titulo}</title>
          <style>
            body {
              font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
              color: #333;
              padding: 30px;
              margin: 0;
            }
            .header {
              display: flex;
              justify-content: space-between;
              align-items: center;
              border-bottom: 2px solid #dc3545;
              padding-bottom: 12px;
              margin-bottom: 25px;
            }
            .header h1 {
              margin: 0;
              font-size: 24px;
              color: #dc3545;
              font-weight: 700;
            }
            .header .fecha {
              font-size: 13px;
              color: #6c757d;
              font-weight: 500;
            }
            .stats {
              margin-bottom: 25px;
              font-size: 13px;
              background-color: #f8f9fa;
              padding: 12px 18px;
              border-radius: 8px;
              border-left: 4px solid #dc3545;
              color: #495057;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 10px;
            }
            th {
              background-color: #f1f3f5;
              color: #495057;
              font-weight: 600;
              border: 1px solid #dee2e6;
              padding: 12px 10px;
              text-align: left;
              font-size: 12px;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            td {
              border: 1px solid #dee2e6;
              padding: 12px 10px;
              text-align: left;
              font-size: 13px;
              color: #212529;
            }
            tr:nth-child(even) {
              background-color: #fafbfc;
            }
            .badge {
              display: inline-block;
              padding: 4px 8px;
              font-size: 11px;
              font-weight: 600;
              border-radius: 4px;
              text-transform: uppercase;
            }
            .badge-success { background-color: #d1e7dd; color: #0f5132; }
            .badge-warning { background-color: #fff3cd; color: #664d03; }
            .badge-danger { background-color: #f8d7da; color: #842029; }
            .badge-secondary { background-color: #e2e3e5; color: #41464b; }
            @media print {
              body { padding: 0; }
              @page {
                margin: 1.5cm;
              }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>${titulo}</h1>
            <div class="fecha">Generado el: ${fecha}</div>
          </div>
          <div class="stats">
            <strong>Filtros aplicados & Info:</strong> &nbsp;
            Total de registros: <strong>${datosFiltrados.length}</strong> 
            ${fechaInicio ? ` &nbsp;|&nbsp; Fecha Inicio: <strong>${formatearFecha(fechaInicio)}</strong>` : ''} 
            ${fechaFin ? ` &nbsp;|&nbsp; Fecha Fin: <strong>${formatearFecha(fechaFin)}</strong>` : ''}
          </div>
          <table>
            <thead>
              <tr>
    `;

    let headers = [];
    if (tipoReporte === 'reservas') {
      headers = ['ID', 'Apartamento', 'Residente', 'Fecha Reserva', 'Estado', 'Fecha Solicitud'];
    } else if (tipoReporte === 'prestamos') {
      headers = ['ID', 'Apartamento', 'Residente', 'Insumo', 'Cantidad', 'Fecha Préstamo', 'Retorno Estimado'];
    } else if (tipoReporte === 'inventario') {
      headers = ['ID', 'Nombre Insumo', 'Cantidad Total', 'Cantidad Disponible'];
    }

    headers.forEach(h => {
      contenido += `<th>${h}</th>`;
    });

    contenido += `
              </tr>
            </thead>
            <tbody>
    `;

    datosFiltrados.forEach(item => {
      contenido += `<tr>`;
      if (tipoReporte === 'reservas') {
        const badgeClass = item.estado === 'aprobada' ? 'badge-success' : item.estado === 'activa' ? 'badge-warning' : item.estado === 'cancelada' ? 'badge-secondary' : 'badge-danger';
        const badgeText = item.estado === 'aprobada' ? 'Aprobada' : item.estado === 'activa' ? 'Pendiente' : item.estado === 'cancelada' ? 'Cancelada' : 'Rechazada';
        
        contenido += `
          <td style="font-weight: bold; color: #495057;">#${item.id_reserva}</td>
          <td>Apt ${item.id_apartamento}</td>
          <td>${item.nombre_titular}</td>
          <td style="font-weight: 500;">${formatearFecha(item.fecha_reserva)}</td>
          <td><span class="badge ${badgeClass}">${badgeText}</span></td>
          <td>${formatearFecha(item.fecha_creacion)}</td>
        `;
      } else if (tipoReporte === 'prestamos') {
        contenido += `
          <td style="font-weight: bold; color: #495057;">#${item.id_prestamo}</td>
          <td>Apt ${item.id_apartamento}</td>
          <td>${item.nombre_titular}</td>
          <td>${item.nombre_insumo}</td>
          <td><span style="background-color: #e9ecef; padding: 2px 6px; border-radius: 4px; font-weight: 500;">${item.cantidad} uds</span></td>
          <td>${formatearFecha(item.fecha_prestamo)}</td>
          <td>${formatearFecha(item.fecha_espera)}</td>
        `;
      } else if (tipoReporte === 'inventario') {
        const badgeClass = item.cantidad_disponible === 0 ? 'badge-danger' : 'badge-success';
        const badgeText = item.cantidad_disponible === 0 ? 'Agotado' : `${item.cantidad_disponible} disp`;
        contenido += `
          <td style="font-weight: bold; color: #495057;">#${item.id_inventario}</td>
          <td>${item.nombre_insumo}</td>
          <td>${item.cantidad_total} uds</td>
          <td><span class="badge ${badgeClass}">${badgeText}</span></td>
        `;
      }
      contenido += `</tr>`;
    });

    contenido += `
            </tbody>
          </table>
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            };
          </script>
        </body>
      </html>
    `;

    ventanaImpresion.document.open();
    ventanaImpresion.document.write(contenido);
    ventanaImpresion.document.close();
  };

  const formatearFecha = (fStr) => {
    if (!fStr) return '—';
    const clean = fStr.split('T')[0].split(' ')[0];
    const [y, m, d] = clean.split('-');
    return `${d}/${m}/${y}`;
  };

  return (
    <div className="reportes-container">
      <div className="card shadow-sm border-0 mb-4 p-3 bg-white">
        <h5 className="fw-bold mb-3 text-dark d-flex align-items-center gap-2">
          <i className="bi bi-file-earmark-bar-graph-fill text-success"></i> Panel de Descarga de Informes
        </h5>
        
        {/* Selector de reporte */}
        <div className="row g-2 mb-3">
          <div className="col-md-4">
            <button 
              className={`btn btn-sm w-100 ${tipoReporte === 'reservas' ? 'btn-success' : 'btn-light text-secondary'}`}
              onClick={() => setTipoReporte('reservas')}
            >
              <i className="bi bi-calendar-event me-2"></i> Reporte de Reservas
            </button>
          </div>
          <div className="col-md-4">
            <button 
              className={`btn btn-sm w-100 ${tipoReporte === 'prestamos' ? 'btn-success' : 'btn-light text-secondary'}`}
              onClick={() => setTipoReporte('prestamos')}
            >
              <i className="bi bi-box-arrow-right me-2"></i> Reporte de Préstamos
            </button>
          </div>
          <div className="col-md-4">
            <button 
              className={`btn btn-sm w-100 ${tipoReporte === 'inventario' ? 'btn-success' : 'btn-light text-secondary'}`}
              onClick={() => setTipoReporte('inventario')}
            >
              <i className="bi bi-box-seam me-2"></i> Reporte de Inventario
            </button>
          </div>
        </div>

        {/* Filtros dinámicos */}
        <div className="row g-2 align-items-end">
          {tipoReporte !== 'inventario' && (
            <>
              <div className="col-sm-3 col-6">
                <label className="form-label small text-muted mb-1">Fecha Inicio</label>
                <input 
                  type="date" 
                  className="form-control form-control-sm" 
                  value={fechaInicio} 
                  onChange={e => setFechaInicio(e.target.value)} 
                />
              </div>
              <div className="col-sm-3 col-6">
                <label className="form-label small text-muted mb-1">Fecha Fin</label>
                <input 
                  type="date" 
                  className="form-control form-control-sm" 
                  value={fechaFin} 
                  onChange={e => setFechaFin(e.target.value)} 
                />
              </div>
            </>
          )}

          {tipoReporte === 'reservas' && (
            <div className="col-sm-3">
              <label className="form-label small text-muted mb-1">Estado de Reserva</label>
              <select 
                className="form-select form-select-sm" 
                value={filtroEstado} 
                onChange={e => setFiltroEstado(e.target.value)}
              >
                <option value="todos">Todos</option>
                <option value="activa">Pendiente</option>
                <option value="aprobada">Aprobada</option>
                <option value="cancelada">Cancelada</option>
                <option value="rechazada">Rechazada</option>
              </select>
            </div>
          )}

          <div className={`col-sm-${tipoReporte === 'inventario' ? '8' : tipoReporte === 'reservas' ? '3' : '6'}`}>
            <label className="form-label small text-muted mb-1">Buscador</label>
            <input 
              type="text" 
              className="form-control form-control-sm" 
              placeholder={tipoReporte === 'inventario' ? 'Buscar por insumo...' : 'Buscar por titular, apt o insumo...'} 
              value={filtroBusqueda} 
              onChange={e => setFiltroBusqueda(e.target.value)} 
            />
          </div>

          <div className="col-md-12 col-lg-auto ms-lg-auto mt-2 mt-lg-0">
            <button 
              className="btn btn-sm btn-danger w-100 d-flex align-items-center justify-content-center gap-2"
              onClick={descargarPDF}
              disabled={datosFiltrados.length === 0}
            >
              <i className="bi bi-file-earmark-pdf"></i> Exportar a PDF ({datosFiltrados.length})
            </button>
          </div>
        </div>
      </div>

      {/* Vista previa de los datos */}
      <div className="card shadow-sm border-0 bg-white">
        <div className="card-body p-0">
          <div className="px-3 py-3 border-bottom d-flex justify-content-between align-items-center">
            <span className="fw-bold text-dark small">Vista Previa de Registros</span>
            <span className="badge bg-light text-dark border">{datosFiltrados.length} encontrados</span>
          </div>

          <div className="table-responsive">
            {cargando ? (
              <div className="text-center py-5">
                <div className="spinner-border text-success spinner-border-sm" role="status"></div>
                <span className="ms-2 small text-muted">Cargando registros...</span>
              </div>
            ) : datosFiltrados.length === 0 ? (
              <div className="text-center py-5 text-muted small">No hay registros que coincidan con los filtros aplicados.</div>
            ) : (
              <table className="table table-hover table-striped mb-0 align-middle" style={{ fontSize: '13px' }}>
                <thead className="table-light">
                  {tipoReporte === 'reservas' && (
                    <tr>
                      <th>ID</th>
                      <th>Apt</th>
                      <th>Residente</th>
                      <th>Fecha Reserva</th>
                      <th>Estado</th>
                      <th>Fecha Solicitud</th>
                    </tr>
                  )}
                  {tipoReporte === 'prestamos' && (
                    <tr>
                      <th>ID</th>
                      <th>Apt</th>
                      <th>Residente</th>
                      <th>Insumo</th>
                      <th>Cantidad</th>
                      <th>Fecha Préstamo</th>
                      <th>Retorno Estimado</th>
                    </tr>
                  )}
                  {tipoReporte === 'inventario' && (
                    <tr>
                      <th>ID</th>
                      <th>Nombre Insumo</th>
                      <th>Cantidad Total</th>
                      <th>Cantidad Disponible</th>
                    </tr>
                  )}
                </thead>
                <tbody>
                  {tipoReporte === 'reservas' && datosFiltrados.map(r => (
                    <tr key={r.id_reserva}>
                      <td className="fw-bold text-muted">#{r.id_reserva}</td>
                      <td>Apt {r.id_apartamento}</td>
                      <td>{r.nombre_titular}</td>
                      <td className="fw-semibold">{formatearFecha(r.fecha_reserva)}</td>
                      <td>
                        <span className={`badge ${
                          r.estado === 'aprobada' ? 'bg-success bg-opacity-10 text-success' :
                          r.estado === 'activa' ? 'bg-warning bg-opacity-10 text-warning' :
                          r.estado === 'cancelada' ? 'bg-secondary bg-opacity-10 text-secondary' : 'bg-danger bg-opacity-10 text-danger'
                        }`}>
                          {r.estado === 'aprobada' ? 'Aprobada' : r.estado === 'activa' ? 'Pendiente' : r.estado === 'cancelada' ? 'Cancelada' : 'Rechazada'}
                        </span>
                      </td>
                      <td>{formatearFecha(r.fecha_creacion)}</td>
                    </tr>
                  ))}
                  {tipoReporte === 'prestamos' && datosFiltrados.map(p => (
                    <tr key={p.id_prestamo}>
                      <td className="fw-bold text-muted">#{p.id_prestamo}</td>
                      <td>Apt {p.id_apartamento}</td>
                      <td>{p.nombre_titular}</td>
                      <td>{p.nombre_insumo}</td>
                      <td><span className="badge bg-light text-dark border px-2">{p.cantidad} uds</span></td>
                      <td>{formatearFecha(p.fecha_prestamo)}</td>
                      <td>{formatearFecha(p.fecha_espera)}</td>
                    </tr>
                  ))}
                  {tipoReporte === 'inventario' && datosFiltrados.map(i => (
                    <tr key={i.id_inventario}>
                      <td className="fw-bold text-muted">#{i.id_inventario}</td>
                      <td>{i.nombre_insumo}</td>
                      <td>{i.cantidad_total} unidades</td>
                      <td>
                        <span className={`badge ${i.cantidad_disponible === 0 ? 'bg-danger bg-opacity-10 text-danger' : 'bg-success bg-opacity-10 text-success'}`}>
                          {i.cantidad_disponible} disponibles
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
