import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabase';

/**
 * Hook pour les permissions de rôle — stockées dans la colonne
 * role_permissions (JSONB) de la table school_settings.
 */
function useSupabaseRolePermissions(
  defaultPermissions: Record<string, string[]>
): [Record<string, string[]>, (perms: Record<string, string[]>) => void, boolean] {
  const [permissions, setPermissions] = useState<Record<string, string[]>>(defaultPermissions);
  const [loading, setLoading] = useState(true);
  const [settingsId, setSettingsId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const fetchPerms = async () => {
      setLoading(true);
      const { data: rows, error } = await supabase
        .from('school_settings')
        .select('id, role_permissions')
        .limit(1);

      if (cancelled) return;

      if (!error && rows && rows.length > 0) {
        setSettingsId(rows[0].id);
        if (rows[0].role_permissions && Object.keys(rows[0].role_permissions).length > 0) {
          setPermissions(rows[0].role_permissions);
        }
      }
      setLoading(false);
    };

    fetchPerms();
    return () => { cancelled = true; };
  }, []);

  const savePermissions = useCallback(
    async (perms: Record<string, string[]>) => {
      setPermissions(perms);

      if (settingsId) {
        await supabase
          .from('school_settings')
          .update({ role_permissions: perms, updated_at: new Date().toISOString() })
          .eq('id', settingsId);
      } else {
        // Créer la ligne settings si elle n'existe pas
        const { data } = await supabase
          .from('school_settings')
          .insert({ role_permissions: perms })
          .select('id')
          .single();
        if (data) setSettingsId(data.id);
      }
    },
    [settingsId]
  );

  return [permissions, savePermissions, loading];
}

export default useSupabaseRolePermissions;
