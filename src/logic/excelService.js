import * as XLSX from 'xlsx';
import { supabase } from '../api/supabase';

// Función de conversión de fechas ULTRA ROBUSTA
const excelDateToJSDate = (value) => {
  if (!value) return value;

  // Si ya es string en formato fecha
  if (typeof value === 'string') {
    if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(value)) return value;
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  }

  // Si es número serial de Excel
  const num = Number(value);
  if (!isNaN(num) && num > 25569 && num < 50000) {
    try {
      const utc_days = Math.floor(num - 25569);
      const date = new Date(utc_days * 86400 * 1000);

      const fraction = num - Math.floor(num);
      if (fraction > 0) {
        const totalSeconds = Math.round(fraction * 86400);
        date.setHours(Math.floor(totalSeconds / 3600), Math.floor((totalSeconds % 3600) / 60));
      }

      return date.toLocaleDateString('es-PE', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      });
    } catch (e) {
      return value;
    }
  }

  return value;
};

export const excelService = {
  processExcel: (file, tipo) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          const worksheet = workbook.Sheets[workbook.SheetNames[0]];

          let jsonData = XLSX.utils.sheet_to_json(worksheet, {
            header: 1,
            defval: ""
          });

          jsonData = jsonData.filter(row => row && row.some(cell => String(cell).trim() !== ""));

          let originalHeaders = jsonData[0] || [];
          let rowsStartIndex = 1;

          if (tipo === 'IMS PDF') {
            for (let i = 0; i < Math.min(15, jsonData.length); i++) {
              const row = jsonData[i];
              if (row.some(cell => String(cell).toUpperCase().includes('LABORATORIO'))) {
                originalHeaders = row.filter(cell => cell !== null && String(cell).trim() !== "");
                rowsStartIndex = i + 1;
                break;
              }
            }
          }

          const rows = jsonData.slice(rowsStartIndex);

          let processedData = rows.map(row => {
            const obj = {};
            originalHeaders.forEach((header, index) => {
              let value = row[index] ?? "";
              const headerStr = String(header).trim();
              const headerUpper = headerStr.toUpperCase();

              // Detección EXACTA y amplia
              if (headerStr === 'Fecha de Vencimiento' || 
                  headerUpper.includes('VENCIMIENTO') || 
                  headerUpper.includes('FECHA') ||
                  headerUpper.includes('ADMISIÓN') ||
                  headerUpper.includes('VENC') ||
                  headerUpper.includes('EXPIRACION')) {
                value = excelDateToJSDate(value);
              }

              const key = headerStr || `columna_${index}`;
              obj[key] = value;
            });
            return obj;
          });

          resolve({
            headers: originalHeaders,
            data: processedData,
            tipo: tipo,
            rowCount: processedData.length
          });
        } catch (err) {
          console.error("Error procesando Excel:", err);
          reject(err);
        }
      };

      reader.onerror = () => reject(new Error("Error al leer el archivo"));
      reader.readAsArrayBuffer(file);
    });
  },

  uploadAndSave: async (file, originalName, tipo, laboratorio = 'General') => {
    await supabase
      .from('documentos')
      .update({ activo: false })
      .eq('tipo', tipo);

    let cleanName = originalName
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .replace(/_+/g, '_');

    const fileExt = file.name.split('.').pop().toLowerCase();
    const timestamp = Date.now();
    const fileName = `${timestamp}-${cleanName}.${fileExt}`;
    const filePath = `${tipo}/${laboratorio}/${fileName}`;

    try {
      const { error: uploadError } = await supabase.storage
        .from('excels')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { error: dbError } = await supabase
        .from('documentos')
        .insert({
          nombre: originalName,
          tipo: tipo,
          url: filePath,
          laboratorio: laboratorio,
          activo: true
        });

      if (dbError) throw dbError;

      return { success: true, filePath };
    } catch (error) {
      console.error(error);
      throw error;
    }
  }
};