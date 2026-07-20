import { supabase } from '../services/supabase';

type UploadLogoResult = { publicUrl: string } | { error: string };

/**
 * Upload un logo/image dans le bucket Supabase Storage 'gesco-assets'.
 * Retourne l'URL publique de l'image uploadée.
 */
export async function uploadLogo(file: File, path: string = 'logos/school-logo'): Promise<UploadLogoResult> {
  const ext = file.name.split('.').pop();
  const filePath = `${path}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from('gesco-assets')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: true, // Écrase si existe déjà
    });

  if (uploadError) {
    console.error('[storageService] upload error:', uploadError);
    return { error: uploadError.message };
  }

  const { data } = supabase.storage
    .from('gesco-assets')
    .getPublicUrl(filePath);

  return { publicUrl: data.publicUrl };
}

/**
 * Supprime un fichier du bucket Supabase Storage.
 */
export async function deleteStorageFile(path: string): Promise<void> {
  const { error } = await supabase.storage.from('gesco-assets').remove([path]);
  if (error) {
    console.error('[storageService] delete error:', error);
  }
}
