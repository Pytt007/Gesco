-- ============================================================
-- GESCO — Schéma Supabase PostgreSQL (Idempotent / Répétable sans erreur)
-- À exécuter dans l'éditeur SQL de votre projet Supabase
-- ============================================================

-- Extension UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- AUTH PROFILES — Étend auth.users avec le rôle GESCO
-- ============================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username      TEXT UNIQUE NOT NULL,
  full_name     TEXT,
  role          TEXT NOT NULL DEFAULT 'SCOLAIRE_ENSEIGNANT',
  avatar_url    TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger : met à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS profiles_updated_at ON public.profiles;
CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Trigger : crée un profil automatiquement lors d'un signUp Supabase Auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, full_name, role, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Utilisateur'),
    'SCOLAIRE_ENSEIGNANT',
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', '')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- HELPER FONCTION — Rôle de l'utilisateur courant
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS TEXT
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

-- ============================================================
-- SCHOOL SETTINGS — Configuration de l'établissement (1 ligne)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.school_settings (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_name     TEXT DEFAULT 'Mon École',
  director_name   TEXT DEFAULT '',
  logo            TEXT DEFAULT '/logo-light.png',
  email           TEXT DEFAULT '',
  phone           TEXT DEFAULT '',
  address         TEXT DEFAULT '',
  role_permissions JSONB DEFAULT '{}',
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

DROP TRIGGER IF EXISTS school_settings_updated_at ON public.school_settings;
CREATE TRIGGER school_settings_updated_at
  BEFORE UPDATE ON public.school_settings
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================
-- TABLES MÉTIERS DU SYSTÈME GESCO
-- Structure: id (PK), school_year, data (JSONB)
-- ============================================================

-- STUDENTS
CREATE TABLE IF NOT EXISTS public.students (
  id           TEXT,
  school_year  TEXT NOT NULL,
  data         JSONB NOT NULL,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (id, school_year)
);
CREATE INDEX IF NOT EXISTS students_school_year_idx ON public.students(school_year);
DROP TRIGGER IF EXISTS students_updated_at ON public.students;
CREATE TRIGGER students_updated_at
  BEFORE UPDATE ON public.students
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- STAFF
CREATE TABLE IF NOT EXISTS public.staff (
  id           TEXT,
  school_year  TEXT NOT NULL,
  data         JSONB NOT NULL,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (id, school_year)
);
CREATE INDEX IF NOT EXISTS staff_school_year_idx ON public.staff(school_year);
DROP TRIGGER IF EXISTS staff_updated_at ON public.staff;
CREATE TRIGGER staff_updated_at
  BEFORE UPDATE ON public.staff
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- CLASSES
CREATE TABLE IF NOT EXISTS public.classes (
  id           TEXT,
  school_year  TEXT NOT NULL,
  data         JSONB NOT NULL,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (id, school_year)
);
CREATE INDEX IF NOT EXISTS classes_school_year_idx ON public.classes(school_year);
DROP TRIGGER IF EXISTS classes_updated_at ON public.classes;
CREATE TRIGGER classes_updated_at
  BEFORE UPDATE ON public.classes
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- FEE RECORDS (Scolarité)
CREATE TABLE IF NOT EXISTS public.fee_records (
  id           TEXT,
  school_year  TEXT NOT NULL,
  data         JSONB NOT NULL,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (id, school_year)
);
CREATE INDEX IF NOT EXISTS fee_records_school_year_idx ON public.fee_records(school_year);
DROP TRIGGER IF EXISTS fee_records_updated_at ON public.fee_records;
CREATE TRIGGER fee_records_updated_at
  BEFORE UPDATE ON public.fee_records
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- FEE CONFIGS (Tarifs de scolarité)
CREATE TABLE IF NOT EXISTS public.fee_configs (
  id           TEXT,
  school_year  TEXT NOT NULL,
  data         JSONB NOT NULL,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (id, school_year)
);
CREATE INDEX IF NOT EXISTS fee_configs_school_year_idx ON public.fee_configs(school_year);
DROP TRIGGER IF EXISTS fee_configs_updated_at ON public.fee_configs;
CREATE TRIGGER fee_configs_updated_at
  BEFORE UPDATE ON public.fee_configs
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- TRANSACTIONS (Finance)
CREATE TABLE IF NOT EXISTS public.transactions (
  id           TEXT,
  school_year  TEXT NOT NULL,
  data         JSONB NOT NULL,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (id, school_year)
);
CREATE INDEX IF NOT EXISTS transactions_school_year_idx ON public.transactions(school_year);
DROP TRIGGER IF EXISTS transactions_updated_at ON public.transactions;
CREATE TRIGGER transactions_updated_at
  BEFORE UPDATE ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- CANTEEN SUBSCRIPTIONS
