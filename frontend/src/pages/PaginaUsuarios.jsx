import { useState, useEffect, useCallback } from 'react';
import { servicioUsuarios } from '../services/servicioApi';
import ModalUsuario from '../components/ModalUsuario';
// CoolSpan a 8 linea 144 C2
export default function PaginaUsuarios() {
  const [usuarios, setUsuarios] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [modalAbierto, setModalAbierto] = useState(false);
  const [usuarioEditar, setUsuarioEditar] = useState(null);
  const [mensaje, setMensaje] = useState(null);

  const cargarUsuarios = useCallback(async () => {
    try {
      setCargando(true);
      const respuesta = await servicioUsuarios.obtenerTodos();
      setUsuarios(respuesta.data.datos || []);
    } catch (error) {
      console.error('Error cargando usuarios:', error);
      mostrarMensaje('danger', 'Error al cargar usuarios');
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargarUsuarios();
  }, [cargarUsuarios]);

  const mostrarMensaje = (tipo, texto) => {
    setMensaje({ tipo, texto });
    setTimeout(() => setMensaje(null), 4000);
  };

  const abrirModalCrear = () => {
    setUsuarioEditar(null);
    setModalAbierto(true);
  };

  const abrirModalEditar = (usuario) => {
    setUsuarioEditar(usuario);
    setModalAbierto(true);
  };

  const cerrarModal = () => {
    setModalAbierto(false);
    setUsuarioEditar(null);
  };

  const guardarUsuario = async (datosFormulario) => {
    try {
      if (usuarioEditar) {
        await servicioUsuarios.actualizar(usuarioEditar.id_apartamento, datosFormulario);
        mostrarMensaje('success', 'Usuario actualizado correctamente');
      } else {
        await servicioUsuarios.crear(datosFormulario);
        mostrarMensaje('success', 'Usuario creado correctamente');
      }
      cerrarModal();
      cargarUsuarios();
    } catch (error) {
      const mensajeError = error.response?.data?.mensaje || 'Error al guardar usuario';
      mostrarMensaje('danger', mensajeError);
    }
  };

  const cambiarEstado = async (usuario) => {
    const nuevoEstado = usuario.estado ? 0 : 1;
    try {
      await servicioUsuarios.cambiarEstado(usuario.id_apartamento, nuevoEstado);
      const etiqueta = nuevoEstado ? 'activado' : 'desactivado';
      mostrarMensaje('success', `Usuario ${etiqueta} correctamente`);
      cargarUsuarios();
    } catch (error) {
      mostrarMensaje('danger', 'Error al cambiar estado del usuario');
    }
  };

  const usuariosFiltrados = usuarios.filter(
    (u) =>
      u.nombre_titular.toLowerCase().includes(busqueda.toLowerCase()) ||
      String(u.id_apartamento).includes(busqueda) ||
      u.correo.toLowerCase().includes(busqueda.toLowerCase())
  );

  return (
    <div>
      {/* Mensaje */}
      {mensaje && (
        <div className={`alert alert-${mensaje.tipo} alert-dismissible fade show d-flex align-items-center gap-2 small`} role="alert">
          <i className={`bi ${mensaje.tipo === 'success' ? 'bi-check-circle' : 'bi-exclamation-circle'}`}></i>
          {mensaje.texto}
          <button type="button" className="btn-close" onClick={() => setMensaje(null)}></button>
        </div>
      )}

      {/* Header */}
      <div className="d-flex flex-column flex-sm-row justify-content-between align-items-start align-items-sm-center gap-3 mb-4">
        <div>
          <h4 className="fw-bold mb-1">Gestión de Usuarios</h4>
          <p className="text-muted small mb-0">Administre los titulares de apartamentos</p>
        </div>
        <button className="btn btn-azul d-flex align-items-center gap-2" onClick={abrirModalCrear}>
          <i className="bi bi-plus-lg"></i>
          Nuevo Usuario
        </button>
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
            placeholder="Buscar por nombre, apartamento o correo..."
          />
        </div>
      </div>

      {/* Tabla DATOS C*/}
      <div className="card shadow-sm border-0">
        <div className="table-responsive">
          <table className="table table-hover mb-0">
            <thead className="table-light">
              <tr>
                <th className="small fw-semibold text-muted">Apartamento</th>

                <th className="small fw-semibold text-muted">Titular</th>

                <th className="small fw-semibold text-muted d-none d-md-table-cell">Correo</th> 
                <th className="small fw-semibold text-muted">Rol</th>
                <th className="small fw-semibold text-muted">Estado</th>
                <th className="small fw-semibold text-muted text-end">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {cargando ? (
                <tr>
                  <td colSpan={6} className="text-center py-4 text-muted">
                    <div className="spinner-border spinner-border-sm me-2"></div>
                    Cargando usuarios...
                  </td>
                </tr>
              ) : usuariosFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-4 text-muted">
                    No se encontraron usuarios
                  </td>
                </tr>
              ) : (
                usuariosFiltrados.map((usuario) => (
                  <tr key={usuario.id_apartamento}>
                    <td className="fw-medium">{usuario.id_apartamento}</td>
                    

                    <td>{usuario.nombre_titular}</td>


                    <td className="text-muted d-none d-md-table-cell">{usuario.correo}</td>
                    <td>
                      <span className={`badge ${
                        usuario.rol === 'administrador' ? 'bg-primary bg-opacity-10 text-primary' :
                        usuario.rol === 'supervisor' ? 'bg-warning bg-opacity-10 text-warning' :
                        'bg-secondary bg-opacity-10 text-secondary'
                      }`}>
                        {usuario.rol}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${usuario.estado ? 'bg-success bg-opacity-10 text-success' : 'bg-danger bg-opacity-10 text-danger'}`}>
                        {usuario.estado ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="text-end">
                      <button
                        className="btn btn-sm btn-outline-primary me-1"
                        onClick={() => abrirModalEditar(usuario)}
                        title="Editar"
                      >
                        <i className="bi bi-pencil"></i>
                      </button>
                      <button
                        className={`btn btn-sm ${usuario.estado ? 'btn-outline-danger' : 'btn-outline-success'}`}
                        onClick={() => cambiarEstado(usuario)}
                        title={usuario.estado ? 'Desactivar' : 'Activar'}
                      >
                        <i className={`bi ${usuario.estado ? 'bi-person-x' : 'bi-person-check'}`}></i>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {modalAbierto && (
        <ModalUsuario
          usuario={usuarioEditar}
          onGuardar={guardarUsuario}
          onCerrar={cerrarModal}
        />
      )}
    </div>
  );
}