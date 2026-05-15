import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/common/Navbar';
import { supabase } from '../api/supabase';
import { Shield, Users, FileSpreadsheet, ArrowLeft } from 'lucide-react';

export default function ManagePermissions() {
  const navigate = useNavigate();
  
  const [users, setUsers] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [permissions, setPermissions] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUsers();
    fetchDocuments();
    fetchPermissions();
  }, []);

  const fetchUsers = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('id, nombre, email, rol')
      .order('nombre');
    setUsers(data || []);
  };

  const fetchDocuments = async () => {
    const { data } = await supabase
      .from('documentos')
      .select('id, nombre, tipo, created_at')
      .eq('activo', true)
      .order('created_at', { ascending: false });
    setDocuments(data || []);
  };

  const fetchPermissions = async () => {
    const { data } = await supabase
      .from('permisos_documento')
      .select('user_id, documento_id');

    const permMap = {};
    data?.forEach(p => {
      if (!permMap[p.user_id]) permMap[p.user_id] = new Set();
      permMap[p.user_id].add(p.documento_id);
    });
    setPermissions(permMap);
    setLoading(false);
  };

  const togglePermission = async (userId, docId) => {
    const userPerms = permissions[userId] || new Set();
    const hasPermission = userPerms.has(docId);

    if (hasPermission) {
      await supabase
        .from('permisos_documento')
        .delete()
        .eq('user_id', userId)
        .eq('documento_id', docId);
    } else {
      await supabase
        .from('permisos_documento')
        .insert({ user_id: userId, documento_id: docId });
    }

    fetchPermissions();
  };

  const hasPermission = (userId, docId) => {
    return permissions[userId]?.has(docId) || false;
  };

  return (
    <>
      <Navbar />
      <div className="container py-5">
        {/* Botón Volver */}
        <div className="mb-4">
          <button 
            onClick={() => navigate('/admin')}
            className="btn btn-outline-secondary d-flex align-items-center gap-2"
          >
            <ArrowLeft size={20} />
            Volver al Panel de Administración
          </button>
        </div>

        <div className="d-flex justify-content-between align-items-center mb-4">
          <div>
            <h2 className="fw-bold">Control de Acceso</h2>
            <p className="text-muted">Asigna documentos a cada laboratorio / usuario</p>
          </div>
          <div className="badge bg-info fs-6">
            {documents.length} Documentos • {users.length} Usuarios
          </div>
        </div>

        {loading ? (
          <div className="text-center py-5">
            <div className="spinner-border text-primary" />
          </div>
        ) : (
          <div className="card shadow-sm">
            <div className="card-header bg-light">
              <h5 className="mb-0 d-flex align-items-center gap-2">
                <Shield size={22} /> Permisos por Usuario
              </h5>
            </div>
            <div className="table-responsive">
              <table className="table table-hover mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Usuario / Laboratorio</th>
                    <th>Email</th>
                    <th>Rol</th>
                    <th>Documentos Permitidos</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(user => (
                    <tr key={user.id}>
                      <td className="fw-medium">{user.nombre}</td>
                      <td>{user.email}</td>
                      <td>
                        <span className={`badge ${user.rol === 'admin' ? 'bg-success' : 'bg-secondary'}`}>
                          {user.rol}
                        </span>
                      </td>
                      <td>
                        <div className="d-flex flex-wrap gap-2">
                          {documents.map(doc => (
                            <button
                              key={doc.id}
                              className={`btn btn-sm ${hasPermission(user.id, doc.id)
                                ? 'btn-success'
                                : 'btn-outline-secondary'}`}
                              onClick={() => togglePermission(user.id, doc.id)}
                              title={doc.nombre}
                            >
                              <FileSpreadsheet size={16} className="me-1" />
                              {doc.tipo}
                            </button>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="mt-4 text-muted small">
          <strong>Nota:</strong> Los usuarios normales solo verán las filas cuya <strong>LINEA</strong> coincida con su nombre.
        </div>
      </div>
    </>
  );
}