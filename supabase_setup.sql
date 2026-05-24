-- SQL Script for Supabase setup
-- DEFINITIVE IDENTITY & FINANCIAL MOVEMENTS ARCHITECTURE

-- 1. Identity Layer: Profiles & RBAC
-- We use a dedicated profiles table in the public schema.
-- This table references auth.users(id).

DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('admin', 'editor', 'viewer');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    full_name TEXT,
    avatar_url TEXT,
    role user_role DEFAULT 'viewer',
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RBAC Foundation: Permissions
CREATE TABLE IF NOT EXISTS public.role_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role user_role NOT NULL,
    permission TEXT NOT NULL,
    UNIQUE(role, permission)
);

-- Seed Permissions
INSERT INTO public.role_permissions (role, permission) VALUES
    ('admin', 'movements:read'), ('admin', 'movements:create'), ('admin', 'movements:update'), ('admin', 'movements:delete'), ('admin', 'admin:dashboard'), ('admin', 'profile:read'), ('admin', 'profile:update'),
    ('editor', 'movements:read'), ('editor', 'movements:create'), ('editor', 'movements:update'), ('editor', 'profile:read'), ('editor', 'profile:update'),
    ('viewer', 'movements:read'), ('viewer', 'profile:read')
ON CONFLICT (role, permission) DO NOTHING;

-- Permission Helper Function
CREATE OR REPLACE FUNCTION public.has_permission(requested_permission TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.role_permissions rp
        JOIN public.profiles p ON p.role = rp.role
        WHERE p.id = auth.uid() AND rp.permission = requested_permission
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles" ON public.profiles
    FOR SELECT USING (public.has_permission('admin:dashboard'));

-- 2. Enums for financial system
DO $$ BEGIN
    CREATE TYPE movement_type AS ENUM ('entrada', 'saida_fixa', 'gasto_diario', 'economia', 'cartao', 'cobranca');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE recurrence_type AS ENUM (
        'diaria', 'semanal', 'quinzenal', 'mensal', 'bimestral', 
        'trimestral', 'semestral', 'anual', 'personalizada'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 3. Financial Movements Table
-- IMPORTANT: We reference auth.users(id) directly for the strongest security tie.
-- If a table named "public.users" exists, it should be DEPRECATED in favor of "profiles".
CREATE TABLE IF NOT EXISTS public.financial_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    type movement_type NOT NULL,
    amount NUMERIC(15, 2) NOT NULL,
    description TEXT,
    tag TEXT,
    is_recurring BOOLEAN DEFAULT FALSE,
    recurrence_type recurrence_type,
    recurrence_interval INTEGER,
    recurrence_end_date DATE,
    parent_id UUID REFERENCES public.financial_movements(id) ON DELETE CASCADE,
    card_name TEXT,
    installments INTEGER DEFAULT 1,
    debtor_name TEXT,
    due_date DATE,
    is_paid BOOLEAN DEFAULT FALSE,
    paid_at TIMESTAMPTZ,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid()
);

-- Ensure all columns exist (for existing tables)
DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'financial_movements' AND column_name = 'recurrence_type'
    ) THEN
        ALTER TABLE financial_movements ADD COLUMN recurrence_type recurrence_type;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'financial_movements' AND column_name = 'recurrence_interval'
    ) THEN
        ALTER TABLE financial_movements ADD COLUMN recurrence_interval INTEGER;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'financial_movements' AND column_name = 'recurrence_end_date'
    ) THEN
        ALTER TABLE financial_movements ADD COLUMN recurrence_end_date DATE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'financial_movements' AND column_name = 'parent_id'
    ) THEN
        ALTER TABLE financial_movements ADD COLUMN parent_id UUID REFERENCES public.financial_movements(id) ON DELETE CASCADE;
    END IF;

    -- Cobrança Columns
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'financial_movements' AND column_name = 'debtor_name'
    ) THEN
        ALTER TABLE financial_movements ADD COLUMN debtor_name TEXT;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'financial_movements' AND column_name = 'due_date'
    ) THEN
        ALTER TABLE financial_movements ADD COLUMN due_date DATE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'financial_movements' AND column_name = 'is_paid'
    ) THEN
        ALTER TABLE financial_movements ADD COLUMN is_paid BOOLEAN DEFAULT FALSE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'financial_movements' AND column_name = 'paid_at'
    ) THEN
        ALTER TABLE financial_movements ADD COLUMN paid_at TIMESTAMPTZ;
    END IF;

    -- Ensure DEFAULT auth.uid() for financial_movements.user_id
    ALTER TABLE public.financial_movements ALTER COLUMN user_id SET DEFAULT auth.uid();
END $$;

-- Forensic Fix: If there is an old constraint mismatching to a "public.users" table, 
-- we ensure the constraint is correctly pointing to auth.users.
DO $$ 
BEGIN 
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'financial_movements_user_id_fkey' 
        AND table_name = 'financial_movements'
    ) THEN
        ALTER TABLE financial_movements DROP CONSTRAINT financial_movements_user_id_fkey;
    END IF;
    
    ALTER TABLE financial_movements 
    ADD CONSTRAINT financial_movements_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
