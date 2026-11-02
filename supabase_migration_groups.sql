-- ==============================================================================
-- FINANCEIRA PRO: MIGRATION - MANAGEMENT GROUPS ARCHITECTURE (MULTI-TENANT)
-- ==============================================================================
-- This migration upgrades Financeira Pro to support multiple completely isolated
-- management groups (e.g. Pessoal, Chácara, Avós, Empresa) per user.
-- It preserves all existing data by auto-provisioning a default "Pessoal" group
-- for each existing user and linking all their historical records.
-- ==============================================================================

-- 1. Create Management Groups Table
CREATE TABLE IF NOT EXISTS public.management_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    color TEXT NOT NULL DEFAULT '#6366f1',
    owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived', 'inactive')),
    settings JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure all columns exist if table already exists
ALTER TABLE public.management_groups ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.management_groups ADD COLUMN IF NOT EXISTS color TEXT DEFAULT '#6366f1';
ALTER TABLE public.management_groups ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
ALTER TABLE public.management_groups ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.management_groups ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.management_groups ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 2. Create Group Members Table (Multi-user & RBAC per group)
CREATE TABLE IF NOT EXISTS public.group_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES public.management_groups(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role public.user_role NOT NULL DEFAULT 'editor',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(group_id, user_id)
);

-- 3. Group Access Security Function
CREATE OR REPLACE FUNCTION public.user_has_group_access(target_group_id UUID, minimum_role TEXT DEFAULT 'viewer')
RETURNS BOOLEAN AS $$
DECLARE
    current_uid UUID := auth.uid();
BEGIN
    IF current_uid IS NULL THEN
        RETURN FALSE;
    END IF;

    -- Owner has unrestricted access
    IF EXISTS (
        SELECT 1 FROM public.management_groups 
        WHERE id = target_group_id AND owner_id = current_uid
    ) THEN
        RETURN TRUE;
    END IF;

    -- Member with role hierarchy check
    IF minimum_role = 'viewer' THEN
        RETURN EXISTS (
            SELECT 1 FROM public.group_members 
            WHERE group_id = target_group_id AND user_id = current_uid
        );
    ELSIF minimum_role = 'editor' THEN
        RETURN EXISTS (
            SELECT 1 FROM public.group_members 
            WHERE group_id = target_group_id AND user_id = current_uid AND role IN ('admin', 'editor')
        );
    ELSIF minimum_role = 'admin' THEN
        RETURN EXISTS (
            SELECT 1 FROM public.group_members 
            WHERE group_id = target_group_id AND user_id = current_uid AND role = 'admin'
        );
    END IF;

    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Add group_id Column to All Financial & Related Entities
DO $$ 
BEGIN 
    -- 4.1 Financial Movements
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'financial_movements' AND column_name = 'group_id'
    ) THEN
        ALTER TABLE public.financial_movements ADD COLUMN group_id UUID REFERENCES public.management_groups(id) ON DELETE CASCADE;
    END IF;

    -- 4.2 Structural Expenses (Custos Fixos)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'structural_expenses' AND column_name = 'group_id'
    ) THEN
        ALTER TABLE public.structural_expenses ADD COLUMN group_id UUID REFERENCES public.management_groups(id) ON DELETE CASCADE;
    END IF;

    -- 4.3 Debt Persons (Pessoas na aba Cobrança)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'debt_persons' AND column_name = 'group_id'
    ) THEN
        ALTER TABLE public.debt_persons ADD COLUMN group_id UUID REFERENCES public.management_groups(id) ON DELETE CASCADE;
    END IF;

    -- 4.4 Debts (Dívidas registradas)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'debts' AND column_name = 'group_id'
    ) THEN
        ALTER TABLE public.debts ADD COLUMN group_id UUID REFERENCES public.management_groups(id) ON DELETE CASCADE;
    END IF;

    -- 4.5 Debt Payments (Pagamentos parciais de dívidas)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'debt_payments' AND column_name = 'group_id'
    ) THEN
        ALTER TABLE public.debt_payments ADD COLUMN group_id UUID REFERENCES public.management_groups(id) ON DELETE CASCADE;
    END IF;

    -- 4.6 Clients (Empresa / Clientes)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'clients' AND column_name = 'group_id'
    ) THEN
        ALTER TABLE public.clients ADD COLUMN group_id UUID REFERENCES public.management_groups(id) ON DELETE CASCADE;
    END IF;

    -- 4.7 Charges (Cobranças recorrentes B2B)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'charges' AND column_name = 'group_id'
    ) THEN
        ALTER TABLE public.charges ADD COLUMN group_id UUID REFERENCES public.management_groups(id) ON DELETE CASCADE;
    END IF;

    -- 4.8 Charge Occurrences (Mensalidades das cobranças)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'charge_occurrences' AND column_name = 'group_id'
    ) THEN
        ALTER TABLE public.charge_occurrences ADD COLUMN group_id UUID REFERENCES public.management_groups(id) ON DELETE CASCADE;
    END IF;

    -- 4.9 Receipts (Recibos emitidos)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'receipts' AND column_name = 'group_id'
    ) THEN
        ALTER TABLE public.receipts ADD COLUMN group_id UUID REFERENCES public.management_groups(id) ON DELETE CASCADE;
    END IF;

    -- 4.10 Google Calendar Events
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'google_calendar_events' AND column_name = 'group_id'
    ) THEN
        ALTER TABLE public.google_calendar_events ADD COLUMN group_id UUID REFERENCES public.management_groups(id) ON DELETE CASCADE;
    END IF;
