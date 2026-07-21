import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabase';
import { SchoolSettingsData } from '../types';

const DEFAULT_SETTINGS: SchoolSettingsData = {
  schoolName: '',
  directorName: '',
  logo: '/logo-light.png',
  email: '',
  phone: '',
  address: '',
};

/**
 * Hook pour les paramètres de l'école (ligne unique dans la table school_settings).
 * Reproduit l'API de useLocalStorage<SchoolSettingsData>.
 */
function useSupabaseSettings(): [
  SchoolSettingsData,
  (data: SchoolSettingsData) => void,
  boolean
] {
  const [settings, setSettings] = useState<SchoolSettingsData>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [rowId, setRowId] = useState<string | null>(null);

  // ─── Chargement initial ───────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    const fetchSettings = async () => {
      setLoading(true);
      const { data: rows, error } = await supabase
        .from('school_settings')
        .select('*')
        .limit(1);

      if (cancelled) return;

      if (error) {
        console.error('[useSupabaseSettings] fetch error:', error.message);
      } else if (rows && rows.length > 0) {
        const row = rows[0];
        setRowId(row.id);
        setSettings({
          schoolName: row.school_name || '',
          directorName: row.director_name || '',
          logo: row.logo || '/logo-light.png',
          email: row.email || '',
          phone: row.phone || '',
          address: row.address || '',
          currentSchoolYear: row.current_school_year || '2024-2025',
        });
      }
      // Si aucune ligne, les valeurs par défaut restent
      setLoading(false);
    };

    fetchSettings();

    // Écouter les changements des paramètres en temps réel (Realtime)
    const channel = supabase
      .channel('public:school_settings')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'school_settings',
        },
        () => {
          if (!cancelled) {
            fetchSettings();
          }
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, []);

  // ─── Setter — sauvegarde en base ──────────────────────────────────────────
  const saveSettings = useCallback(
    async (data: SchoolSettingsData) => {
      setSettings(data);

      const payload = {
        school_name: data.schoolName,
        director_name: data.directorName,
        logo: data.logo,
        email: data.email,
        phone: data.phone,
        address: data.address,
        current_school_year: data.currentSchoolYear || '2024-2025',
        updated_at: new Date().toISOString(),
      };

      if (rowId) {
        // Mise à jour de la ligne existante
        const { error } = await supabase
          .from('school_settings')
          .update(payload)
          .eq('id', rowId);
        if (error) console.error('[useSupabaseSettings] update error:', error.message);
      } else {
        // Première insertion
        const { data: inserted, error } = await supabase
          .from('school_settings')
          .insert(payload)
          .select('id')
          .single();
        if (error) {
          console.error('[useSupabaseSettings] insert error:', error.message);
        } else if (inserted) {
          setRowId(inserted.id);
        }
      }
    },
    [rowId]
  );

  return [settings, saveSettings, loading];
}

export default useSupabaseSettings;