CREATE TABLE IF NOT EXISTS public.canteen_subscriptions (
  id           TEXT,
  school_year  TEXT NOT NULL,
  data         JSONB NOT NULL,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (id, school_year)
);
CREATE INDEX IF NOT EXISTS canteen_subscriptions_school_year_idx ON public.canteen_subscriptions(school_year);
DROP TRIGGER IF EXISTS canteen_subscriptions_updated_at ON public.canteen_subscriptions;
CREATE TRIGGER canteen_subscriptions_updated_at
  BEFORE UPDATE ON public.canteen_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- CANTEEN MENUS
CREATE TABLE IF NOT EXISTS public.canteen_menus (
  id           TEXT,
  school_year  TEXT NOT NULL,
  data         JSONB NOT NULL,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (id, school_year)
);
CREATE INDEX IF NOT EXISTS canteen_menus_school_year_idx ON public.canteen_menus(school_year);
DROP TRIGGER IF EXISTS canteen_menus_updated_at ON public.canteen_menus;
CREATE TRIGGER canteen_menus_updated_at
  BEFORE UPDATE ON public.canteen_menus
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- TRANSPORT SUBSCRIPTIONS
CREATE TABLE IF NOT EXISTS public.transport_subscriptions (
  id           TEXT,
  school_year  TEXT NOT NULL,
  data         JSONB NOT NULL,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (id, school_year)
);
CREATE INDEX IF NOT EXISTS transport_subscriptions_school_year_idx ON public.transport_subscriptions(school_year);
DROP TRIGGER IF EXISTS transport_subscriptions_updated_at ON public.transport_subscriptions;
CREATE TRIGGER transport_subscriptions_updated_at
  BEFORE UPDATE ON public.transport_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- BUS ROUTES
CREATE TABLE IF NOT EXISTS public.bus_routes (
  id           TEXT,
  school_year  TEXT NOT NULL,
  data         JSONB NOT NULL,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (id, school_year)
);
CREATE INDEX IF NOT EXISTS bus_routes_school_year_idx ON public.bus_routes(school_year);
DROP TRIGGER IF EXISTS bus_routes_updated_at ON public.bus_routes;
CREATE TRIGGER bus_routes_updated_at
  BEFORE UPDATE ON public.bus_routes
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ACTIVITIES
CREATE TABLE IF NOT EXISTS public.activities (
  id           TEXT,
  school_year  TEXT NOT NULL,
  data         JSONB NOT NULL,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (id, school_year)
);
CREATE INDEX IF NOT EXISTS activities_school_year_idx ON public.activities(school_year);
DROP TRIGGER IF EXISTS activities_updated_at ON public.activities;
CREATE TRIGGER activities_updated_at
  BEFORE UPDATE ON public.activities
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- EVALUATION SESSIONS (Notes)
CREATE TABLE IF NOT EXISTS public.evaluation_sessions (
  id           TEXT,
  school_year  TEXT NOT NULL,
  data         JSONB NOT NULL,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (id, school_year)
);
CREATE INDEX IF NOT EXISTS evaluation_sessions_school_year_idx ON public.evaluation_sessions(school_year);
DROP TRIGGER IF EXISTS evaluation_sessions_updated_at ON public.evaluation_sessions;
CREATE TRIGGER evaluation_sessions_updated_at
  BEFORE UPDATE ON public.evaluation_sessions
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- HISTORY LOGS
CREATE TABLE IF NOT EXISTS public.history_logs (
  id           TEXT,
  school_year  TEXT NOT NULL,
  data         JSONB NOT NULL,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (id, school_year)
);
CREATE INDEX IF NOT EXISTS history_logs_school_year_idx ON public.history_logs(school_year);
DROP TRIGGER IF EXISTS history_logs_updated_at ON public.history_logs;
CREATE TRIGGER history_logs_updated_at
  BEFORE UPDATE ON public.history_logs
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- CANTEEN FEE CONFIGS
CREATE TABLE IF NOT EXISTS public.canteen_fee_configs (
  id           TEXT NOT NULL,
  school_year  TEXT NOT NULL DEFAULT '2024-2025',
  data         JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (id, school_year)
);

