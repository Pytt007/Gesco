-- ============================================================
-- GESCO — Migration pour clés primaires composites (id, school_year)
-- À exécuter dans l'éditeur SQL de votre projet Supabase
-- ============================================================

-- Table public.students
ALTER TABLE public.students DROP CONSTRAINT IF EXISTS students_pkey;
ALTER TABLE public.students ADD PRIMARY KEY (id, school_year);

-- Table public.staff
ALTER TABLE public.staff DROP CONSTRAINT IF EXISTS staff_pkey;
ALTER TABLE public.staff ADD PRIMARY KEY (id, school_year);

-- Table public.classes
ALTER TABLE public.classes DROP CONSTRAINT IF EXISTS classes_pkey;
ALTER TABLE public.classes ADD PRIMARY KEY (id, school_year);

-- Table public.fee_records
ALTER TABLE public.fee_records DROP CONSTRAINT IF EXISTS fee_records_pkey;
ALTER TABLE public.fee_records ADD PRIMARY KEY (id, school_year);

-- Table public.fee_configs
ALTER TABLE public.fee_configs DROP CONSTRAINT IF EXISTS fee_configs_pkey;
ALTER TABLE public.fee_configs ADD PRIMARY KEY (id, school_year);

-- Table public.transactions
ALTER TABLE public.transactions DROP CONSTRAINT IF EXISTS transactions_pkey;
ALTER TABLE public.transactions ADD PRIMARY KEY (id, school_year);

-- Table public.canteen_subscriptions
ALTER TABLE public.canteen_subscriptions DROP CONSTRAINT IF EXISTS canteen_subscriptions_pkey;
ALTER TABLE public.canteen_subscriptions ADD PRIMARY KEY (id, school_year);

-- Table public.canteen_menus
ALTER TABLE public.canteen_menus DROP CONSTRAINT IF EXISTS canteen_menus_pkey;
ALTER TABLE public.canteen_menus ADD PRIMARY KEY (id, school_year);

-- Table public.transport_subscriptions
ALTER TABLE public.transport_subscriptions DROP CONSTRAINT IF EXISTS transport_subscriptions_pkey;
ALTER TABLE public.transport_subscriptions ADD PRIMARY KEY (id, school_year);

-- Table public.bus_routes
ALTER TABLE public.bus_routes DROP CONSTRAINT IF EXISTS bus_routes_pkey;
ALTER TABLE public.bus_routes ADD PRIMARY KEY (id, school_year);

-- Table public.activities
ALTER TABLE public.activities DROP CONSTRAINT IF EXISTS activities_pkey;
ALTER TABLE public.activities ADD PRIMARY KEY (id, school_year);

-- Table public.evaluation_sessions
ALTER TABLE public.evaluation_sessions DROP CONSTRAINT IF EXISTS evaluation_sessions_pkey;
ALTER TABLE public.evaluation_sessions ADD PRIMARY KEY (id, school_year);

-- Table public.history_logs
ALTER TABLE public.history_logs DROP CONSTRAINT IF EXISTS history_logs_pkey;
ALTER TABLE public.history_logs ADD PRIMARY KEY (id, school_year);
