import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login, user, profile } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user && profile) {
      navigate(profile.rol === 'admin' ? '/admin' : '/user');
    }
  }, [user, profile, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const { error: loginError } = await login(email, password);
    if (loginError) setError("Credenciales incorrectas");

    setLoading(false);
  };

  return (
    <div className="min-vh-100 d-flex align-items-center justify-content-center" 
         style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)' }}>
      <div className="card shadow-lg border-0" style={{ maxWidth: '420px', width: '100%' }}>
        <div className="card-body p-5">
          <div className="text-center mb-4">
            <h2 className="fw-bold text-primary">🔐 Iniciar Sesión</h2>
            <p className="text-muted">Sistema de Gestión de Excel</p>
          </div>

          {error && <div className="alert alert-danger text-center">{error}</div>}

          <form onSubmit={handleSubmit}>
            <div className="mb-3">
              <label className="form-label fw-medium">Correo Electrónico</label>
              <input 
                type="email" 
                className="form-control form-control-lg" 
                placeholder="ejemplo@continental.edu.pe"
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                required 
              />
            </div>
            <div className="mb-4">
              <label className="form-label fw-medium">Contraseña</label>
              <input 
                type="password" 
                className="form-control form-control-lg" 
                placeholder="••••••••"
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                required 
              />
            </div>

            <button type="submit" className="btn btn-primary btn-lg w-100" disabled={loading}>
              {loading ? 'Ingresando...' : 'Ingresar al Sistema'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}