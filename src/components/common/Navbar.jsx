import { useAuth } from '../../context/AuthContext';
import { LogOut, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Navbar() {
  const { profile, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <nav className="navbar navbar-expand-lg shadow-sm sticky-top" 
         style={{ 
           background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)',
           color: 'white' 
         }}>
      <div className="container-fluid px-4">
        {/* Logo */}
        <div className="d-flex align-items-center gap-3">
          <div className="bg-white p-2 rounded-3">
            💊
          </div>
          <div>
            <span className="navbar-brand fw-bold text-white fs-4">MIDHCO DISTRIBUCIONES</span>
            <small className="text-white-50 d-block" style={{ marginTop: '-4px' }}>Distribuidora Farmaceutica</small>
          </div>
        </div>

        {/* Usuario */}
        {profile && (
          <div className="d-flex align-items-center gap-3 text-white">
            <div className="text-end">
              <div className="fw-medium">{profile.nombre}</div>
              <small>{profile.rol === 'admin' ? 'Administrador' : 'Usuario'}</small>
            </div>
            <div className="bg-white bg-opacity-25 rounded-circle p-2">
              <User size={24} />
            </div>
          </div>
        )}

        <button onClick={handleLogout} className="btn btn-light d-flex align-items-center gap-2">
          <LogOut size={18} />
          Salir
        </button>
      </div>
    </nav>
  );
}