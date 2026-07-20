-- =============================================================================
-- Migration: Instanciation des tables Supabase pour remplacer le LocalStorage
-- =============================================================================

-- 1. Table des configurations de frais de cantine
CREATE TABLE IF NOT EXISTS public.canteen_fee_configs (
  id          TEXT NOT NULL,
  school_year TEXT NOT NULL DEFAULT '2024-2025',
  data        JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (id, school_year)
);

-- 2. Table de gestion des stocks de cantine
CREATE TABLE IF NOT EXISTS public.canteen_stock_items (
  id          TEXT NOT NULL,
  school_year TEXT NOT NULL DEFAULT '2024-2025',
  data        JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (id, school_year)
);

-- 3. Table des dépenses de cantine
CREATE TABLE IF NOT EXISTS public.canteen_expenses (
  id          TEXT NOT NULL,
  school_year TEXT NOT NULL DEFAULT '2024-2025',
  data        JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (id, school_year)
);

-- 4. Table des configurations de frais de transport
CREATE TABLE IF NOT EXISTS public.transport_fee_configs (
  id          TEXT NOT NULL,
  school_year TEXT NOT NULL DEFAULT '2024-2025',
  data        JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (id, school_year)
);

-- 5. Table des dépenses de la flotte de bus
CREATE TABLE IF NOT EXISTS public.bus_expenses (
  id          TEXT NOT NULL,
  school_year TEXT NOT NULL DEFAULT '2024-2025',
  data        JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (id, school_year)
);

-- 6. Table principale des charges et dépenses d'établissement
CREATE TABLE IF NOT EXISTS public.school_expenses (
  id          TEXT NOT NULL,
  school_year TEXT NOT NULL DEFAULT '2024-2025',
  data        JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (id, school_year)
);

-- 7. Table des budgets annuels
CREATE TABLE IF NOT EXISTS public.school_budgets (
  id          TEXT NOT NULL,
  school_year TEXT NOT NULL DEFAULT '2024-2025',
  data        JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (id, school_year)
);

-- Activer Row Level Security (RLS) & Politiques d'accès publiques pour le mode SaaS / multi-rôles
ALTER TABLE public.canteen_fee_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.canteen_stock_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.canteen_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transport_fee_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bus_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_budgets ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public access canteen_fee_configs') THEN
    CREATE POLICY "Allow public access canteen_fee_configs" ON public.canteen_fee_configs FOR ALL USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public access canteen_stock_items') THEN
    CREATE POLICY "Allow public access canteen_stock_items" ON public.canteen_stock_items FOR ALL USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public access canteen_expenses') THEN
    CREATE POLICY "Allow public access canteen_expenses" ON public.canteen_expenses FOR ALL USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public access transport_fee_configs') THEN
    CREATE POLICY "Allow public access transport_fee_configs" ON public.transport_fee_configs FOR ALL USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public access bus_expenses') THEN
    CREATE POLICY "Allow public access bus_expenses" ON public.bus_expenses FOR ALL USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public access school_expenses') THEN
    CREATE POLICY "Allow public access school_expenses" ON public.school_expenses FOR ALL USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public access school_budgets') THEN
    CREATE POLICY "Allow public access school_budgets" ON public.school_budgets FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;
