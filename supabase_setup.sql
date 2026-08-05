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

-- 9. Google Calendar Integration Tables
CREATE TABLE IF NOT EXISTS public.google_calendar_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE DEFAULT auth.uid(),
    google_email TEXT,
    access_token TEXT NOT NULL,
    refresh_token TEXT,
    expires_at TIMESTAMPTZ,
    selected_calendar_id TEXT DEFAULT 'primary',
    auto_sync BOOLEAN DEFAULT TRUE,
    default_reminder_minutes INTEGER DEFAULT 1440,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.google_calendar_connections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage their own calendar connection" ON public.google_calendar_connections;
CREATE POLICY "Users manage their own calendar connection"
ON public.google_calendar_connections FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.google_calendar_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
    financial_movement_id TEXT NOT NULL,
    google_calendar_event_id TEXT NOT NULL,
    google_calendar_id TEXT NOT NULL DEFAULT 'primary',
    sync_status TEXT DEFAULT 'synced',
    last_synced_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, financial_movement_id)
);

ALTER TABLE public.google_calendar_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage their own calendar events mapping" ON public.google_calendar_events;
CREATE POLICY "Users manage their own calendar events mapping"
ON public.google_calendar_events FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_calendar_events_user ON public.google_calendar_events(user_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_movement ON public.google_calendar_events(financial_movement_id);

-- 10. Empresa (Clients & Receipts) Module
-- User Profile Extensions for Empresa
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS empresa_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS company_name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS company_document TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS company_email TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS company_phone TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS company_address TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS company_city TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS company_state TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS company_zip TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS company_signature_url TEXT;

-- Clients Table
CREATE TABLE IF NOT EXISTS public.clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
    name TEXT NOT NULL,
    document TEXT,
    email TEXT,
    phone TEXT,
    address TEXT,
    number TEXT,
    complement TEXT,
    neighborhood TEXT,
    city TEXT,
    state TEXT,
    zip_code TEXT,
    notes TEXT,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure all columns exist on public.clients if table already existed previously
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid();
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS document TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS number TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS complement TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS neighborhood TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS state TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS zip_code TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- RLS for Clients
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage their own clients" ON public.clients;
CREATE POLICY "Users manage their own clients"
ON public.clients FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_clients_user_id ON public.clients(user_id);
CREATE INDEX IF NOT EXISTS idx_clients_name ON public.clients(user_id, name);

-- Receipts Table
CREATE TABLE IF NOT EXISTS public.receipts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    receipt_code TEXT,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
    client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
    client_name TEXT NOT NULL,
    client_document TEXT,
    client_email TEXT,
    client_phone TEXT,
    description TEXT NOT NULL,
    amount NUMERIC(15, 2) NOT NULL,
    issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
    service_start_date DATE,
    service_end_date DATE,
    payment_method TEXT DEFAULT 'PIX',
    status TEXT DEFAULT 'issued',
    notes TEXT,
    financial_movement_id UUID REFERENCES public.financial_movements(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure all columns exist on public.receipts if table already existed previously
ALTER TABLE public.receipts ADD COLUMN IF NOT EXISTS receipt_code TEXT;
ALTER TABLE public.receipts ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid();
ALTER TABLE public.receipts ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL;
ALTER TABLE public.receipts ADD COLUMN IF NOT EXISTS client_name TEXT;
ALTER TABLE public.receipts ADD COLUMN IF NOT EXISTS client_document TEXT;
ALTER TABLE public.receipts ADD COLUMN IF NOT EXISTS client_email TEXT;
ALTER TABLE public.receipts ADD COLUMN IF NOT EXISTS client_phone TEXT;
ALTER TABLE public.receipts ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.receipts ADD COLUMN IF NOT EXISTS amount NUMERIC(12, 2);
ALTER TABLE public.receipts ADD COLUMN IF NOT EXISTS issue_date DATE DEFAULT CURRENT_DATE;
ALTER TABLE public.receipts ADD COLUMN IF NOT EXISTS service_start_date DATE;
ALTER TABLE public.receipts ADD COLUMN IF NOT EXISTS service_end_date DATE;
ALTER TABLE public.receipts ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'PIX';
ALTER TABLE public.receipts ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'issued';
ALTER TABLE public.receipts ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE public.receipts ADD COLUMN IF NOT EXISTS financial_movement_id UUID;
ALTER TABLE public.receipts ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.receipts ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- RLS for Receipts
ALTER TABLE public.receipts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage their own receipts" ON public.receipts;
CREATE POLICY "Users manage their own receipts"
ON public.receipts FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_receipts_user_id ON public.receipts(user_id);
CREATE INDEX IF NOT EXISTS idx_receipts_client_id ON public.receipts(user_id, client_id);
CREATE INDEX IF NOT EXISTS idx_receipts_issue_date ON public.receipts(user_id, issue_date);

-- 11. Recurring Charges & Occurrences Engine
CREATE TABLE IF NOT EXISTS public.charges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
    client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
    client_name TEXT NOT NULL,
    description TEXT NOT NULL,
    amount NUMERIC(15, 2) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    billing_day INTEGER NOT NULL CHECK (billing_day >= 1 AND billing_day <= 31),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.charges ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage their own charges" ON public.charges;
CREATE POLICY "Users manage their own charges"
ON public.charges FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_charges_user_id ON public.charges(user_id);
CREATE INDEX IF NOT EXISTS idx_charges_client ON public.charges(user_id, client_id);

CREATE TABLE IF NOT EXISTS public.charge_occurrences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    charge_id UUID NOT NULL REFERENCES public.charges(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
    reference_month TEXT NOT NULL, -- Format: YYYY-MM
    due_date DATE NOT NULL,
    amount NUMERIC(15, 2) NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending' | 'paid'
    paid_at TIMESTAMPTZ,
    payment_date DATE,
    financial_movement_id UUID REFERENCES public.financial_movements(id) ON DELETE SET NULL,
    receipt_id UUID,
    receipt_sent BOOLEAN DEFAULT FALSE,
    receipt_sent_at TIMESTAMPTZ,
    receipt_sent_by TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (charge_id, reference_month)
);

-- Ensure extended columns exist on charge_occurrences
ALTER TABLE public.charge_occurrences ADD COLUMN IF NOT EXISTS payment_date DATE;
ALTER TABLE public.charge_occurrences ADD COLUMN IF NOT EXISTS receipt_id UUID;
ALTER TABLE public.charge_occurrences ADD COLUMN IF NOT EXISTS receipt_sent BOOLEAN DEFAULT FALSE;
ALTER TABLE public.charge_occurrences ADD COLUMN IF NOT EXISTS receipt_sent_at TIMESTAMPTZ;
ALTER TABLE public.charge_occurrences ADD COLUMN IF NOT EXISTS receipt_sent_by TEXT;

-- Ensure extended columns exist on receipts
ALTER TABLE public.receipts ADD COLUMN IF NOT EXISTS charge_id UUID REFERENCES public.charges(id) ON DELETE SET NULL;
ALTER TABLE public.receipts ADD COLUMN IF NOT EXISTS charge_occurrence_id UUID;
ALTER TABLE public.receipts ADD COLUMN IF NOT EXISTS reference_month TEXT;
ALTER TABLE public.receipts ADD COLUMN IF NOT EXISTS receipt_sent BOOLEAN DEFAULT FALSE;
ALTER TABLE public.receipts ADD COLUMN IF NOT EXISTS receipt_sent_at TIMESTAMPTZ;
ALTER TABLE public.receipts ADD COLUMN IF NOT EXISTS receipt_sent_by TEXT;

ALTER TABLE public.charge_occurrences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage their own charge occurrences" ON public.charge_occurrences;
CREATE POLICY "Users manage their own charge occurrences"
ON public.charge_occurrences FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_charge_occurrences_user ON public.charge_occurrences(user_id);
CREATE INDEX IF NOT EXISTS idx_charge_occurrences_charge ON public.charge_occurrences(charge_id);
CREATE INDEX IF NOT EXISTS idx_charge_occurrences_month ON public.charge_occurrences(user_id, reference_month);
CREATE INDEX IF NOT EXISTS idx_charge_occurrences_due ON public.charge_occurrences(user_id, due_date);



