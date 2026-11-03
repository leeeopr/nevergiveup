-- ==============================================================================
-- FINANCEIRA PRO: CORREÇÃO DEFINITIVA DE ISOLAMENTO FINANCEIRO ENTRE GRUPOS
-- ==============================================================================
-- Este script implementa isolamento multi-tenant estrito entre Grupos de
-- Gerenciamento (ex: Pessoal, Chácara, Avós, Empresa) no Supabase / PostgreSQL.
-- 
-- Garante que:
-- 1. Nenhuma consulta (SELECT), inserção (INSERT), atualização (UPDATE) ou
--    exclusão (DELETE) vaze dados entre grupos diferentes.
-- 2. Todo registro financeiro pertença obrigatoriamente a um group_id autorizado.
-- 3. Registros legados órfãos (group_id IS NULL) sejam migrados com segurança
--    para o grupo padrão "Pessoal" do respectivo usuário, sem perda de dados.
-- 4. RLS (Row Level Security) não permita leitura cruzada via user_id permissivo.
-- 5. Índices de performance garantam consultas instantâneas filtradas por group_id.
-- 6. Suporte completo a assinaturas com 2 parâmetros (group_id, minimum_role)
--    e 3 parâmetros (group_id, user_id, minimum_role) para user_has_group_access.
-- ==============================================================================

-- 1. ESTRUTURA BASE: ENUMS E TABELAS DE GERENCIAMENTO
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('admin', 'editor', 'viewer');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

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

-- Garante existência de colunas em management_groups
ALTER TABLE public.management_groups ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.management_groups ADD COLUMN IF NOT EXISTS color TEXT DEFAULT '#6366f1';
ALTER TABLE public.management_groups ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
ALTER TABLE public.management_groups ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.management_groups ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.management_groups ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE TABLE IF NOT EXISTS public.group_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES public.management_groups(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role public.user_role NOT NULL DEFAULT 'editor',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(group_id, user_id)
);

-- 2. FUNÇÕES DE SEGURANÇA E CONTROLE DE ACESSO (SEM RECURSÃO)
-- 2.1 Função Canônica com 3 parâmetros: (target_group_id, check_user_id, minimum_role)
CREATE OR REPLACE FUNCTION public.user_has_group_access(
    target_group_id UUID,
    check_user_id UUID,
    minimum_role TEXT DEFAULT 'viewer'
)
RETURNS BOOLEAN AS $$
DECLARE
    effective_uid UUID := COALESCE(check_user_id, auth.uid());
BEGIN
    IF effective_uid IS NULL OR target_group_id IS NULL THEN
        RETURN FALSE;
    END IF;

    -- Proprietário do grupo possui acesso irrestrito
    IF EXISTS (
        SELECT 1 FROM public.management_groups 
        WHERE id = target_group_id AND owner_id = effective_uid
    ) THEN
        RETURN TRUE;
    END IF;

    -- Validação hierárquica por permissão de membro
    IF minimum_role = 'viewer' THEN
        RETURN EXISTS (
            SELECT 1 FROM public.group_members 
            WHERE group_id = target_group_id 
              AND user_id = effective_uid
        );
    ELSIF minimum_role = 'editor' THEN
        RETURN EXISTS (
            SELECT 1 FROM public.group_members 
            WHERE group_id = target_group_id 
              AND user_id = effective_uid 
              AND role::text IN ('admin', 'editor')
        );
    ELSIF minimum_role = 'admin' THEN
        RETURN EXISTS (
            SELECT 1 FROM public.group_members 
            WHERE group_id = target_group_id 
              AND user_id = effective_uid 
              AND role::text = 'admin'
        );
    END IF;

    RETURN FALSE;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

-- 2.2 Sobrecarga com 2 parâmetros: (target_group_id, minimum_role)
CREATE OR REPLACE FUNCTION public.user_has_group_access(
    target_group_id UUID,
    minimum_role TEXT DEFAULT 'viewer'
)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN public.user_has_group_access(target_group_id, auth.uid(), minimum_role);
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

-- 2.3 Funções auxiliares sem recursão para RLS de grupos
CREATE OR REPLACE FUNCTION public.check_is_group_owner(target_group_id UUID, target_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.management_groups 
        WHERE id = target_group_id AND owner_id = target_user_id
    );
$$;