END $$;

-- 5. Create Performance Indexes for Groups
CREATE INDEX IF NOT EXISTS idx_mgmt_groups_owner ON public.management_groups(owner_id);
CREATE INDEX IF NOT EXISTS idx_mgmt_groups_status ON public.management_groups(status);
CREATE INDEX IF NOT EXISTS idx_group_members_user ON public.group_members(user_id);
CREATE INDEX IF NOT EXISTS idx_group_members_group ON public.group_members(group_id);

CREATE INDEX IF NOT EXISTS idx_movements_group_id ON public.financial_movements(group_id);
CREATE INDEX IF NOT EXISTS idx_movements_group_date ON public.financial_movements(group_id, date);
CREATE INDEX IF NOT EXISTS idx_structural_group_id ON public.structural_expenses(group_id);
CREATE INDEX IF NOT EXISTS idx_debt_persons_group_id ON public.debt_persons(group_id);
CREATE INDEX IF NOT EXISTS idx_debts_group_id ON public.debts(group_id);
CREATE INDEX IF NOT EXISTS idx_debt_payments_group_id ON public.debt_payments(group_id);
CREATE INDEX IF NOT EXISTS idx_clients_group_id ON public.clients(group_id);
CREATE INDEX IF NOT EXISTS idx_charges_group_id ON public.charges(group_id);
CREATE INDEX IF NOT EXISTS idx_charge_occurrences_group_id ON public.charge_occurrences(group_id);
CREATE INDEX IF NOT EXISTS idx_receipts_group_id ON public.receipts(group_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_group_id ON public.google_calendar_events(group_id);

-- 6. AUTOMATED DATA BACKFILL & MIGRATION (PRESERVES EXISTING DATA)
-- This block creates an initial "Pessoal" group for every distinct user who has records,
-- and safely backfills all their existing rows where group_id IS NULL.
DO $$
DECLARE
    user_rec RECORD;
    initial_group_id UUID;
BEGIN
    FOR user_rec IN 
        SELECT DISTINCT id FROM auth.users
        UNION
        SELECT DISTINCT user_id FROM public.financial_movements WHERE user_id IS NOT NULL
        UNION
        SELECT DISTINCT id FROM public.profiles WHERE id IS NOT NULL
    LOOP
        -- Check if user already owns at least one group
        SELECT id INTO initial_group_id 
        FROM public.management_groups 
        WHERE owner_id = user_rec.id 
        ORDER BY created_at ASC 
        LIMIT 1;

        -- If not, create the default initial group
        IF initial_group_id IS NULL THEN
            INSERT INTO public.management_groups (
                name, 
                description, 
                color, 
                owner_id, 
                status, 
                settings
            ) VALUES (
                'Pessoal', 
                'Ambiente financeiro pessoal e contas gerais', 
                '#6366f1', 
                user_rec.id, 
                'active', 
                '{"currency": "BRL"}'::jsonb
            ) RETURNING id INTO initial_group_id;

            -- Also insert user into group_members as admin/owner
            INSERT INTO public.group_members (group_id, user_id, role)
            VALUES (initial_group_id, user_rec.id, 'admin')
            ON CONFLICT (group_id, user_id) DO NOTHING;
        END IF;

        -- Associate all historical orphan rows for this user to their initial group
        UPDATE public.financial_movements 
        SET group_id = initial_group_id 
        WHERE user_id = user_rec.id AND group_id IS NULL;

        UPDATE public.structural_expenses 
        SET group_id = initial_group_id 
        WHERE user_id = user_rec.id AND group_id IS NULL;

        UPDATE public.debt_persons 
        SET group_id = initial_group_id 
        WHERE user_id = user_rec.id AND group_id IS NULL;

        UPDATE public.debts 
        SET group_id = initial_group_id 
        WHERE user_id = user_rec.id AND group_id IS NULL;

        UPDATE public.debt_payments 
        SET group_id = initial_group_id 
        WHERE user_id = user_rec.id AND group_id IS NULL;

        UPDATE public.clients 
        SET group_id = initial_group_id 
        WHERE user_id = user_rec.id AND group_id IS NULL;

        UPDATE public.charges 
        SET group_id = initial_group_id 
        WHERE user_id = user_rec.id AND group_id IS NULL;

        UPDATE public.charge_occurrences 
        SET group_id = initial_group_id 
        WHERE user_id = user_rec.id AND group_id IS NULL;

        UPDATE public.receipts 
        SET group_id = initial_group_id 
        WHERE user_id = user_rec.id AND group_id IS NULL;

        UPDATE public.google_calendar_events 
        SET group_id = initial_group_id 
        WHERE user_id = user_rec.id AND group_id IS NULL;
    END LOOP;
END $$;

-- 7. Cross-Entity Group Integrity Constraints & Triggers
-- Ensures that when linking a person to a cobrança, the person MUST belong to the SAME group.
CREATE OR REPLACE FUNCTION public.validate_movement_group_and_person()
RETURNS TRIGGER AS $$
BEGIN
    -- Validate group access for editor
    IF NEW.group_id IS NOT NULL THEN
        IF NOT public.user_has_group_access(NEW.group_id, 'editor') AND NEW.user_id <> auth.uid() THEN
            RAISE EXCEPTION 'Acesso negado: você não tem permissão para adicionar ou modificar dados neste grupo financeiro.';
        END IF;
    END IF;

    -- Validate person belongs to the exact same group
    IF NEW.debt_person_id IS NOT NULL THEN
        IF NOT EXISTS (
            SELECT 1 FROM public.debt_persons 
            WHERE id = NEW.debt_person_id 
            AND (group_id = NEW.group_id OR (group_id IS NULL AND user_id = NEW.user_id))
        ) THEN
            RAISE EXCEPTION 'A pessoa selecionada pertence a outro grupo de gerenciamento. Violação de isolamento entre ambientes.';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_validate_movement_group_and_person ON public.financial_movements;
CREATE TRIGGER trg_validate_movement_group_and_person
BEFORE INSERT OR UPDATE OF group_id, debt_person_id ON public.financial_movements
FOR EACH ROW EXECUTE FUNCTION public.validate_movement_group_and_person();

-- 8. Row Level Security (RLS) on Management Groups
ALTER TABLE public.management_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view groups they belong to" ON public.management_groups;
CREATE POLICY "Users can view groups they belong to" 
ON public.management_groups FOR SELECT 
USING (
    owner_id = auth.uid() 
    OR id IN (SELECT group_id FROM public.group_members WHERE user_id = auth.uid())
);

DROP POLICY IF EXISTS "Users can insert their own groups" ON public.management_groups;
CREATE POLICY "Users can insert their own groups" 
ON public.management_groups FOR INSERT 
WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS "Owners and admins can update their groups" ON public.management_groups;
CREATE POLICY "Owners and admins can update their groups" 
ON public.management_groups FOR UPDATE 
USING (
    owner_id = auth.uid() 
    OR id IN (SELECT group_id FROM public.group_members WHERE user_id = auth.uid() AND role = 'admin')
)
WITH CHECK (
    owner_id = auth.uid() 
    OR id IN (SELECT group_id FROM public.group_members WHERE user_id = auth.uid() AND role = 'admin')
);

DROP POLICY IF EXISTS "Only owners can delete their groups" ON public.management_groups;
CREATE POLICY "Only owners can delete their groups" 
ON public.management_groups FOR DELETE 
USING (owner_id = auth.uid());

-- Group Members RLS
DROP POLICY IF EXISTS "Users can view group members" ON public.group_members;
CREATE POLICY "Users can view group members" 
ON public.group_members FOR SELECT 
USING (
    user_id = auth.uid() 
    OR group_id IN (SELECT id FROM public.management_groups WHERE owner_id = auth.uid())
);

DROP POLICY IF EXISTS "Owners and admins can manage group members" ON public.group_members;
CREATE POLICY "Owners and admins can manage group members" 
ON public.group_members FOR ALL 
USING (
    group_id IN (
        SELECT id FROM public.management_groups WHERE owner_id = auth.uid()
        UNION
        SELECT group_id FROM public.group_members WHERE user_id = auth.uid() AND role = 'admin'
    )
);

-- 9. Update RLS on Financial Tables to Enforce Group Isolation
-- 9.1 Financial Movements
DROP POLICY IF EXISTS "Users can view their own financial data" ON public.financial_movements;
CREATE POLICY "Users can view their own financial data" 
ON public.financial_movements FOR SELECT 
USING (
    (auth.uid() = user_id) 
    OR (group_id IS NOT NULL AND public.user_has_group_access(group_id, 'viewer'))
);

DROP POLICY IF EXISTS "Users can insert their own financial data" ON public.financial_movements;
CREATE POLICY "Users can insert their own financial data" 
ON public.financial_movements FOR INSERT 
WITH CHECK (
    (auth.uid() = user_id) 
    AND (group_id IS NULL OR public.user_has_group_access(group_id, 'editor'))
);

DROP POLICY IF EXISTS "Users can update their own financial data" ON public.financial_movements;
CREATE POLICY "Users can update their own financial data" 
ON public.financial_movements FOR UPDATE 
USING (
    (auth.uid() = user_id) 
    OR (group_id IS NOT NULL AND public.user_has_group_access(group_id, 'editor'))
)
WITH CHECK (
    (auth.uid() = user_id) 
    OR (group_id IS NOT NULL AND public.user_has_group_access(group_id, 'editor'))
);

DROP POLICY IF EXISTS "Users can delete their own financial data" ON public.financial_movements;
CREATE POLICY "Users can delete their own financial data" 
ON public.financial_movements FOR DELETE 
USING (
    (auth.uid() = user_id) 
    OR (group_id IS NOT NULL AND public.user_has_group_access(group_id, 'editor'))
);

-- 9.2 Structural Expenses
DROP POLICY IF EXISTS "Users can view their own structural expenses" ON public.structural_expenses;
CREATE POLICY "Users can view their own structural expenses" 
ON public.structural_expenses FOR SELECT 
USING (
    (auth.uid() = user_id) 
    OR (group_id IS NOT NULL AND public.user_has_group_access(group_id, 'viewer'))
);

DROP POLICY IF EXISTS "Users can insert their own structural expenses" ON public.structural_expenses;
CREATE POLICY "Users can insert their own structural expenses" 
ON public.structural_expenses FOR INSERT 
WITH CHECK (
    (auth.uid() = user_id) 
    AND (group_id IS NULL OR public.user_has_group_access(group_id, 'editor'))
);

DROP POLICY IF EXISTS "Users can update their own structural expenses" ON public.structural_expenses;
CREATE POLICY "Users can update their own structural expenses" 
ON public.structural_expenses FOR UPDATE 
USING (
    (auth.uid() = user_id) 
    OR (group_id IS NOT NULL AND public.user_has_group_access(group_id, 'editor'))
);

DROP POLICY IF EXISTS "Users can delete their own structural expenses" ON public.structural_expenses;
CREATE POLICY "Users can delete their own structural expenses" 
ON public.structural_expenses FOR DELETE 
USING (
    (auth.uid() = user_id) 
    OR (group_id IS NOT NULL AND public.user_has_group_access(group_id, 'editor'))
);

-- 9.3 Debt Persons & Debts
DROP POLICY IF EXISTS "Users manage their own debt persons" ON public.debt_persons;
CREATE POLICY "Users manage their own debt persons" 
ON public.debt_persons FOR ALL 
USING (
    (auth.uid() = user_id) 
    OR (group_id IS NOT NULL AND public.user_has_group_access(group_id, 'editor'))
)
WITH CHECK (
    (auth.uid() = user_id) 
    AND (group_id IS NULL OR public.user_has_group_access(group_id, 'editor'))
);

DROP POLICY IF EXISTS "Users manage their own debts" ON public.debts;
CREATE POLICY "Users manage their own debts" 
ON public.debts FOR ALL 
USING (
    (auth.uid() = user_id) 
    OR (group_id IS NOT NULL AND public.user_has_group_access(group_id, 'editor'))
)
WITH CHECK (
    (auth.uid() = user_id) 
    AND (group_id IS NULL OR public.user_has_group_access(group_id, 'editor'))
);

DROP POLICY IF EXISTS "Users manage their own debt payments" ON public.debt_payments;
CREATE POLICY "Users manage their own debt payments" 
ON public.debt_payments FOR ALL 
USING (
    (auth.uid() = user_id) 
    OR (group_id IS NOT NULL AND public.user_has_group_access(group_id, 'editor'))
)
WITH CHECK (
    (auth.uid() = user_id) 
    AND (group_id IS NULL OR public.user_has_group_access(group_id, 'editor'))
);

-- 9.4 Clients, Charges & Receipts
DROP POLICY IF EXISTS "Users manage their own clients" ON public.clients;
CREATE POLICY "Users manage their own clients" 
ON public.clients FOR ALL 
USING (
    (auth.uid() = user_id) 
    OR (group_id IS NOT NULL AND public.user_has_group_access(group_id, 'editor'))
)
WITH CHECK (
    (auth.uid() = user_id) 
    AND (group_id IS NULL OR public.user_has_group_access(group_id, 'editor'))
);

DROP POLICY IF EXISTS "Users manage their own charges" ON public.charges;
CREATE POLICY "Users manage their own charges" 
ON public.charges FOR ALL 
USING (
    (auth.uid() = user_id) 
    OR (group_id IS NOT NULL AND public.user_has_group_access(group_id, 'editor'))
)
WITH CHECK (
    (auth.uid() = user_id) 
    AND (group_id IS NULL OR public.user_has_group_access(group_id, 'editor'))
);

DROP POLICY IF EXISTS "Users manage their own charge occurrences" ON public.charge_occurrences;
CREATE POLICY "Users manage their own charge occurrences" 
ON public.charge_occurrences FOR ALL 
USING (
    (auth.uid() = user_id) 
    OR (group_id IS NOT NULL AND public.user_has_group_access(group_id, 'editor'))
)
WITH CHECK (
    (auth.uid() = user_id) 
    AND (group_id IS NULL OR public.user_has_group_access(group_id, 'editor'))
);

DROP POLICY IF EXISTS "Users manage their own receipts" ON public.receipts;
CREATE POLICY "Users manage their own receipts" 
ON public.receipts FOR ALL 
USING (
    (auth.uid() = user_id) 
    OR (group_id IS NOT NULL AND public.user_has_group_access(group_id, 'editor'))
)
WITH CHECK (
    (auth.uid() = user_id) 
    AND (group_id IS NULL OR public.user_has_group_access(group_id, 'editor'))
);

-- 10. Automatic Group Creation Trigger on New User Signup
CREATE OR REPLACE FUNCTION public.handle_new_user_default_group()
RETURNS TRIGGER AS $$
DECLARE
    new_group_id UUID;
BEGIN
    INSERT INTO public.management_groups (
        name,
        description,
        color,
        owner_id,
        status,
        settings
    ) VALUES (
        'Pessoal',
        'Ambiente financeiro pessoal e contas gerais',
        '#6366f1',
        NEW.id,
        'active',
        '{"currency": "BRL"}'::jsonb
    ) RETURNING id INTO new_group_id;

    INSERT INTO public.group_members (group_id, user_id, role)
    VALUES (new_group_id, NEW.id, 'admin')
    ON CONFLICT (group_id, user_id) DO NOTHING;

    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    -- Never block user signup even if trigger encounters an edge case
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created_default_group ON auth.users;
CREATE TRIGGER on_auth_user_created_default_group
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user_default_group();
