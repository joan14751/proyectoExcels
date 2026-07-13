import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/common/Navbar';
import { supabase } from '../api/supabase';
// Importamos Eye y EyeOff para la visibilidad
import { User, Edit2, Trash2, ArrowLeft, Key, Eye, EyeOff } from 'lucide-react';

const LABORATORIOS_PREDEFINIDOS = [
  "ABBOTT", "AJR LABS", "ALFA", "ALIFARMA", "ALITECH", "ALKOFARMA", "APROPO", 
  "ARIAL PERU BIOF SAC", "ATRAL S.A.", "AVANX", "AXON PHARMA", "BAGO", "BAYER", 
  "BEIZA - EXCLUSIVOS", "BEIZA-GENERICOS", "BIOREG PHARMA SAC", "BIOSANA", 
  "BIOSYN TEC SAC", "BIOTECH HEALTH", "BIOTOSCANA", "BMCFARMA", "BONAPHARMA", 
  "BRAUN", "CAFERMA", "CAMPO VERDE", "CARNOT LAB", "CECIFARMA GROUP SAC", 
  "CIFARMA", "CIPA S.A.", "COASPHARMA", "COASPHARMA - PEQUITA", "COLADOS AGU", 
  "COLGATE - PALMOLIVE", "COLICHON", "CONTADOS", "CONTINENTAL", "CORPORACION FS", 
  "CORPORACION MEDCO", "COSTA VIVA", "COTIZACION", "CSP LIFESCIENCES", 
  "D & M PHARMA PERU S.", "D' OLAPHARM", "DENTAID", "DEUTSCHE PHARMA S.A.", 
  "DILAYNE", "DIPHASAC", "DISTOLOZA", "DISTRIB. DANY SRL", "DKT", 
  "DOCTOR ANDREU Q.F. S", "DRO PE SAC", "DROG. ALFARO", "DROGUERIA 356", 
  "DROGUERIA ALFARO - M", "DROKASA SA", "EDCEISA", "ELIFARMA", "EMCURE", 
  "F&S PHARMA", "FAES FARMA", "FAMILY DOCTOR", "FARMACEUTICA LATINA", "FARMEDIC", 
  "FARMINDUSTRIA", "FARVET", "G & R", "G.W. YICHANG & CIA", "G.W. YICHANG LICORER", 
  "G.W. YICHANG LIMPIEZ", "GABBLAN", "GABBLAN GENERICO", "GEDEON RICHTER", 
  "GEMEFAR S.A.C.", "GENERICOS", "GENERION CORPORATION", "GENFAR PERU S.A.", 
  "GENOMMA LAB", "GLAXO SMITH KLINE", "GLENMARK PHARMA", "GOOD BRANDS", 
  "GRUNENTAL", "GRUNENTHAL", "GRUPO FARMA", "GSK", "HERSIL S.A.", "INDUFAR", 
  "INDUQUIMICA", "INFERMED SAC.", "INTI", "IQ FARMA - LINEA C", "IQ FARMA - LINEA G", 
  "ITALFARMACO S.A.", "IVAL FARMA", "KEYFARM .S.A.C.", "LA COMERC UNO", 
  "LAB. FARMA MARKOS", "LAB.FARMACEUTICOS MA", "LABOCER S.A.", "LABOGEN", 
  "LABORATIOS AMERIC.", "LABORATORIOS DELFARM", "LAFAGE", "LANSIER S.A.C.", 
  "LCG", "LUDBER", "LUSA", "LUXOR", "M Y F TRADE", "MACLEODS", "MAVER", 
  "MEAD JOHNSON", "MEDIFARMA", "MEDROCK - LINEA COME", "MEDROCK - LINEA GENE", 
  "MEGA WE CARE", "MERCK", "MERPHARMA", "MIDHCO DISTRIBUCIONE", "MONT GROUP", 
  "MS Pharma", "MYF TRADING", "NAR VID", "NINET", "NIPRO", "NORDIC PHARMACEUTIC", 
  "OLCESE DISTRIB", "OMYGAD", "OQPHARMA S.A.C.", "OTARVASQ 1", "P-G HOME", 
  "PAK FARMA S.A.C.", "PANADERIA SAN JORGE", "PANIJU", "PERFAR", "PERU FARMA", 
  "PERUMEDIC", "PG PHARMA", "PHARMA CHECK", "PHARMAGEN", "PHARMED CORPORATION", 
  "PORTUGAL", "PREV-COVID", "PRODUCTOS DE BONI", "PRODUCTOS DE INTRO", "PROPIEL", 
  "QAM", "QM PHARMA", "QS- SANOFI", "QUILAB - VIFOR", "QUILAB FARMA", 
  "QUILLA PHARMA PERU S", "QUIMFA PERU", "RB HEALTH", "ROCCIA", "ROEL GRACE S.A.C.", 
  "ROEMMERS S.A.", "ROWE", "S.J. ROXFARMA S.A-", "S.J. ROXFARMA S.A.-", 
  "SAN JORGE", "SANIMED", "SANITAS", "SANOFI AVENTIS", "SANOFI-AVENTIS PERU", 
  "SCHERING - PLOUGH", "SCIENTIA PHARMA SAC", "SEBAL FARMA", "SERVICIOS", 
  "SIEGFRIED S.A.C.", "SMART PHARMA",  "SOFTCARE PERU", "STARBRANDS", "SUN PHARMA", "TENDENCE", 
  "TERBOL PERU S.A.", "TEST", "TEVA", "THEFAR S.A.C.", "TOBAL", "TUINIES", 
  "UNIMED", "UPFIELD", "VITALIS PERU S.A.C.", "WELLNESS & CARE", "Z OTROS", 
  "ZENNIT FARMA"
].sort();