CREATE OR REPLACE FUNCTION public.check_is_group_admin(target_group_id UUID, target_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.group_members
        WHERE group_id = target_group_id 
          AND user_id = target_user_id
          AND role::text = 'admin'
    );
$$;

CREATE OR REPLACE FUNCTION public.get_user_member_group_ids(target_user_id UUID DEFAULT auth.uid())
RETURNS SETOF UUID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
    SELECT group_id FROM public.group_members WHERE user_id = target_user_id;
$$;

CREATE OR REPLACE FUNCTION public.get_user_admin_group_ids(target_user_id UUID DEFAULT auth.uid())
RETURNS SETOF UUID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
    SELECT group_id FROM public.group_members WHERE user_id = target_user_id AND role::text = 'admin';
$$;

-- 3. RLS EM TABELAS DE GERENCIAMENTO (PROTEÇÃO CONTRA RECURSÃO INFINITA)
ALTER TABLE public.management_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view groups they belong to" ON public.management_groups;
CREATE POLICY "Users can view groups they belong to" 
ON public.management_groups FOR SELECT 
USING (
    owner_id = auth.uid() 
    OR id IN (SELECT public.get_user_member_group_ids(auth.uid()))
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
    OR id IN (SELECT public.get_user_admin_group_ids(auth.uid()))
)
WITH CHECK (
    owner_id = auth.uid() 
    OR id IN (SELECT public.get_user_admin_group_ids(auth.uid()))
);

DROP POLICY IF EXISTS "Only owners can delete their groups" ON public.management_groups;
CREATE POLICY "Only owners can delete their groups" 
ON public.management_groups FOR DELETE 
USING (owner_id = auth.uid());

DROP POLICY IF EXISTS "Users can view group members" ON public.group_members;
CREATE POLICY "Users can view group members" 
ON public.group_members FOR SELECT 
USING (
    user_id = auth.uid() 
    OR public.check_is_group_owner(group_id, auth.uid())
);

DROP POLICY IF EXISTS "Owners and admins can manage group members" ON public.group_members;
CREATE POLICY "Owners and admins can manage group members" 
ON public.group_members FOR ALL 
USING (
    public.check_is_group_owner(group_id, auth.uid())
    OR public.check_is_group_admin(group_id, auth.uid())
);

-- 4. GARANTE COLUNA group_id EM TODAS AS TABELAS OPERACIONAIS E FINANCEIRAS
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

    -- 4.3 Debt Persons (Pessoas cadastradas)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'debt_persons' AND column_name = 'group_id'
    ) THEN
        ALTER TABLE public.debt_persons ADD COLUMN group_id UUID REFERENCES public.management_groups(id) ON DELETE CASCADE;
    END IF;

    -- 4.4 Debts (Dívidas / Obrigações)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'debts' AND column_name = 'group_id'
    ) THEN
        ALTER TABLE public.debts ADD COLUMN group_id UUID REFERENCES public.management_groups(id) ON DELETE CASCADE;
    END IF;

    -- 4.5 Debt Payments (Amortizações)
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

    -- 4.7 Charges (Cobranças B2B)
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

-- 5. BACKFILL E SANITIZAÇÃO DE DADOS LEGADOS SEM GROUP_ID (SEM PERDA DE DADOS)
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
        -- Localiza grupo inicial do usuário
        SELECT id INTO initial_group_id 
        FROM public.management_groups 
        WHERE owner_id = user_rec.id 
        ORDER BY created_at ASC 
        LIMIT 1;

        -- Se o usuário não tiver grupo, cria o grupo 'Pessoal'
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
                '{"currency": "BRL", "defaultMonthlyBudget": 1200}'::jsonb
            ) RETURNING id INTO initial_group_id;

            INSERT INTO public.group_members (group_id, user_id, role)
            VALUES (initial_group_id, user_rec.id, 'admin')
            ON CONFLICT (group_id, user_id) DO NOTHING;
        END IF;

        -- Migra todos os registros órfãos para o grupo Pessoal do usuário
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

-- 6. ÍNDICES COMPOSTOS PARA ISOLAMENTO E DESEMPENHO
CREATE INDEX IF NOT EXISTS idx_mgmt_groups_owner ON public.management_groups(owner_id);
CREATE INDEX IF NOT EXISTS idx_mgmt_groups_status ON public.management_groups(status);
CREATE INDEX IF NOT EXISTS idx_group_members_user ON public.group_members(user_id);
CREATE INDEX IF NOT EXISTS idx_group_members_group ON public.group_members(group_id);

