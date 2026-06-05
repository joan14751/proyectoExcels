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

  // ==================== FILTRO POR LABORATORIO MEJORADO ====================
  const filterByLaboratorio = (rows, userLab, headers) => {
    if (!userLab || isAdmin) return rows;
    const labUpper = userLab.toUpperCase().trim();

    return rows.filter(row => {
      return row.some((cell, index) => {
        if (!cell) return false;
        const cellStr = String(cell).toUpperCase().trim();
        const header = headers[index] ? String(headers[index]).toUpperCase() : '';

        // Filtro más fuerte para IMS PDF
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

      // === FILTRO POR LABORATORIO (Se aplica primero) ===
      if (!isAdmin && profile?.nombre) {
        rows = filterByLaboratorio(rows, profile.nombre, headers);
      }

      // === ORDEN POR REP.VENTAS (Solo IMS PDF) ===
      if (doc.tipo === 'IMS PDF' && rows.length > 0) {
        rows.sort((a, b) => {
          const repA = String(a[2] || a['REP.VENTAS'] || "").trim().toUpperCase();
          const repB = String(b[2] || b['REP.VENTAS'] || "").trim().toUpperCase();
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
        rows = filterByLaboratorio(rows, profile.nombre, jsonData[0]);
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

  const totals = useMemo(() => {
    if (!previewData) return { cantidad: 0, total: 0 };

    const dataToSum = globalSearch.trim() ? filteredRows : previewData;

    let sumaCantidad = 0;
    let sumaTotal = 0;

    dataToSum.forEach(row => {
      const cantidad = parseFloat(row[3]) || 0;
      const total = parseFloat(row[4]) || 0;
      sumaCantidad += cantidad;
      sumaTotal += total;
    });

    return { cantidad: sumaCantidad, total: sumaTotal.toFixed(2) };
  }, [previewData, filteredRows, globalSearch]);

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
        </div>

        {loading ? (
          <p>Cargando documentos...</p>
        ) : documentos.length === 0 ? (
          <div className="alert alert-info">No tienes documentos asignados.</div>
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

      {/* MODAL */}
      {showPreview && previewData && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.85)' }}>
          <div className="modal-dialog modal-xl">
            <div className="modal-content">
              <div className="modal-header">
                <h5>Previsualización: {previewName}</h5>
                <small className="text-muted ms-3">
                  {isAdmin ? "✅ VISTA COMPLETA" : `Filtrado por: ${profile?.nombre}`}
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

              <div className="modal-body p-0" style={{ maxHeight: '65vh', overflow: 'auto' }}>
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

              <div className="bg-light border-top p-3">
                <div className="row text-center fw-bold">
                  <div className="col-6">
                    Cantidad Total: <span className="text-primary fs-5">{totals.cantidad.toLocaleString()}</span>
                  </div>
                  <div className="col-6">
                    Total S/: <span className="text-success fs-5">{totals.total}</span>
                  </div>
                </div>
              </div>

              <div className="modal-footer">
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