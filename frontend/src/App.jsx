import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/ContextoAutenticacion';
import PaginaLogin from './pages/PaginaLogin';
import PaginaDashboard from './pages/PaginaDashboard';
import PaginaUsuarios from './pages/PaginaUsuarios';
import PaginaInventario from './pages/PaginaInventario';
import PaginaReservas from './pages/PaginaReservas';
import PaginaMisPrestamos from './pages/PaginaMisPrestamos';
import LayoutPrincipal from './components/LayoutPrincipal';

function RutaProtegida({ children, soloAdmin = false, soloNoSupervisor = false, soloResidente = false }) {
  const { usuario, cargando, esAdmin, esSupervisor } = useAuth();

  if (cargando) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '100vh' }}>
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Cargando...</span>
        </div>
      </div>
    );
  }

  if (!usuario) return <Navigate to="/login" replace />;
  if (soloAdmin && !esAdmin) return <Navigate to="/dashboard" replace />;
  // soloNoSupervisor: solo admin y residentes acceden, supervisor va al dashboard
  if (soloNoSupervisor && esSupervisor) return <Navigate to="/dashboard" replace />;
  // soloResidente: solo residentes; admin y supervisor van al dashboard
  if (soloResidente && (esAdmin || esSupervisor)) return <Navigate to="/dashboard" replace />;

  return <LayoutPrincipal>{children}</LayoutPrincipal>;
}

export default function App() {
  const { usuario, cargando } = useAuth();

  if (cargando) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '100vh' }}>
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Cargando...</span>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={usuario ? <Navigate to="/dashboard" replace /> : <PaginaLogin />} />
      <Route path="/dashboard" element={<RutaProtegida><PaginaDashboard /></RutaProtegida>} />
      <Route path="/usuarios" element={<RutaProtegida soloAdmin><PaginaUsuarios /></RutaProtegida>} />
      <Route path="/inventario" element={<RutaProtegida><PaginaInventario /></RutaProtegida>} />
      {/* Reservas: accesible por admin y residente; supervisor va al dashboard */}
      <Route path="/reservas" element={<RutaProtegida soloNoSupervisor><PaginaReservas /></RutaProtegida>} />
      {/* Mis Préstamos: solo residentes */}
      <Route path="/mis-prestamos" element={<RutaProtegida soloResidente><PaginaMisPrestamos /></RutaProtegida>} />
      <Route path="/" element={<Navigate to={usuario ? '/dashboard' : '/login'} replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}