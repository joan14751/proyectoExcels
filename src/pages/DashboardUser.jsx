import { useEffect, useState, useMemo } from 'react';
import Navbar from '../components/common/Navbar';
import { supabase } from '../api/supabase';
import { Download, Eye, Key, Search, ArrowLeft } from 'lucide-react';
import * as XLSX from 'xlsx';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function DashboardUser() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  
  const [documentos, setDocumentos] = useState([]);
  const [previewData, setPreviewData] = useState(null);
  const [previewHeaders, setPreviewHeaders] = useState([]);
  const [previewName, setPreviewName] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [loading, setLoading] = useState(true);
  const [globalSearch, setGlobalSearch] = useState('');

  const isAdmin = profile?.rol === 'admin';

  useEffect(() => {
    fetchMyDocuments();
  }, []);

  const fetchMyDocuments = async () => {
    setLoading(true);

    if (isAdmin) {
      const { data } = await supabase
        .from('documentos')
        .select('*')
        .eq('activo', true)
        .order('created_at', { ascending: false });
      setDocumentos(data || []);
    } else {
      const { data: permisos } = await supabase
        .from('permisos_documento')
        .select('documento_id')
        .eq('user_id', profile.id);

      if (!permisos || permisos.length === 0) {
        setDocumentos([]);
        setLoading(false);
        return;
      }

      const docIds = permisos.map(p => p.documento_id);

      const { data } = await supabase
        .from('documentos')
        .select('*')
        .in('id', docIds)
        .eq('activo', true)
        .order('created_at', { ascending: false });

      setDocumentos(data || []);
    }
    setLoading(false);
  };

  const getFilePath = (fullUrl) => {
    if (!fullUrl) return null;
    try {
      const url = new URL(fullUrl);
      return url.pathname.replace('/storage/v1/object/public/excels/', '');
    } catch {
      return fullUrl.split('/excels/')[1]?.split('?')[0] || fullUrl;
    }
  };

  // ==================== FILTRO MEJORADO ====================
  const filterByLaboratorio = (rows, userLab) => {
    if (!userLab || isAdmin) return rows;
    const labUpper = userLab.toUpperCase().trim();

    return rows.filter(row => {
      return row.some((cell, index) => {
        if (!cell) return false;
        const cellStr = String(cell).toUpperCase().trim();
        
        // Buscar en columnas comunes de laboratorio
        const header = previewHeaders[index] ? String(previewHeaders[index]).toUpperCase() : '';
        
        if (header.includes('LINEA') || 
            header.includes('LABORATORIO') || 
            header.includes('NOM') || 
            header.includes('CLIENTE')) {
          return cellStr.includes(labUpper) || labUpper.includes(cellStr);
        }
        return false;
      });
    });
  };

  const handlePreview = async (doc) => {
    try {
      const filePath = getFilePath(doc.url);
      if (!filePath) return alert("Archivo no encontrado");

      const { data, error } = await supabase.storage.from('excels').download(filePath);
      if (error) throw error;

      const arrayBuffer = await data.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];

      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" });
      const headers = jsonData[0] || [];
      let rows = jsonData.slice(1);

      // Aplicar filtro por laboratorio
      if (!isAdmin && profile?.nombre) {
        rows = filterByLaboratorio(rows, profile.nombre);
      }

      setPreviewHeaders(headers);
      setPreviewData(rows);
      setPreviewName(doc.nombre);
      setGlobalSearch('');
      setShowPreview(true);
    } catch (err) {
      console.error(err);
      alert("Error al previsualizar el documento");
    }
  };

  const handleDownload = async (doc) => {
    try {
      const filePath = getFilePath(doc.url);
      if (!filePath) return alert("Archivo no encontrado");

      const { data, error } = await supabase.storage.from('excels').download(filePath);
      if (error) throw error;

      const arrayBuffer = await data.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];

      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" });
      let rows = jsonData.slice(1);

      if (!isAdmin && profile?.nombre) {
        rows = filterByLaboratorio(rows, profile.nombre);
      }

      const newWorkbook = XLSX.utils.book_new();
      const newSheet = XLSX.utils.aoa_to_sheet([jsonData[0], ...rows]);
      XLSX.utils.book_append_sheet(newWorkbook, newSheet, "Datos");
      
      XLSX.writeFile(newWorkbook, `${doc.nombre} - ${isAdmin ? 'COMPLETO' : profile?.nombre}.xlsx`);
    } catch (err) {
      console.error(err);
      alert("Error al descargar el archivo");
    }
  };

  const filteredRows = useMemo(() => {
    if (!previewData) return [];
    if (!globalSearch.trim()) return previewData;

    const term = globalSearch.toUpperCase().trim();
    return previewData.filter(row => 
      row.some(cell => String(cell || '').toUpperCase().includes(term))
    );
  }, [previewData, globalSearch]);

  const changePassword = async () => {
    const newPass = prompt("Nueva contraseña (mínimo 6 caracteres):");
    if (!newPass || newPass.length < 6) return alert("Contraseña muy corta");
    
    const { error } = await supabase.auth.updateUser({ password: newPass });
    if (error) alert("Error: " + error.message);
    else alert("✅ Contraseña cambiada correctamente");
  };

  return (
    <>
      <Navbar />
      <div className="container py-5">
        <button 
          onClick={() => navigate(isAdmin ? '/admin' : '/user')}
          className="btn btn-outline-secondary mb-4 d-flex align-items-center gap-2"
        >
          <ArrowLeft size={20} /> Volver al Panel
        </button>

        <div className="d-flex justify-content-between align-items-center mb-4">
          <div>
            <h2 className="fw-bold">Mis Archivos Disponibles</h2>
            <p className="text-muted">
              {isAdmin ? "🟢 Administrador - Vista Completa" : `Laboratorio: ${profile?.nombre}`}
            </p>
          </div>
          <button onClick={changePassword} className="btn btn-outline-primary">
            <Key size={18} className="me-2" /> Cambiar Contraseña
          </button>
        </div>

        {loading ? (
          <p>Cargando documentos...</p>
        ) : documentos.length === 0 ? (
          <div className="alert alert-info">No tienes documentos asignados por el administrador.</div>
        ) : (
          <div className="row g-4">
            {documentos.map(doc => (
              <div key={doc.id} className="col-md-6 col-lg-4">
                <div className="card h-100 shadow-sm border-0">
                  <div className="card-body">
                    <h5 className="card-title">{doc.nombre}</h5>
                    <span className="badge bg-primary mb-2">{doc.tipo}</span>
                  </div>
                  <div className="card-footer bg-white d-flex gap-2 p-3">
                    <button className="btn btn-outline-primary flex-fill" onClick={() => handlePreview(doc)}>
                      <Eye size={18} className="me-1" /> Previsualizar
                    </button>
                    <button className="btn btn-success flex-fill" onClick={() => handleDownload(doc)}>
                      <Download size={18} className="me-1" /> Descargar
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal Previsualización */}
      {showPreview && previewData && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.85)' }}>
          <div className="modal-dialog modal-xl">
            <div className="modal-content">
              <div className="modal-header">
                <h5>Previsualización: {previewName}</h5>
                <small className="text-muted ms-3">
                  {isAdmin ? "✅ VISTA COMPLETA (ADMIN)" : `Filtrado por: ${profile?.nombre}`}
                </small>
                <button className="btn-close" onClick={() => setShowPreview(false)}></button>
              </div>

              <div className="p-3 border-bottom bg-light">
                <div className="input-group">
                  <span className="input-group-text"><Search size={18} /></span>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Buscar en cualquier columna..."
                    value={globalSearch}
                    onChange={(e) => setGlobalSearch(e.target.value)}
                  />
                </div>
              </div>

              <div className="modal-body p-0" style={{ maxHeight: '78vh', overflow: 'auto' }}>
                <table className="table table-sm table-bordered mb-0">
                  <thead className="table-dark sticky-top">
                    <tr>
                      {previewHeaders.map((header, i) => (
                        <th key={i} className="text-center text-uppercase small">{header}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRows.slice(0, 10000).map((row, i) => (
                      <tr key={i}>
                        {row.map((cell, j) => (
                          <td key={j} className="text-center text-truncate" style={{ maxWidth: '180px' }}>
                            {cell === "" || cell == null ? "-" : cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="modal-footer">
                <small className="text-muted">
                  Mostrando {filteredRows.length} filas • Total original: {previewData.length}
                </small>
                <button className="btn btn-secondary" onClick={() => setShowPreview(false)}>
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}