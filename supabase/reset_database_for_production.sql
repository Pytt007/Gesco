-- ============================================================
-- GESCO — Script de Remise à Zéro Totale (Production Reset)
-- Sécurisé : N'échoue pas si certaines tables facultatives n'existent pas.
-- À exécuter dans l'éditeur SQL de votre projet Supabase.
-- ============================================================

DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename IN (
            'students', 'staff', 'classes', 'fee_records', 'transactions', 
            'canteen_subscriptions', 'canteen_menus', 'canteen_stock_items', 
            'canteen_expenses', 'transport_subscriptions', 'bus_routes', 
            'bus_expenses', 'activities', 'evaluation_sessions', 'history_logs', 
            'school_expenses', 'school_budgets'
        )
    ) LOOP
        EXECUTE 'TRUNCATE TABLE public.' || quote_ident(r.tablename) || ' CASCADE;';
    END LOOP;
END $$;

-- Message de confirmation
SELECT 'Base de données remise à zéro avec succès pour le passage en production !' AS status;