-- CANTEEN STOCK ITEMS
CREATE TABLE IF NOT EXISTS public.canteen_stock_items (
  id           TEXT NOT NULL,
  school_year  TEXT NOT NULL DEFAULT '2024-2025',
  data         JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (id, school_year)
);

-- CANTEEN EXPENSES
CREATE TABLE IF NOT EXISTS public.canteen_expenses (
  id           TEXT NOT NULL,
  school_year  TEXT NOT NULL DEFAULT '2024-2025',
  data         JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (id, school_year)
);

-- TRANSPORT FEE CONFIGS
CREATE TABLE IF NOT EXISTS public.transport_fee_configs (
  id           TEXT NOT NULL,
  school_year  TEXT NOT NULL DEFAULT '2024-2025',
  data         JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (id, school_year)
);

-- BUS EXPENSES
CREATE TABLE IF NOT EXISTS public.bus_expenses (
  id           TEXT NOT NULL,
  school_year  TEXT NOT NULL DEFAULT '2024-2025',
  data         JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (id, school_year)
);

-- SCHOOL EXPENSES
CREATE TABLE IF NOT EXISTS public.school_expenses (
  id           TEXT NOT NULL,
  school_year  TEXT NOT NULL DEFAULT '2024-2025',
  data         JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (id, school_year)
);

-- SCHOOL BUDGETS
CREATE TABLE IF NOT EXISTS public.school_budgets (
  id           TEXT NOT NULL,
  school_year  TEXT NOT NULL DEFAULT '2024-2025',
  data         JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (id, school_year)
);

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fee_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fee_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.canteen_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.canteen_menus ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transport_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bus_routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evaluation_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.history_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.canteen_fee_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.canteen_stock_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.canteen_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transport_fee_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bus_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_budgets ENABLE ROW LEVEL SECURITY;

-- POLICIES (DROP BEFORE CREATE TO PREVENT ALREADY EXISTS ERRORS)

DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
CREATE POLICY "profiles_select_own" ON public.profiles
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "profiles_write" ON public.profiles;
CREATE POLICY "profiles_write" ON public.profiles
  FOR ALL USING (
    auth.role() = 'authenticated'
    AND public.get_my_role() = 'ADMIN_GENERALE'
  );

DROP POLICY IF EXISTS "school_settings_select" ON public.school_settings;
CREATE POLICY "school_settings_select" ON public.school_settings
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "school_settings_write" ON public.school_settings;
CREATE POLICY "school_settings_write" ON public.school_settings
  FOR ALL USING (
    auth.role() = 'authenticated'
    AND public.get_my_role() = 'ADMIN_GENERALE'
  );

DROP POLICY IF EXISTS "students_access" ON public.students;
CREATE POLICY "students_access" ON public.students FOR ALL USING (
  auth.role() = 'authenticated'
  AND public.get_my_role() IN ('ADMIN_GENERALE', 'SCOLAIRE_ENSEIGNANT')
);

DROP POLICY IF EXISTS "staff_access" ON public.staff;
CREATE POLICY "staff_access" ON public.staff FOR ALL USING (
  auth.role() = 'authenticated'
  AND public.get_my_role() IN ('ADMIN_GENERALE', 'SCOLAIRE_ENSEIGNANT')
);

DROP POLICY IF EXISTS "classes_access" ON public.classes;
CREATE POLICY "classes_access" ON public.classes FOR ALL USING (
  auth.role() = 'authenticated'
  AND public.get_my_role() IN ('ADMIN_GENERALE', 'SCOLAIRE_ENSEIGNANT')
);

DROP POLICY IF EXISTS "activities_access" ON public.activities;
CREATE POLICY "activities_access" ON public.activities FOR ALL USING (
  auth.role() = 'authenticated'
  AND public.get_my_role() IN ('ADMIN_GENERALE', 'SCOLAIRE_ENSEIGNANT')
);

DROP POLICY IF EXISTS "evaluation_sessions_access" ON public.evaluation_sessions;
CREATE POLICY "evaluation_sessions_access" ON public.evaluation_sessions FOR ALL USING (
  auth.role() = 'authenticated'
  AND public.get_my_role() IN ('ADMIN_GENERALE', 'SCOLAIRE_ENSEIGNANT')
);

