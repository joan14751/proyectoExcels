import * as XLSX from 'xlsx';
import { supabase } from '../api/supabase';

export const excelService = {
  processExcel: (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          const worksheet = workbook.Sheets[workbook.SheetNames[0]];
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
          resolve({ rowCount: jsonData.length });
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  },

  uploadAndSave: async (file, originalName, tipo) => {
    // 1. Desactivar documentos anteriores del mismo tipo
    await supabase
      .from('documentos')
      .update({ activo: false })
      .eq('tipo', tipo);

    // 2. Limpiar nombre del archivo
    let cleanName = originalName
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .replace(/_+/g, '_');

    const fileExt = file.name.split('.').pop().toLowerCase();
    const timestamp = Date.now();
    const fileName = `${timestamp}-${cleanName}.${fileExt}`;
    const filePath = `${tipo}/General/${fileName}`;

    try {
      // Subir archivo
      const { error: uploadError } = await supabase.storage
        .from('excels')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Guardar nuevo documento activo
      const { error: dbError } = await supabase
        .from('documentos')
        .insert({
          nombre: originalName,
          tipo: tipo,
          url: filePath,
          laboratorio: 'General',
          activo: true
        });

      if (dbError) throw dbError;

      return { success: true };
    } catch (error) {
      console.error(error);
      throw error;
    }
  }
};