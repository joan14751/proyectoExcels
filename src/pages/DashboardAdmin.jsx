import { useEffect, useState } from 'react';
import Navbar from '../components/common/Navbar';
import { supabase } from '../api/supabase';
import { Link } from 'react-router-dom';
import { Upload, Users, Key, Trash2, Eye, Download } from 'lucide-react';
import * as XLSX from 'xlsx';

export default function DashboardAdmin() {
  const [documentos, setDocumentos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [previewData, setPreviewData] = useState(null);
  const [previewName, setPreviewName] = useState('');
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    fetchDocumentos();
  }, []);

  const fetchDocumentos = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('documentos')
      .select('*')
      .order('created_at', { ascending: false });
    setDocumentos(data || []);
    setLoading(false);
  };

  const getFilePath = (fullUrl) => {
    if (!fullUrl) return null;
    try {
      if (fullUrl.includes('/excels/')) {
        return fullUrl.split('/excels/')[1].split('?')[0];
      }
      return fullUrl;
    } catch {
      return fullUrl;
    }
  };

  const handlePreview = async (doc) => {
    try {
      const filePath = getFilePath(doc.url);
      if (!filePath) return alert("Este documento no tiene archivo");

      const { data, error } = await supabase.storage
        .from('excels')
        .download(filePath);

      if (error) throw error;

      const arrayBuffer = await data.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" });

      setPreviewData(jsonData);
      setPreviewName(doc.nombre);
      setShowPreview(true);
    } catch (err) {
      console.error(err);
      alert("No se pudo previsualizar el archivo completo.\n" + err.message);
    }
  };

  const handleDownload = async (doc) => {
    const filePath = getFilePath(doc.url);
    if (!filePath) return alert("No se encontró el archivo");

    try {
      const { data, error } = await supabase.storage
        .from('excels')
        .download(filePath);

      if (error) throw error;

      const blobUrl = window.URL.createObjectURL(data);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = doc.nombre.endsWith('.xlsx') ? doc.nombre : `${doc.nombre}.xlsx`;
      
      document.body.appendChild(link);
      link.click();
      
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.error("Error en descarga:", err);
      alert("Error al intentar descargar el archivo original.");
    }
  };

  const deleteDocumento = async (id, nombre) => {
    if (!window.confirm(`¿Eliminar "${nombre}"?`)) return;
    try {
        const { error } = await supabase.from('documentos').delete().eq('id', id);
        if (error) throw error;
        fetchDocumentos();
    } catch (error) {
        alert("Error al eliminar el registro");
    }
  };

  return (
    <>
      <Navbar />
      <div className="container py-5">
        <header className="mb-5">
            <h1 className="fw-bold mb-1 text-dark">Panel Administrador</h1>
            <p className="text-muted fs-5">Gestión de archivos Excel y Usuarios</p>
        </header>

        {/* Tarjetas de Navegación - Mejoradas */}
        <div className="row g-4 mb-5">
          <div className="col-md-4">
            <Link to="/admin/upload" className="text-decoration-none">
              <div className="card h-100 shadow border-0 transition-hover" style={{ background: '#22c55e', color: 'white' }}>
                <div className="card-body text-center py-5">
                  <Upload size={52} className="mb-3" />
                  <h4 className="fw-bold mb-1">Subir Excel</h4>
                  <p className="mb-0 opacity-90">IMS, Stock, Rotación</p>
                </div>
              </div>
            </Link>
          </div>

          <div className="col-md-4">
            <Link to="/admin/users" className="text-decoration-none">
              <div className="card h-100 shadow border-0 transition-hover" style={{ background: '#3b82f6', color: 'white' }}>
                <div className="card-body text-center py-5">
                  <Users size={52} className="mb-3" />
                  <h4 className="fw-bold mb-1">Usuarios</h4>
                  <p className="mb-0 opacity-90">Gestionar cuentas</p>
                </div>
              </div>
            </Link>
          </div>

          <div className="col-md-4">
            <Link to="/admin/permissions" className="text-decoration-none">
              <div className="card h-100 shadow border-0 transition-hover" style={{ background: '#f59e0b', color: 'white' }}>
                <div className="card-body text-center py-5">
                  <Key size={52} className="mb-3" />
                  <h4 className="fw-bold mb-1">Permisos</h4>
                  <p className="mb-0 opacity-90">Control de acceso</p>
                </div>
              </div>
            </Link>
          </div>
        </div>

        {/* Tabla de Documentos */}
        <div className="card shadow border-0 rounded-4 overflow-hidden">
          <div className="card-header bg-white py-4">
            <h5 className="mb-0 fw-bold text-dark">📋 Lista de Excels Subidos</h5>
          </div>
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th className="ps-4">Nombre</th>
                  <th>Tipo</th>
                  <th>Fecha</th>
                  <th>Estado</th>
                  <th className="text-end pe-4">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="5" className="text-center py-5 text-muted">Cargando documentos...</td></tr>
                ) : documentos.length === 0 ? (
                  <tr><td colSpan="5" className="text-center py-5 text-muted">No hay archivos subidos actualmente</td></tr>
                ) : (
                  documentos.map(doc => (
                    <tr key={doc.id}>
                      <td className="ps-4 fw-semibold text-dark">{doc.nombre}</td>
                      <td><span className="badge bg-primary px-3 py-2">{doc.tipo}</span></td>
                      <td className="text-dark">{new Date(doc.created_at).toLocaleDateString('es-ES')}</td>
                      <td><span className="badge bg-success px-3 py-2">Activo</span></td>
                      <td className="text-end pe-4">
                        <div className="btn-group">
                            <button className="btn btn-outline-primary btn-sm d-flex align-items-center gap-1" onClick={() => handlePreview(doc)}>
                            <Eye size={16} /> Ver
                            </button>
                            <button className="btn btn-success btn-sm text-white d-flex align-items-center gap-1" onClick={() => handleDownload(doc)}>
                            <Download size={16} /> Descargar
                            </button>
                            <button className="btn btn-outline-danger btn-sm" onClick={() => deleteDocumento(doc.id, doc.nombre)}>
                            <Trash2 size={16} />
                            </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal de Previsualización */}
      {showPreview && previewData && (
        <div className="modal show d-block shadow-lg" style={{ backgroundColor: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)' }}>
          <div className="modal-dialog modal-xl modal-dialog-centered">
            <div className="modal-content border-0 rounded-4">
              <div className="modal-header border-0 bg-light rounded-top-4">
                <h5 className="modal-title fw-bold text-dark">Previsualización: {previewName}</h5>
                <button className="btn-close" onClick={() => setShowPreview(false)}></button>
              </div>
              <div className="modal-body p-0" style={{ maxHeight: '65vh', overflow: 'auto' }}>
                <table className="table table-sm table-striped table-bordered mb-0 small">
                  <thead className="sticky-top bg-white">
                    <tr>
                      {previewData[0]?.map((col, idx) => (
                        <th key={idx} className="p-2 bg-light text-dark">{col || `Col ${idx + 1}`}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {previewData.slice(1, 100).map((row, i) => (
                      <tr key={i}>
                        {row.map((cell, j) => <td key={j} className="p-2 text-dark text-truncate" style={{ maxWidth: '200px' }}>{cell}</td>)}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="modal-footer border-0 bg-light rounded-bottom-4">
                <div className="me-auto text-muted small">
                    Mostrando las primeras {Math.min(previewData.length, 100)} filas de {previewData.length} totales.
                </div>
                <button className="btn btn-secondary px-4 rounded-pill" onClick={() => setShowPreview(false)}>Cerrar</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}