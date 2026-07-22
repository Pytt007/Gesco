import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabase';

/**
 * Hook pour les permissions de rôle — stockées dans la colonne
 * role_permissions (JSONB) de la table school_settings avec fallback localStorage.
 */
function useSupabaseRolePermissions(
  defaultPermissions: Record<string, string[]>
): [Record<string, string[]>, (perms: Record<string, string[]>) => void, boolean] {
  const localKey = 'gesco_role_permissions';

  const getLocalBackup = (): Record<string, string[]> => {
    try {
      const saved = localStorage.getItem(localKey);
      if (saved) return JSON.parse(saved);
    } catch {}
    return defaultPermissions;
  };

  const [permissions, setPermissions] = useState<Record<string, string[]>>(getLocalBackup);
  const [loading, setLoading] = useState(true);
  const [settingsId, setSettingsId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const fetchPerms = async () => {
      setLoading(true);
      try {
        const { data: rows, error } = await supabase
          .from('school_settings')
          .select('id, role_permissions')
          .limit(1);

        if (cancelled) return;

        if (!error && rows && rows.length > 0) {
          setSettingsId(rows[0].id);
          if (rows[0].role_permissions && Object.keys(rows[0].role_permissions).length > 0) {
            setPermissions(rows[0].role_permissions);
            try {
              localStorage.setItem(localKey, JSON.stringify(rows[0].role_permissions));
            } catch {}
          }
        } else {
          setPermissions(getLocalBackup());
        }
      } catch {
        if (!cancelled) setPermissions(getLocalBackup());
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchPerms();
    return () => { cancelled = true; };
  }, []);

  const savePermissions = useCallback(
    async (perms: Record<string, string[]>) => {
      setPermissions(perms);
      try {
        localStorage.setItem(localKey, JSON.stringify(perms));
      } catch {}

      try {
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
      } catch (err) {
        console.error('[useSupabaseRolePermissions] save exception:', err);
      }
    },
    [settingsId]
  );

  return [permissions, savePermissions, loading];
}

export default useSupabaseRolePermissions;
