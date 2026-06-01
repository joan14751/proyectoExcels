import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/common/Navbar';
import { excelService } from '../logic/excelService';
import { Upload, FileSpreadsheet, ArrowLeft, CheckCircle } from 'lucide-react';

export default function UploadExcel() {
  const navigate = useNavigate();
  
  const [tipo, setTipo] = useState('IMS');
  const [laboratorio, setLaboratorio] = useState('General');
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleFileChange = async (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setError('');
    setSuccess(false);

    try {
      const result = await excelService.processExcel(selectedFile, tipo);
      setPreview(result);
    } catch (err) {
      console.error(err);
      setError("Error al procesar el archivo Excel. Verifica el formato.");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) return;

    setUploading(true);
    setError('');

    try {
      const autoNombre = file.name.replace(/\.[^/.]+$/, "");
      
      await excelService.uploadAndSave(file, autoNombre, tipo, laboratorio);
      
      setSuccess(true);
      setFile(null);
      setPreview(null);

      setTimeout(() => {
        navigate('/admin');
      }, 1800);

    } catch (err) {
      console.error(err);
      setError(err.message || "Error al subir el archivo");
    }
    
    setUploading(false);
  };

  return (
    <>
      <Navbar />
      <div className="container py-5">
        <button 
          onClick={() => navigate('/admin')} 
          className="btn btn-outline-secondary mb-4 d-flex align-items-center gap-2"
        >
          <ArrowLeft size={18} /> Volver al Panel
        </button>

        <div className="row justify-content-center">
          <div className="col-lg-8">
            <div className="card shadow border-0 rounded-4">
              <div className="card-header bg-primary text-white py-5 text-center rounded-top-4">
                <Upload size={55} className="mb-3" />
                <h3 className="mb-1 fw-bold">Cargar Archivo Excel</h3>
                <p className="mb-0">IMS • Stock • Rotación • IMS PDF</p>
              </div>

              <div className="card-body p-5">
                <form onSubmit={handleSubmit}>
                  
                  {/* Tipo de Reporte */}
                  <div className="mb-4">
                    <label className="form-label fw-bold">Tipo de Reporte</label>
                    <select 
                      className="form-select form-select-lg" 
                      value={tipo} 
                      onChange={(e) => setTipo(e.target.value)}
                    >
                      <option value="IMS">IMS</option>
                      <option value="Stock">Stock</option>
                      <option value="Rotacion">Rotación</option>
                      <option value="IMS PDF">IMS PDF</option>   {/* ← Agregado */}
                    </select>
                  </div>

                  {/* Laboratorio */}
                  <div className="mb-4">
                    <label className="form-label fw-bold">Laboratorio</label>
                    <select 
                      className="form-select form-select-lg" 
                      value={laboratorio} 
                      onChange={(e) => setLaboratorio(e.target.value)}
                      required
                    >
                      <option value="General">General</option>
                      <option value="CAFERMA">CAFERMA</option>
                      <option value="ALFA">ALFA</option>
                      <option value="ALITECH">ALITECH</option>
                      <option value="AVANX">AVANX</option>
                      {/* Agrega aquí más laboratorios según necesites */}
                    </select>
                  </div>

                  {/* Selección de Archivo */}
                  <div className="mb-5">
                    <label className="form-label fw-bold">Seleccionar Archivo</label>
                    <div 
                      className="border border-2 border-dashed rounded-4 p-5 text-center hover-shadow"
                      style={{ cursor: 'pointer', backgroundColor: '#f8fafc' }}
                      onClick={() => document.getElementById('fileInput').click()}
                    >
                      <FileSpreadsheet size={80} className="text-primary mb-3" />
                      <h5 className="fw-semibold">Haz clic para seleccionar el archivo</h5>
                      <p className="text-muted mb-0">.xlsx o .xls</p>
                      <input 
                        id="fileInput" 
                        type="file" 
                        className="d-none" 
                        accept=".xlsx,.xls" 
                        onChange={handleFileChange} 
                      />
                    </div>
                  </div>

                  {file && (
                    <div className="alert alert-info d-flex align-items-center">
                      <CheckCircle className="me-2" /> 
                      <strong>{file.name}</strong>
                    </div>
                  )}

                  {preview && (
                    <div className="alert alert-success">
                      ✅ {preview.rowCount} filas detectadas | Tipo: <strong>{tipo}</strong>
                    </div>
                  )}

                  {error && <div className="alert alert-danger">{error}</div>}
                  
                  {success && (
                    <div className="alert alert-success fw-bold text-center">
                      ¡Archivo subido correctamente! Redirigiendo...
                    </div>
                  )}

                  <button 
                    type="submit" 
                    className="btn btn-success btn-lg w-100 py-3 fw-bold"
                    disabled={uploading || !file}
                  >
                    {uploading ? 'Subiendo archivo...' : 'Subir Archivo'}
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}