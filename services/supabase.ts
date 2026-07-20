import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    '[Supabase] Variables VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY manquantes.\n' +
    'Créez un fichier .env.local avec ces variables (voir .env.example).'
  );
}

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '', {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

/** Convertit un nom d'utilisateur en email synthétique pour Supabase Auth */
export const usernameToEmail = (username: string): string =>
  `${username.toLowerCase().trim()}@gesco-v1.local`;

/** Extrait le nom d'utilisateur depuis un email synthétique */
export const emailToUsername = (email: string): string =>
  email.replace('@gesco-v1.local', '');