CREATE INDEX IF NOT EXISTS idx_movements_group_date ON public.financial_movements(group_id, date);
CREATE INDEX IF NOT EXISTS idx_movements_group_type ON public.financial_movements(group_id, type);
CREATE INDEX IF NOT EXISTS idx_structural_group ON public.structural_expenses(group_id);
CREATE INDEX IF NOT EXISTS idx_debt_persons_group ON public.debt_persons(group_id);
CREATE INDEX IF NOT EXISTS idx_debts_group ON public.debts(group_id);
CREATE INDEX IF NOT EXISTS idx_debt_payments_group ON public.debt_payments(group_id);
CREATE INDEX IF NOT EXISTS idx_clients_group ON public.clients(group_id);
CREATE INDEX IF NOT EXISTS idx_charges_group ON public.charges(group_id);
CREATE INDEX IF NOT EXISTS idx_charge_occurrences_group ON public.charge_occurrences(group_id, due_date);
CREATE INDEX IF NOT EXISTS idx_receipts_group ON public.receipts(group_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_group ON public.google_calendar_events(group_id);

-- 7. FUNÇÃO DE INTEGRIDADE DE RELACIONAMENTOS CRUZADOS
CREATE OR REPLACE FUNCTION public.check_movement_group_integrity()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.group_id IS NULL THEN
        RAISE EXCEPTION 'Operação rejeitada: É obrigatório informar o group_id da movimentação financeira.';
    END IF;

    -- Valida se a pessoa vinculada pertence ao mesmo grupo
    IF NEW.debt_person_id IS NOT NULL THEN
        IF NOT EXISTS (
            SELECT 1 FROM public.debt_persons 
            WHERE id = NEW.debt_person_id AND group_id = NEW.group_id
        ) THEN
            RAISE EXCEPTION 'Violação de isolamento: A pessoa vinculada pertence a outro grupo de gerenciamento.';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_check_movement_group_integrity ON public.financial_movements;
CREATE TRIGGER trg_check_movement_group_integrity
BEFORE INSERT OR UPDATE OF group_id, debt_person_id ON public.financial_movements
FOR EACH ROW EXECUTE FUNCTION public.check_movement_group_integrity();

-- 8. RLS ESTRITO — POLÍTICAS DE ISOLAMENTO TOTAL POR GRUPO
-- Toda leitura e modificação exige que o registro pertença ao grupo autorizado.

-- 8.1 Financial Movements
ALTER TABLE public.financial_movements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own financial data" ON public.financial_movements;
DROP POLICY IF EXISTS "Users can insert their own financial data" ON public.financial_movements;
DROP POLICY IF EXISTS "Users can update their own financial data" ON public.financial_movements;
DROP POLICY IF EXISTS "Users can delete their own financial data" ON public.financial_movements;

CREATE POLICY "Users can view their own financial data" 
ON public.financial_movements FOR SELECT 
USING (
    group_id IS NOT NULL 
    AND public.user_has_group_access(group_id, 'viewer')
);

CREATE POLICY "Users can insert their own financial data" 
ON public.financial_movements FOR INSERT 
WITH CHECK (
    group_id IS NOT NULL 
    AND (auth.uid() = user_id)
    AND public.user_has_group_access(group_id, 'editor')
);

CREATE POLICY "Users can update their own financial data" 
ON public.financial_movements FOR UPDATE 
USING (
    group_id IS NOT NULL 
    AND public.user_has_group_access(group_id, 'editor')
)
WITH CHECK (
    group_id IS NOT NULL 
    AND public.user_has_group_access(group_id, 'editor')
);

CREATE POLICY "Users can delete their own financial data" 
ON public.financial_movements FOR DELETE 
USING (
    group_id IS NOT NULL 
    AND public.user_has_group_access(group_id, 'editor')
);

-- 8.2 Structural Expenses (Custos Fixos)
ALTER TABLE public.structural_expenses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own structural expenses" ON public.structural_expenses;
DROP POLICY IF EXISTS "Users can insert their own structural expenses" ON public.structural_expenses;
DROP POLICY IF EXISTS "Users can update their own structural expenses" ON public.structural_expenses;
DROP POLICY IF EXISTS "Users can delete their own structural expenses" ON public.structural_expenses;
DROP POLICY IF EXISTS "Users can view structural expenses" ON public.structural_expenses;
DROP POLICY IF EXISTS "Users can insert structural expenses" ON public.structural_expenses;
DROP POLICY IF EXISTS "Users can update structural expenses" ON public.structural_expenses;
DROP POLICY IF EXISTS "Users can delete structural expenses" ON public.structural_expenses;

CREATE POLICY "Users can view structural expenses" 
ON public.structural_expenses FOR SELECT 
USING (
    group_id IS NOT NULL 
    AND public.user_has_group_access(group_id, 'viewer')
);

CREATE POLICY "Users can insert structural expenses" 
ON public.structural_expenses FOR INSERT 
WITH CHECK (
    group_id IS NOT NULL 
    AND (auth.uid() = user_id)
    AND public.user_has_group_access(group_id, 'editor')
);

CREATE POLICY "Users can update structural expenses" 
ON public.structural_expenses FOR UPDATE 
USING (
    group_id IS NOT NULL 
    AND public.user_has_group_access(group_id, 'editor')
)
WITH CHECK (
    group_id IS NOT NULL 
    AND public.user_has_group_access(group_id, 'editor')
);

CREATE POLICY "Users can delete structural expenses" 
ON public.structural_expenses FOR DELETE 
USING (
    group_id IS NOT NULL 
    AND public.user_has_group_access(group_id, 'editor')
);

-- 8.3 Debt Persons
ALTER TABLE public.debt_persons ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage their own debt persons" ON public.debt_persons;
DROP POLICY IF EXISTS "Users can view debt persons" ON public.debt_persons;
DROP POLICY IF EXISTS "Users can insert debt persons" ON public.debt_persons;
DROP POLICY IF EXISTS "Users can update debt persons" ON public.debt_persons;
DROP POLICY IF EXISTS "Users can delete debt persons" ON public.debt_persons;

CREATE POLICY "Users can view debt persons" 
ON public.debt_persons FOR SELECT 
USING (
    group_id IS NOT NULL 
    AND public.user_has_group_access(group_id, 'viewer')
);

CREATE POLICY "Users can insert debt persons" 
ON public.debt_persons FOR INSERT 
WITH CHECK (
    group_id IS NOT NULL 
    AND (auth.uid() = user_id)
    AND public.user_has_group_access(group_id, 'editor')
);

CREATE POLICY "Users can update debt persons" 
ON public.debt_persons FOR UPDATE 
USING (
    group_id IS NOT NULL 
    AND public.user_has_group_access(group_id, 'editor')
)
WITH CHECK (
    group_id IS NOT NULL 
    AND public.user_has_group_access(group_id, 'editor')
);

CREATE POLICY "Users can delete debt persons" 
ON public.debt_persons FOR DELETE 
USING (
    group_id IS NOT NULL 
    AND public.user_has_group_access(group_id, 'editor')
);

-- 8.4 Debts
ALTER TABLE public.debts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage their own debts" ON public.debts;
DROP POLICY IF EXISTS "Users can view debts" ON public.debts;
DROP POLICY IF EXISTS "Users can insert debts" ON public.debts;
DROP POLICY IF EXISTS "Users can update debts" ON public.debts;
DROP POLICY IF EXISTS "Users can delete debts" ON public.debts;

CREATE POLICY "Users can view debts" 
ON public.debts FOR SELECT 
USING (
    group_id IS NOT NULL 
    AND public.user_has_group_access(group_id, 'viewer')
);

CREATE POLICY "Users can insert debts" 
ON public.debts FOR INSERT 
WITH CHECK (
    group_id IS NOT NULL 
    AND (auth.uid() = user_id)
    AND public.user_has_group_access(group_id, 'editor')
);

CREATE POLICY "Users can update debts" 
ON public.debts FOR UPDATE 
USING (
    group_id IS NOT NULL 
    AND public.user_has_group_access(group_id, 'editor')
)
WITH CHECK (
    group_id IS NOT NULL 
    AND public.user_has_group_access(group_id, 'editor')
);

CREATE POLICY "Users can delete debts" 
ON public.debts FOR DELETE 
USING (
    group_id IS NOT NULL 
    AND public.user_has_group_access(group_id, 'editor')
);

-- 8.5 Debt Payments
ALTER TABLE public.debt_payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage their own debt payments" ON public.debt_payments;
DROP POLICY IF EXISTS "Users can view debt payments" ON public.debt_payments;
DROP POLICY IF EXISTS "Users can insert debt payments" ON public.debt_payments;
DROP POLICY IF EXISTS "Users can update debt payments" ON public.debt_payments;
DROP POLICY IF EXISTS "Users can delete debt payments" ON public.debt_payments;

CREATE POLICY "Users can view debt payments" 
ON public.debt_payments FOR SELECT 
USING (
    group_id IS NOT NULL 
    AND public.user_has_group_access(group_id, 'viewer')
);

CREATE POLICY "Users can insert debt payments" 
ON public.debt_payments FOR INSERT 
WITH CHECK (
    group_id IS NOT NULL 
    AND (auth.uid() = user_id)
    AND public.user_has_group_access(group_id, 'editor')
);

CREATE POLICY "Users can update debt payments" 
ON public.debt_payments FOR UPDATE 
USING (
    group_id IS NOT NULL 
    AND public.user_has_group_access(group_id, 'editor')
)
WITH CHECK (
    group_id IS NOT NULL 
    AND public.user_has_group_access(group_id, 'editor')
);

CREATE POLICY "Users can delete debt payments" 
ON public.debt_payments FOR DELETE 
USING (
    group_id IS NOT NULL 
    AND public.user_has_group_access(group_id, 'editor')
);

-- 8.6 Clients (Empresa)
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage their own clients" ON public.clients;
DROP POLICY IF EXISTS "Users can view clients" ON public.clients;
DROP POLICY IF EXISTS "Users can insert clients" ON public.clients;
DROP POLICY IF EXISTS "Users can update clients" ON public.clients;
DROP POLICY IF EXISTS "Users can delete clients" ON public.clients;

CREATE POLICY "Users can view clients" 
ON public.clients FOR SELECT 
USING (
    group_id IS NOT NULL 
    AND public.user_has_group_access(group_id, 'viewer')
);

CREATE POLICY "Users can insert clients" 
ON public.clients FOR INSERT 
WITH CHECK (
    group_id IS NOT NULL 
    AND (auth.uid() = user_id)
    AND public.user_has_group_access(group_id, 'editor')
);

CREATE POLICY "Users can update clients" 
ON public.clients FOR UPDATE 
USING (
    group_id IS NOT NULL 
    AND public.user_has_group_access(group_id, 'editor')
)
WITH CHECK (
    group_id IS NOT NULL 
    AND public.user_has_group_access(group_id, 'editor')
);

CREATE POLICY "Users can delete clients" 
ON public.clients FOR DELETE 
USING (
    group_id IS NOT NULL 
    AND public.user_has_group_access(group_id, 'editor')
);

-- 8.7 Charges & Charge Occurrences
ALTER TABLE public.charges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.charge_occurrences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage their own charges" ON public.charges;
DROP POLICY IF EXISTS "Users can view charges" ON public.charges;
DROP POLICY IF EXISTS "Users can insert charges" ON public.charges;
DROP POLICY IF EXISTS "Users can update charges" ON public.charges;
DROP POLICY IF EXISTS "Users can delete charges" ON public.charges;

CREATE POLICY "Users can view charges" 
ON public.charges FOR SELECT 
USING (
    group_id IS NOT NULL 
    AND public.user_has_group_access(group_id, 'viewer')
);

CREATE POLICY "Users can insert charges" 
ON public.charges FOR INSERT 
WITH CHECK (
    group_id IS NOT NULL 
    AND (auth.uid() = user_id)
    AND public.user_has_group_access(group_id, 'editor')
);

CREATE POLICY "Users can update charges" 
ON public.charges FOR UPDATE 
USING (
    group_id IS NOT NULL 
    AND public.user_has_group_access(group_id, 'editor')
)
WITH CHECK (
    group_id IS NOT NULL 
    AND public.user_has_group_access(group_id, 'editor')
);

CREATE POLICY "Users can delete charges" 
ON public.charges FOR DELETE 
USING (
    group_id IS NOT NULL 
    AND public.user_has_group_access(group_id, 'editor')
);

DROP POLICY IF EXISTS "Users manage their own charge occurrences" ON public.charge_occurrences;
DROP POLICY IF EXISTS "Users can view charge occurrences" ON public.charge_occurrences;
DROP POLICY IF EXISTS "Users can insert charge occurrences" ON public.charge_occurrences;
DROP POLICY IF EXISTS "Users can update charge occurrences" ON public.charge_occurrences;
DROP POLICY IF EXISTS "Users can delete charge occurrences" ON public.charge_occurrences;

CREATE POLICY "Users can view charge occurrences" 
ON public.charge_occurrences FOR SELECT 
USING (
    group_id IS NOT NULL 
    AND public.user_has_group_access(group_id, 'viewer')
);

CREATE POLICY "Users can insert charge occurrences" 
ON public.charge_occurrences FOR INSERT 
WITH CHECK (
    group_id IS NOT NULL 
    AND (auth.uid() = user_id)
    AND public.user_has_group_access(group_id, 'editor')
);

CREATE POLICY "Users can update charge occurrences" 
ON public.charge_occurrences FOR UPDATE 
USING (
    group_id IS NOT NULL 
    AND public.user_has_group_access(group_id, 'editor')
)
WITH CHECK (
    group_id IS NOT NULL 
    AND public.user_has_group_access(group_id, 'editor')
);

CREATE POLICY "Users can delete charge occurrences" 
ON public.charge_occurrences FOR DELETE 
USING (
    group_id IS NOT NULL 
    AND public.user_has_group_access(group_id, 'editor')
);

-- 8.8 Receipts
ALTER TABLE public.receipts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage their own receipts" ON public.receipts;
DROP POLICY IF EXISTS "Users can view receipts" ON public.receipts;
DROP POLICY IF EXISTS "Users can insert receipts" ON public.receipts;
DROP POLICY IF EXISTS "Users can update receipts" ON public.receipts;
DROP POLICY IF EXISTS "Users can delete receipts" ON public.receipts;

CREATE POLICY "Users can view receipts" 
ON public.receipts FOR SELECT 
USING (
    group_id IS NOT NULL 
    AND public.user_has_group_access(group_id, 'viewer')
);

CREATE POLICY "Users can insert receipts" 
ON public.receipts FOR INSERT 
WITH CHECK (
    group_id IS NOT NULL 
    AND (auth.uid() = user_id)
    AND public.user_has_group_access(group_id, 'editor')
);

CREATE POLICY "Users can update receipts" 
ON public.receipts FOR UPDATE 
USING (
    group_id IS NOT NULL 
    AND public.user_has_group_access(group_id, 'editor')
)
WITH CHECK (
    group_id IS NOT NULL 
    AND public.user_has_group_access(group_id, 'editor')
);

CREATE POLICY "Users can delete receipts" 
ON public.receipts FOR DELETE 
USING (
    group_id IS NOT NULL 
    AND public.user_has_group_access(group_id, 'editor')
);

-- 8.9 Google Calendar Events
ALTER TABLE public.google_calendar_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view calendar events" ON public.google_calendar_events;
DROP POLICY IF EXISTS "Users can insert calendar events" ON public.google_calendar_events;
DROP POLICY IF EXISTS "Users can update calendar events" ON public.google_calendar_events;
DROP POLICY IF EXISTS "Users can delete calendar events" ON public.google_calendar_events;

CREATE POLICY "Users can view calendar events" 
ON public.google_calendar_events FOR SELECT 
USING (
    group_id IS NOT NULL 
    AND public.user_has_group_access(group_id, 'viewer')
);

CREATE POLICY "Users can insert calendar events" 
ON public.google_calendar_events FOR INSERT 
WITH CHECK (
    group_id IS NOT NULL 
    AND (auth.uid() = user_id)
    AND public.user_has_group_access(group_id, 'editor')
);

CREATE POLICY "Users can update calendar events" 
ON public.google_calendar_events FOR UPDATE 
USING (
    group_id IS NOT NULL 
    AND public.user_has_group_access(group_id, 'editor')
)
WITH CHECK (
    group_id IS NOT NULL 
    AND public.user_has_group_access(group_id, 'editor')
);

CREATE POLICY "Users can delete calendar events" 
ON public.google_calendar_events FOR DELETE 
USING (
    group_id IS NOT NULL 
    AND public.user_has_group_access(group_id, 'editor')
);
