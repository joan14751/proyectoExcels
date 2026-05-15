import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import 'bootstrap/dist/css/bootstrap.min.css';
import Login from './pages/Login';
import Register from './pages/Register';
import DashboardAdmin from './pages/DashboardAdmin';
import DashboardUser from './pages/DashboardUser';
import UploadExcel from './pages/UploadExcel';
import ManageUsers from './pages/ManageUsers';
import ManagePermissions from './pages/ManagePermissions';

function PrivateRoute({ children, requiredRole }) {
  const { user, profile, loading } = useAuth();
  
  if (loading) return <div className="d-flex justify-content-center mt-5"><div className="spinner-border"></div></div>;
  if (!user) return <Navigate to="/" replace />;
  if (requiredRole && profile?.rol !== requiredRole) return <Navigate to="/" replace />;

  return children;
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Rutas Admin */}
          <Route path="/admin" element={
            <PrivateRoute requiredRole="admin"><DashboardAdmin /></PrivateRoute>
          } />
          <Route path="/admin/upload" element={
            <PrivateRoute requiredRole="admin"><UploadExcel /></PrivateRoute>
          } />
          <Route path="/admin/users" element={
            <PrivateRoute requiredRole="admin"><ManageUsers /></PrivateRoute>
          } />
          <Route path="/admin/permissions" element={
            <PrivateRoute requiredRole="admin"><ManagePermissions /></PrivateRoute>
          } />

          {/* Ruta Usuario */}
          <Route path="/user" element={
            <PrivateRoute requiredRole="usuario"><DashboardUser /></PrivateRoute>
          } />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;