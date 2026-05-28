import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/common/Navbar';
import { supabase } from '../api/supabase';
import { Shield, ArrowLeft, CheckCircle, XCircle } from 'lucide-react';

export default function ManagePermissions() {
  const navigate = useNavigate();
  
  const [users, setUsers] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [permissions, setPermissions] = useState({});
  const [loading, setLoading] = useState(true);

  // Tipos de documentos que SIEMPRE deben aparecer
  const fixedDocumentTypes = [
    { id: 'ims-fixed', tipo: 'IMS', nombre: 'Reporte IMS' },
    { id: 'stock-fixed', tipo: 'Stock', nombre: 'Reporte Stock' },
    { id: 'rotacion-fixed', tipo: 'Rotacion', nombre: 'Reporte Rotación' }
  ];

  useEffect(() => {
    fetchUsers();
    fetchDocuments();
    fetchPermissions();
  }, []);

  const fetchUsers = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, nombre, email, rol')
      .order('nombre');

    if (error) console.error("Error fetching users:", error);
    setUsers(data || []);
  };

  const fetchDocuments = async () => {
    const { data, error } = await supabase
      .from('documentos')
      .select('id, nombre, tipo')
      .eq('activo', true)
      .order('tipo');

    if (error) {
      console.error("Error fetching documents:", error);
      setDocuments(fixedDocumentTypes);
      return;
    }

    console.log("📊 Documentos reales encontrados:", data);

    // Combinamos documentos reales con los tipos fijos
    const realDocs = data || [];
    const allDocs = [...fixedDocumentTypes];

    realDocs.forEach(doc => {
      const index = allDocs.findIndex(d => d.tipo.toLowerCase() === doc.tipo.toLowerCase());
      if (index !== -1) {
        allDocs[index] = { ...doc }; // Reemplazamos con el documento real
      }
    });

    setDocuments(allDocs);
  };

  const fetchPermissions = async () => {
    const { data, error } = await supabase
      .from('permisos_documento')
      .select('user_id, documento_id');

    if (error) console.error("Error fetching permissions:", error);

    const permMap = {};
    data?.forEach(p => {
      if (!permMap[p.user_id]) permMap[p.user_id] = new Set();
      permMap[p.user_id].add(p.documento_id);
    });
    setPermissions(permMap);
    setLoading(false);
  };

  const togglePermission = async (userId, docId) => {
    // Si es documento fijo (aún no existe en BD)
    if (typeof docId === 'string' && docId.includes('-fixed')) {
      alert("Primero debes subir un documento de este tipo (IMS/Stock/Rotación) para poder asignar permisos.");
      return;
    }

    const hasPerm = permissions[userId]?.has(docId);

    if (hasPerm) {
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

    fetchPermissions(); // Actualizar
  };

  const hasPermission = (userId, docId) => {
    return permissions[userId]?.has(docId) || false;
  };

  return (
    <>
      <Navbar />
      <div className="container py-5">
        <button 
          onClick={() => navigate('/admin')}
          className="btn btn-outline-secondary mb-4 d-flex align-items-center gap-2"
        >
          <ArrowLeft size={20} />
          Volver al Panel de Administración
        </button>

        <div className="d-flex justify-content-between align-items-center mb-4">
          <div>
            <h2 className="fw-bold">Control de Acceso</h2>
            <p className="text-muted">Asigna qué documentos puede ver cada usuario / laboratorio</p>
          </div>
          <div className="badge bg-info fs-6">
            {documents.length} Tipos • {users.length} Usuarios
          </div>
        </div>

        {loading ? (
          <div className="text-center py-5">
            <div className="spinner-border text-primary" role="status" />
          </div>
        ) : (
          <div className="card shadow">
            <div className="card-header bg-light">
              <h5 className="mb-0">Permisos por Usuario / Laboratorio</h5>
            </div>
            <div className="table-responsive">
              <table className="table table-hover mb-0 align-middle">
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
                      <td className="fw-semibold">{user.nombre}</td>
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
                              onClick={() => togglePermission(user.id, doc.id)}
                              className={`btn btn-sm d-flex align-items-center gap-1 ${
                                hasPermission(user.id, doc.id) 
                                  ? 'btn-success' 
                                  : 'btn-outline-secondary'
                              }`}
                            >
                              {hasPermission(user.id, doc.id) ? 
                                <CheckCircle size={16} /> : 
                                <XCircle size={16} />
                              }
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

        <div className="mt-4 alert alert-info small">
          <strong>Nota importante:</strong> Los usuarios normales solo verán las filas cuya columna 
          <strong> LABORATORIO </strong> o <strong> LINEA </strong> coincida con su nombre. 
          El Admin siempre ve todo.
        </div>
      </div>
    </>
  );
}