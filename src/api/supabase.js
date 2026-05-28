import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Función para subir archivos (ya la tienes, pero la dejo completa)
export const uploadExcel = async (file, tipo, laboratorio, nombre) => {
  const fileExt = file.name.split('.').pop();
  const fileName = `${Date.now()}-${nombre}.${fileExt}`;
  const filePath = `${tipo}/${laboratorio}/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from('excels')
    .upload(filePath, file, { upsert: true });

  if (uploadError) throw uploadError;

  const { data: urlData } = supabase.storage
    .from('excels')
    .getPublicUrl(filePath);

  return { 
    publicUrl: urlData.publicUrl, 
    filePath 
  };
};