DROP POLICY IF EXISTS "canteen_subscriptions_access" ON public.canteen_subscriptions;
CREATE POLICY "canteen_subscriptions_access" ON public.canteen_subscriptions FOR ALL USING (
  auth.role() = 'authenticated'
  AND public.get_my_role() IN ('ADMIN_GENERALE', 'CANTINE_TRANSPORT')
);

DROP POLICY IF EXISTS "canteen_menus_access" ON public.canteen_menus;
CREATE POLICY "canteen_menus_access" ON public.canteen_menus FOR ALL USING (
  auth.role() = 'authenticated'
  AND public.get_my_role() IN ('ADMIN_GENERALE', 'CANTINE_TRANSPORT')
);

DROP POLICY IF EXISTS "transport_subscriptions_access" ON public.transport_subscriptions;
CREATE POLICY "transport_subscriptions_access" ON public.transport_subscriptions FOR ALL USING (
  auth.role() = 'authenticated'
  AND public.get_my_role() IN ('ADMIN_GENERALE', 'CANTINE_TRANSPORT')
);

DROP POLICY IF EXISTS "bus_routes_access" ON public.bus_routes;
CREATE POLICY "bus_routes_access" ON public.bus_routes FOR ALL USING (
  auth.role() = 'authenticated'
  AND public.get_my_role() IN ('ADMIN_GENERALE', 'CANTINE_TRANSPORT')
);

DROP POLICY IF EXISTS "fee_records_access" ON public.fee_records;
CREATE POLICY "fee_records_access" ON public.fee_records FOR ALL USING (
  auth.role() = 'authenticated'
  AND public.get_my_role() IN ('ADMIN_GENERALE', 'FINANCE')
);

DROP POLICY IF EXISTS "fee_configs_access" ON public.fee_configs;
CREATE POLICY "fee_configs_access" ON public.fee_configs FOR ALL USING (
  auth.role() = 'authenticated'
  AND public.get_my_role() IN ('ADMIN_GENERALE', 'FINANCE')
);

DROP POLICY IF EXISTS "transactions_access" ON public.transactions;
CREATE POLICY "transactions_access" ON public.transactions FOR ALL USING (
  auth.role() = 'authenticated'
  AND public.get_my_role() IN ('ADMIN_GENERALE', 'FINANCE')
);

DROP POLICY IF EXISTS "history_logs_access" ON public.history_logs;
CREATE POLICY "history_logs_access" ON public.history_logs FOR ALL USING (
  auth.role() = 'authenticated'
  AND public.get_my_role() = 'ADMIN_GENERALE'
);

-- ============================================================
-- STORAGE BUCKET — Logos et images
-- ============================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('gesco-assets', 'gesco-assets', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "authenticated_upload" ON storage.objects;
CREATE POLICY "authenticated_upload" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'gesco-assets' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "public_read" ON storage.objects;
CREATE POLICY "public_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'gesco-assets');

DROP POLICY IF EXISTS "authenticated_update_delete" ON storage.objects;
CREATE POLICY "authenticated_update_delete" ON storage.objects
  FOR UPDATE USING (bucket_id = 'gesco-assets' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "authenticated_delete" ON storage.objects;
CREATE POLICY "authenticated_delete" ON storage.objects
  FOR DELETE USING (bucket_id = 'gesco-assets' AND auth.role() = 'authenticated');

-- ============================================================
-- ENABLE REALTIME FOR ALL GESCO TABLES (SAFE EXECUTION)
-- ============================================================
DO $$
BEGIN
  BEGIN alter publication supabase_realtime add table public.profiles; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN alter publication supabase_realtime add table public.school_settings; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN alter publication supabase_realtime add table public.students; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN alter publication supabase_realtime add table public.staff; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN alter publication supabase_realtime add table public.classes; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN alter publication supabase_realtime add table public.fee_records; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN alter publication supabase_realtime add table public.fee_configs; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN alter publication supabase_realtime add table public.transactions; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN alter publication supabase_realtime add table public.canteen_subscriptions; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN alter publication supabase_realtime add table public.canteen_menus; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN alter publication supabase_realtime add table public.transport_subscriptions; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN alter publication supabase_realtime add table public.bus_routes; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN alter publication supabase_realtime add table public.activities; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN alter publication supabase_realtime add table public.evaluation_sessions; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN alter publication supabase_realtime add table public.history_logs; EXCEPTION WHEN OTHERS THEN NULL; END;
END $$;
