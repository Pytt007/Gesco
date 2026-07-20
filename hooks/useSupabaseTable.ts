import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../services/supabase';

type WithId = { id: string };

/**
 * Hook générique qui reproduit l'API de useLocalStorage<T[]> mais synchronise
 * avec une table Supabase.
 *
 * Structure attendue de la table :
 *   - id TEXT PRIMARY KEY
 *   - school_year TEXT
 *   - data JSONB
 *
 * Usage :
 *   const [students, setStudents, isLoading] = useSupabaseTable<Student>(
 *     'students', schoolYear
 *   );
 */
function useSupabaseTable<T extends WithId>(
  tableName: string,
  schoolYear: string,
  initialValue: T[] = []
): [T[], React.Dispatch<React.SetStateAction<T[]>>, boolean] {
  const [data, setData] = useState<T[]>(initialValue);
  const [loading, setLoading] = useState(true);
  const prevDataRef = useRef<T[]>([]);

  // ─── Chargement initial depuis Supabase ───────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    const fetchData = async () => {
      setLoading(true);
      const { data: rows, error } = await supabase
        .from(tableName)
        .select('id, data')
        .eq('school_year', schoolYear)
        .order('created_at', { ascending: true });

      if (cancelled) return;

      if (error) {
        console.error(`[useSupabaseTable] Erreur chargement "${tableName}":`, error.message);
        setData(initialValue);
      } else {
        const items = (rows || []).map((r: { id: string; data: T }) => ({
          ...r.data,
          id: r.id,
        })) as T[];
        setData(items);
        prevDataRef.current = items;
      }
      setLoading(false);
    };

    fetchData();

    // 1. Écouter les changements d'authentification pour recharger
    const { data: { subscription: authSub } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
        fetchData();
      }
    });

    // 2. Écouter les modifications de la table en temps réel (Realtime)
    const channel = supabase
      .channel(`public:${tableName}:${schoolYear}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: tableName,
        },
        () => {
          if (!cancelled) {
            fetchData();
          }
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      authSub.unsubscribe();
      supabase.removeChannel(channel);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tableName, schoolYear]);

  // ─── Setter synchronisé avec Supabase ─────────────────────────────────────
  const setValue: React.Dispatch<React.SetStateAction<T[]>> = useCallback(
    (valueOrUpdater) => {
      setData((prev) => {
        const newValue =
          typeof valueOrUpdater === 'function'
            ? (valueOrUpdater as (p: T[]) => T[])(prev)
            : valueOrUpdater;

        // Synchronisation asynchrone — ne bloque pas le rendu React
        syncToSupabase(tableName, schoolYear, prev, newValue);
        prevDataRef.current = newValue;
        return newValue;
      });
    },
    [tableName, schoolYear]
  );

  return [data, setValue, loading];
}

// ─── Diffing et sync ─────────────────────────────────────────────────────────

async function syncToSupabase<T extends WithId>(
  tableName: string,
  schoolYear: string,
  prevItems: T[],
  newItems: T[]
) {
  try {
    const prevIds = new Set(prevItems.map((i) => i.id));
    const newIds = new Set(newItems.map((i) => i.id));

    // 1. Supprimer les éléments retirés
    const toDelete = [...prevIds].filter((id) => !newIds.has(id));
    if (toDelete.length > 0) {
      const { error } = await supabase
        .from(tableName)
        .delete()
        .eq('school_year', schoolYear)
        .in('id', toDelete);
      if (error) console.error(`[sync] delete "${tableName}":`, error.message);
    }

    // 2. Upsert les éléments nouveaux ou modifiés
    const upsertRows = newItems.map((item) => ({
      id: item.id,
      school_year: schoolYear,
      data: item,
      updated_at: new Date().toISOString(),
    }));

    if (upsertRows.length > 0) {
      const { error } = await supabase
        .from(tableName)
        .upsert(upsertRows, { onConflict: 'id, school_year' });
      if (error) console.error(`[sync] upsert "${tableName}":`, error.message);
    }
  } catch (err) {
    console.error(`[syncToSupabase] exception pour "${tableName}":`, err);
  }
}

export default useSupabaseTable;
