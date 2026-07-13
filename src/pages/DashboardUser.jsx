import { useEffect, useState, useMemo } from 'react';
import Navbar from '../components/common/Navbar';
import { supabase } from '../api/supabase';
import { Download, Eye, Key, Search, ArrowLeft, FileText, Package, BarChart3 } from 'lucide-react';
import * as XLSX from 'xlsx';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

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

  const filterByLaboratorio = (rows, userLab, headers) => {
    if (!userLab || isAdmin) return rows;
    const labUpper = userLab.toUpperCase().trim();
    return rows.filter(row => {
      return row.some((cell, index) => {
        if (!cell) return false;
        const cellStr = String(cell).toUpperCase().trim();
        const header = headers[index] ? String(headers[index]).toUpperCase() : '';
        if (header.includes('LABORATORIO') || header.includes('LINEA')) {
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
      if (!isAdmin && profile?.nombre) {
        rows = filterByLaboratorio(rows, profile.nombre, headers);
      }
      if (doc.tipo === 'IMS PDF' && rows.length > 0) {
        rows.sort((a, b) => {
          const repA = String(a[2] || "").trim().toUpperCase();
          const repB = String(b[2] || "").trim().toUpperCase();
          return repA.localeCompare(repB);
        });
      }
      setPreviewHeaders(headers);
      setPreviewData(rows);
      setPreviewName(doc.nombre);
      setGlobalSearch('');
      setShowPreview(true);
    } catch (err) {
      console.error(err);
      alert("Error al previsualizar");
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
        rows = filterByLaboratorio(rows, profile.nombre, jsonData[0]);
      }
      const newWorkbook = XLSX.utils.book_new();
      const newSheet = XLSX.utils.aoa_to_sheet([jsonData[0], ...rows]);
      XLSX.utils.book_append_sheet(newWorkbook, newSheet, "Datos");
      XLSX.writeFile(newWorkbook, `${doc.nombre}.xlsx`);
    } catch (err) {
      console.error(err);
      alert("Error al descargar");
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

  const totals = useMemo(() => {
    if (!previewData) return { cantidad: 0, total: 0 };
    const dataToSum = globalSearch.trim() ? filteredRows : previewData;
    let sumaCantidad = 0, sumaTotal = 0;
    dataToSum.forEach(row => {
      sumaCantidad += parseFloat(row[3]) || 0;
      sumaTotal += parseFloat(row[4]) || 0;
    });
    return { cantidad: sumaCantidad, total: sumaTotal.toFixed(2) };
  }, [previewData, filteredRows, globalSearch]);

  const getBadgeColor = (tipo) => {
    switch(tipo?.toUpperCase()) {
      case 'IMS PDF': return 'bg-info text-white';
      case 'STOCK': return 'bg-primary text-white';
      case 'ROTACION': return 'bg-warning text-dark';
      case 'IMS': return 'bg-success text-white';
      default: return 'bg-secondary text-white';
    }
  };

  const getDocumentIcon = (tipo) => {
    const upperTipo = tipo?.toUpperCase();
    if (upperTipo === 'IMS PDF') return <FileText size={52} className="text-info" />;
    if (upperTipo === 'STOCK') return <Package size={52} className="text-primary" />;
    if (upperTipo === 'ROTACION') return <BarChart3 size={52} className="text-warning" />;
    return <FileText size={52} className="text-secondary" />;
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 40 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } }
  };

  return (
    <>
      <Navbar />
      <div className="container py-5" style={{ background: 'linear-gradient(135deg, #f8fafc 0%, #e0f2fe 100%)', minHeight: '100vh' }}>
       
        <div className="d-flex justify-content-between align-items-center mb-5">
          <div>
            <button onClick={() => navigate(isAdmin ? '/admin' : '/user')} className="btn btn-outline-secondary d-flex align-items-center gap-2 mb-3">
              <ArrowLeft size={20} /> Volver al Panel
            </button>
            <h1 className="fw-bold text-primary mb-1">Mis Documentos</h1>
            <h1 className="fw-bold text-primary mb-2">LA INFORMACION SE ACTUALIZARA TODOS LOS DIAS A LAS 10 A.M</h1>
            <p className="text-muted fs-5">Laboratorio: <strong className="text-dark">{profile?.nombre}</strong></p>
          </div>
          <div className="badge bg-success fs-6 py-2 px-3">🟢 Conectado</div>
        </div>

        {loading ? (
          <div className="text-center py-5">
            <div className="spinner-border text-primary" style={{width: '3rem', height: '3rem'}}></div>
            <p className="mt-3">Cargando documentos...</p>
          </div>
        ) : documentos.length === 0 ? (
          <div className="alert alert-info text-center py-5">No tienes documentos asignados.</div>
        ) : (
          <motion.div 
            className="row g-4"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            {documentos.map(doc => (
              <motion.div 
                key={doc.id} 
                className="col-12 col-md-6 col-lg-4"
                variants={cardVariants}
              >
                <div className="card h-100 shadow border-0 overflow-hidden hover-card" style={{ transition: 'all 0.3s ease' }}>
                  
                  <div className="card-header bg-white border-0 pt-4 pb-0 text-center">
                    <div className="mb-3">
                      {getDocumentIcon(doc.tipo)}
                    </div>
                    <h5 className="card-title fw-bold mb-1 text-dark">{doc.nombre}</h5>
                    <span className={`badge ${getBadgeColor(doc.tipo)} fs-6`}>{doc.tipo}</span>
                  </div>

                  <div className="card-body pt-2">
                    <small className="text-muted">
                      Cargado: {new Date(doc.created_at).toLocaleString('es-PE', {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: true   // Formato 12 horas
                      })}
                    </small>
                  </div>

                  <div className="card-footer bg-white border-0 d-flex gap-2 p-4">
                    <button className="btn btn-outline-primary flex-fill d-flex align-items-center justify-content-center gap-2 py-2" onClick={() => handlePreview(doc)}>
                      <Eye size={18} /> Previsualizar
                    </button>
                    <button className="btn btn-success flex-fill d-flex align-items-center justify-content-center gap-2 py-2" onClick={() => handleDownload(doc)}>
                      <Download size={18} /> Descargar
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>

      {/* MODAL (sin cambios) */}
      {showPreview && previewData && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.85)' }}>
          <div className="modal-dialog modal-xl">
            <div className="modal-content">
              <div className="modal-header">
                <h5>Previsualización: {previewName}</h5>
                <small className="text-muted ms-3">Filtrado por: {profile?.nombre}</small>
                <button className="btn-close" onClick={() => setShowPreview(false)}></button>
              </div>
              <div className="p-3 border-bottom bg-light">
                <div className="input-group">
                  <span className="input-group-text"><Search size={18} /></span>
                  <input type="text" className="form-control" placeholder="Buscar..." value={globalSearch} onChange={(e) => setGlobalSearch(e.target.value)} />
                </div>
              </div>
              <div className="modal-body p-0" style={{ maxHeight: '65vh', overflow: 'auto' }}>
                <table className="table table-sm table-bordered mb-0">
                  <thead className="table-dark sticky-top">
                    <tr>
                      {previewHeaders.map((h, i) => <th key={i} className="text-center text-uppercase small">{h}</th>)}
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
              <div className="bg-light border-top p-3">
                <div className="row text-center fw-bold">
                  <div className="col-6">Cantidad Total: <span className="text-primary fs-5">{totals.cantidad.toLocaleString()}</span></div>
                  <div className="col-6">Total S/: <span className="text-success fs-5">{totals.total}</span></div>
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setShowPreview(false)}>Cerrar</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
} 