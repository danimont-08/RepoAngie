import { useState } from 'react';

export default function ModalInventario({ insumo, onGuardar, onCerrar }) {
  const esEdicion = !!insumo;

  //ESTADO DEL FORMULARIO c3-4 -
  const [formulario, setFormulario] = useState({
    nombreInsumo: insumo?.nombre_insumo || '', //CAMPOS
    cantidadTotal: insumo?.cantidad_total || 0,
    cantidadDisponible: insumo?.cantidad_disponible || 0,
  });
  const [errorValidacion, setErrorValidacion] = useState('');
  const [guardando, setGuardando] = useState(false);

  const manejarCambio = (campo, valor) => {
    setFormulario((prev) => ({ ...prev, [campo]: valor }));
    setErrorValidacion('');
  };

//FUNCION DE VALIDACION - stock
  const validar = () => {
    if (!formulario.nombreInsumo.trim()) {
      setErrorValidacion('El nombre del insumo es obligatorio');
      return false;
    }
    if (formulario.cantidadTotal < 0 || formulario.cantidadDisponible < 0) {
      setErrorValidacion('Las cantidades no pueden ser negativas');
      return false;
    }
    if (formulario.cantidadDisponible > formulario.cantidadTotal) {
      setErrorValidacion('La cantidad disponible no puede ser mayor que la total');
      return false;
    }
    return true;
  };

  const manejarEnvio = async (e) => {
    e.preventDefault();
    if (!validar()) return;
    setGuardando(true);
    await onGuardar(formulario);
    setGuardando(false);
  };

//ESTRUCTURA MODAL -
  return (
    <>
      <div className="modal-backdrop fade show"></div>
      <div className="modal fade show d-block" tabIndex="-1">
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content border-0 shadow">
            <div className="modal-header">
              <h5 className="modal-title fw-semibold">
                {esEdicion ? 'Editar Insumo' : 'Nuevo Insumo'}
              </h5>
              <button type="button" className="btn-close" onClick={onCerrar}></button>
            </div>
            <form onSubmit={manejarEnvio}>
              <div className="modal-body">
                {errorValidacion && (
                  <div className="alert alert-danger d-flex align-items-center gap-2 py-2 small">
                    <i className="bi bi-exclamation-circle"></i>
                    {errorValidacion}
                  </div>
                )}



                <div className="mb-3">
                  <label className="form-label small fw-medium">Nombre del Insumo</label>
                  <input
                    type="text"
                    className="form-control"
                    value={formulario.nombreInsumo}
                    onChange={(e) => manejarCambio('nombreInsumo', e.target.value)}
                    placeholder="Ej: Sillas plegables"
                    required
                  />
                </div>
              


                <div className="row g-3">
                  <div className="col-6">
                    <label className="form-label small fw-medium">Cantidad Total</label>
                    <input
                      type="number"
                      className="form-control"
                      min="0"
                      value={formulario.cantidadTotal}
                      onChange={(e) => manejarCambio('cantidadTotal', parseInt(e.target.value) || 0)}
                    />
                  </div>
                  <div className="col-6">
                    <label className="form-label small fw-medium">Cantidad Disponible</label>
                    <input
                      type="number"
                      className="form-control"
                      min="0"
                      value={formulario.cantidadDisponible}
                      onChange={(e) => manejarCambio('cantidadDisponible', parseInt(e.target.value) || 0)}
                    />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={onCerrar}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-verde" disabled={guardando}>
                  {guardando ? 'Guardando...' : esEdicion ? 'Actualizar' : 'Crear Insumo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}