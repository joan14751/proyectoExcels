import { supabase } from '../api/supabase';

export const permissionsService = {

  // Dar acceso a un documento
  async grantAccess(userId, documentoId) {
    const { error } = await supabase
      .from('permisos_documento')
      .upsert({
        user_id: userId,
        documento_id: documentoId,
        tiene_acceso: true
      });
    return !error;
  },

  // Revocar acceso
  async revokeAccess(userId, documentoId) {
    const { error } = await supabase
      .from('permisos_documento')
      .upsert({
        user_id: userId,
        documento_id: documentoId,
        tiene_acceso: false
      });
    return !error;
  },

  // Obtener documentos visibles para un usuario (VERSIÓN CORREGIDA)
  async getUserDocuments(userId) {
    const { data, error } = await supabase
      .from('documentos')
      .select(`
        *,
        permisos_documento!inner (
          tiene_acceso
        )
      `)
      .eq('activo', true)
      .eq('permisos_documento.user_id', userId)
      .eq('permisos_documento.tiene_acceso', true);

    if (error) {
      console.error("Error obteniendo documentos del usuario:", error);
      return [];
    }
    return data || [];
  }
};