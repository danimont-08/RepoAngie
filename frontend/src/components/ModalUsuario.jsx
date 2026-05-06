import { useState } from 'react';

export default function ModalUsuario({ usuario, onGuardar, onCerrar }) {
  const esEdicion = !!usuario;

//FORMULARIO 2C
  const [formulario, setFormulario] = useState({
    idApartamento: usuario?.id_apartamento || '',
    nombreTitular: usuario?.nombre_titular || '',
    correo: usuario?.correo || '',
    contrasena: '',
    rol: usuario?.rol || 'residente',
  });
  const [guardando, setGuardando] = useState(false);

  const manejarCambio = (campo, valor) => {
    setFormulario((prev) => ({ ...prev, [campo]: valor }));
  };

  const manejarEnvio = async (e) => {
    e.preventDefault();
    setGuardando(true);
    await onGuardar(formulario);
    setGuardando(false);
  };

// MODAL USUARIOS

  return (
    <>
      <div className="modal-backdrop fade show"></div>
      <div className="modal fade show d-block" tabIndex="-1">
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content border-0 shadow">
            <div className="modal-header">
              <h5 className="modal-title fw-semibold">
                {esEdicion ? 'Editar Usuario' : 'Nuevo Usuario'}
              </h5>
              <button type="button" className="btn-close" onClick={onCerrar}></button>
            </div>
            <form onSubmit={manejarEnvio}>
              <div className="modal-body">
                <div className="mb-3">
                  <label className="form-label small fw-medium">Nº Apartamento</label>
                  <input
                    type="number"
                    className="form-control"
                    value={formulario.idApartamento}
                    onChange={(e) => manejarCambio('idApartamento', Number(e.target.value))}
                    placeholder="Ej: 201"
                    required
                    disabled={esEdicion}
                  />
                </div>


                <div className="mb-3">
                  <label className="form-label small fw-medium">Nombre del Titular</label>
                  <input
                    type="text"
                    className="form-control"
                    value={formulario.nombreTitular}
                    onChange={(e) => manejarCambio('nombreTitular', e.target.value)}
                    placeholder="Nombre completo"
                    required
                  />
                </div>

                
                <div className="mb-3">
                  <label className="form-label small fw-medium">Correo Electrónico</label>
                  <input
                    type="email"
                    className="form-control"
                    value={formulario.correo}
                    onChange={(e) => manejarCambio('correo', e.target.value)}
                    placeholder="correo@ejemplo.com"
                    required
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label small fw-medium">
                    Contraseña {esEdicion && <span className="text-muted fw-normal">(dejar vacío para mantener)</span>}
                  </label>
                  <input
                    type="password"
                    className="form-control"
                    value={formulario.contrasena}
                    onChange={(e) => manejarCambio('contrasena', e.target.value)}
                    placeholder={esEdicion ? '••••••••' : 'Contraseña'}
                    required={!esEdicion}
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label small fw-medium">Rol</label>
                  <select
                    className="form-select"
                    value={formulario.rol}
                    onChange={(e) => manejarCambio('rol', e.target.value)}
                  >
                    <option value="residente">Residente</option>
                    <option value="supervisor">Supervisor</option>
                    <option value="administrador">Administrador</option>
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={onCerrar}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-azul" disabled={guardando}>
                  {guardando ? 'Guardando...' : esEdicion ? 'Actualizar' : 'Crear Usuario'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}