export default function ManageUsers() {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [formData, setFormData] = useState({ nombre: '', email: '', rol: 'usuario', password: '' });
  const [editingUser, setEditingUser] = useState(null);
  const [loading, setLoading] = useState(false);
  // ESTADO PARA MOSTRAR/OCULTAR CONTRASEÑA
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    const { data } = await supabase.from('profiles').select('*').order('nombre');
    setUsers(data || []);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!editingUser && !formData.nombre) return alert("Seleccione un laboratorio para el nuevo usuario");
    if (!formData.email) return alert("El correo electrónico es obligatorio");

    setLoading(true);
    try {
      if (editingUser) {
        const { error: profileError } = await supabase.from('profiles').update({ 
          nombre: formData.nombre,
          email: formData.email, 
          rol: formData.rol 
        }).eq('id', editingUser.id);

        if (profileError) throw profileError;

        if (formData.password && formData.password.length >= 6) {
          const { error: authError } = await supabase.auth.updateUser({
            password: formData.password
          });
          if (authError) throw new Error("Error al actualizar contraseña: " + authError.message);
        }
      } else {
        const { data, error } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password || '123456',
          options: { data: { nombre: formData.nombre } }
        });
        if (error) throw error;
        if (data?.user) {
          await supabase.from('profiles').insert({
            id: data.user.id,
            nombre: formData.nombre,
            email: formData.email,
            rol: formData.rol
          });
        }
      }
      setFormData({ nombre: '', email: '', rol: 'usuario', password: '' });
      setEditingUser(null);
      setShowPassword(false); // Resetear visibilidad
      fetchUsers();
      alert("✅ Proceso completado con éxito");
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (user) => {
    setEditingUser(user);
    setFormData({ nombre: user.nombre, email: user.email, rol: user.rol, password: '' });
    window.scrollTo(0, 0);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("¿Eliminar usuario?")) return;
    await supabase.from('profiles').delete().eq('id', id);
    fetchUsers();
  };

  return (
    <>
      <Navbar />
      <div className="container py-5">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <h2 className="fw-bold text-primary">Gestión de Usuarios</h2>
          <button className="btn btn-outline-secondary rounded-pill" onClick={() => navigate('/admin')}>
            <ArrowLeft size={18} className="me-2" /> Volver
          </button>
        </div>

        <div className="card shadow-sm mb-5 border-0 rounded-4 overflow-hidden">
          <div className={`card-header ${editingUser ? 'bg-warning text-dark' : 'bg-primary text-white'} py-3`}>
            <h5 className="mb-0 d-flex align-items-center gap-2">
              <User size={20} /> {editingUser ? `Editando: ${editingUser.nombre}` : 'Registrar Nuevo Acceso'}
            </h5>
          </div>
          <div className="card-body p-4 bg-white">
            <form onSubmit={handleSubmit}>
              <div className="row g-3">
                <div className="col-md-6">
                  <label className="form-label fw-bold">Laboratorio (Opcional al editar)</label>
                  <select 
                    className="form-select border-2"
                    value={formData.nombre}
                    onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  >
                    <option value="">Seleccione o mantenga actual...</option>
                    {LABORATORIOS_PREDEFINIDOS.map(lab => (
                      <option key={lab} value={lab}>{lab}</option>
                    ))}
                  </select>
                </div>

                <div className="col-md-6">
                  <label className="form-label fw-bold">Email de Acceso</label>
                  <input type="email" className="form-control border-2" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} required />
                </div>

                <div className="col-md-6">
                  <label className="form-label fw-bold">Rol</label>
                  <select className="form-select border-2" value={formData.rol} onChange={(e) => setFormData({ ...formData, rol: e.target.value })}>
                    <option value="usuario">Usuario Estándar</option>
                    <option value="admin">Administrador</option>
                  </select>
                </div>

                <div className="col-md-6">
                  <label className="form-label fw-bold text-primary">Contraseña</label>
                  <div className="input-group border-2">
                    <span className="input-group-text bg-light text-primary border-end-0"><Key size={16}/></span>
                    <input 
                      // AQUÍ CAMBIA EL TYPE DINÁMICAMENTE
                      type={showPassword ? "text" : "password"} 
                      className="form-control border-start-0" 
                      value={formData.password} 
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })} 
                      placeholder={editingUser ? "Solo si desea cambiarla" : "Mín. 6 car."} 
                      style={{ borderLeft: 'none' }}
                    />
                    {/* BOTÓN PARA ALTERNAR VISIBILIDAD */}
                    <button 
                      className="btn btn-outline-secondary border-start-0" 
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      style={{ borderLeft: 'none' }}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="mt-4 d-flex gap-2">
                <button type="submit" disabled={loading} className={`btn ${editingUser ? 'btn-warning' : 'btn-success'} px-4 py-2 fw-bold shadow-sm`}>
                  {loading ? 'Procesando...' : editingUser ? 'Actualizar Datos' : 'Registrar Usuario'}
                </button>
                {editingUser && (
                  <button type="button" className="btn btn-light border px-4" onClick={() => {setEditingUser(null); setFormData({ nombre: '', email: '', rol: 'usuario', password: '' }); setShowPassword(false);}}>
                    Cancelar
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>

        <h5 className="fw-bold mb-3 text-secondary small text-uppercase">Cuentas activas</h5>
        <div className="card border-0 shadow-sm rounded-4 overflow-hidden">
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="bg-light">
                <tr>
                  <th className="ps-4 py-3">Nombre / Laboratorio</th>
                  <th>Correo</th>
                  <th>Rol</th>
                  <th className="text-end pe-4">Gestión</th>
                </tr>
              </thead>
              <tbody>
                {users.map(user => (
                  <tr key={user.id}>
                    <td className="ps-4 text-dark fw-bold">{user.nombre}</td>
                    <td className="text-muted">{user.email}</td>
                    <td>
                      <span className={`badge rounded-pill ${user.rol === 'admin' ? 'bg-danger-subtle text-danger' : 'bg-primary-subtle text-primary'} px-3`}>
                        {user.rol}
                      </span>
                    </td>
                    <td className="text-end pe-4">
                      <button className="btn btn-sm btn-outline-primary me-2 border-0" onClick={() => handleEdit(user)}>
                        <Edit2 size={18} />
                      </button>
                      <button className="btn btn-sm btn-outline-danger border-0" onClick={() => handleDelete(user.id)}>
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}