END $$;

-- 4. Enable RLS
ALTER TABLE financial_movements ENABLE ROW LEVEL SECURITY;

-- 5. Create RLS Policies
DROP POLICY IF EXISTS "Users can view their own financial data" ON financial_movements;
CREATE POLICY "Users can view their own financial data" 
ON financial_movements FOR SELECT 
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own financial data" ON financial_movements;
CREATE POLICY "Users can insert their own financial data" 
ON financial_movements FOR INSERT 
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own financial data" ON financial_movements;
CREATE POLICY "Users can update their own financial data" 
ON financial_movements FOR UPDATE 
USING (auth.uid() = user_id) 
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own financial data" ON financial_movements;
CREATE POLICY "Users can delete their own financial data" 
ON financial_movements FOR DELETE 
USING (auth.uid() = user_id);

-- 6. Indexes
CREATE INDEX IF NOT EXISTS idx_movements_user_id ON financial_movements(user_id);
CREATE INDEX IF NOT EXISTS idx_movements_date ON financial_movements(date);
CREATE INDEX IF NOT EXISTS idx_movements_type ON financial_movements(type);

-- 7. Automated Profile Trigger
-- This ensures every auth user has a profile automatically.

-- MIGRATION: Backfill existing users who don't have a profile yet
-- This ensures existing users become 'admin' (Owners) in the new system.
INSERT INTO public.profiles (id, email, role)
SELECT id, email, 'admin' 
FROM auth.users
WHERE id NOT IN (SELECT id FROM public.profiles)
ON CONFLICT (id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    default_role public.user_role := 'viewer';
    meta_role text;
BEGIN
    -- Safely extract and check role from meta_data to avoid cast errors
    BEGIN
        IF new.raw_user_meta_data IS NOT NULL THEN
            meta_role := new.raw_user_meta_data->>'role';
            IF meta_role IS NOT NULL AND meta_role IN ('admin', 'editor', 'viewer') THEN
                default_role := meta_role::public.user_role;
            END IF;
        END IF;
    EXCEPTION WHEN OTHERS THEN
        default_role := 'viewer'::public.user_role;
    END;

    -- Safely insert user profile, ensuring no error can crash user registration
    BEGIN
        INSERT INTO public.profiles (id, email, full_name, avatar_url, role)
        VALUES (
            new.id, 
            new.email, 
            COALESCE(new.raw_user_meta_data->>'full_name', ''), 
            COALESCE(new.raw_user_meta_data->>'avatar_url', ''),
            default_role
        )
        ON CONFLICT (id) DO UPDATE 
        SET email = EXCLUDED.email,
            full_name = EXCLUDED.full_name,
            avatar_url = EXCLUDED.avatar_url;
    EXCEPTION WHEN OTHERS THEN
        -- Fallback to bare-minimum safe insert if something else goes wrong
        BEGIN
            INSERT INTO public.profiles (id, email, role)
            VALUES (new.id, new.email, 'viewer'::public.user_role)
            ON CONFLICT (id) DO NOTHING;
        EXCEPTION WHEN OTHERS THEN
            NULL; -- Complete silence to protect user registration at all costs
        END;
    END;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 8. Structural Expenses Table (Custo Fixo)
CREATE TABLE IF NOT EXISTS public.structural_expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    title TEXT NOT NULL,
    amount NUMERIC(15, 2) NOT NULL,
    category TEXT NOT NULL,
    recurrence TEXT NOT NULL DEFAULT 'mensal',
    priority TEXT NOT NULL DEFAULT 'media',
    description TEXT,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid()
);

-- Ensure DEFAULT auth.uid() for structural_expenses.user_id if table was already created
ALTER TABLE public.structural_expenses ALTER COLUMN user_id SET DEFAULT auth.uid();

-- Enable Row Level Security (RLS)
ALTER TABLE public.structural_expenses ENABLE ROW LEVEL SECURITY;

-- Create RLS Policies
DROP POLICY IF EXISTS "Users can view their own structural expenses" ON public.structural_expenses;
CREATE POLICY "Users can view their own structural expenses" 
ON public.structural_expenses FOR SELECT 
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own structural expenses" ON public.structural_expenses;
CREATE POLICY "Users can insert their own structural expenses" 
ON public.structural_expenses FOR INSERT 
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own structural expenses" ON public.structural_expenses;
CREATE POLICY "Users can update their own structural expenses" 
ON public.structural_expenses FOR UPDATE 
USING (auth.uid() = user_id) 
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own structural expenses" ON public.structural_expenses;
CREATE POLICY "Users can delete their own structural expenses" 
ON public.structural_expenses FOR DELETE 
USING (auth.uid() = user_id);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_structural_expenses_user_id ON public.structural_expenses(user_id);
