-- ==============================================================================
-- FINANCEIRA PRO: FIX FOR RLS INFINITE RECURSION ON MANAGEMENT_GROUPS
-- ==============================================================================
-- This script fixes the "infinite recursion detected in policy for relation
-- management_groups" error by introducing SECURITY DEFINER helper functions
-- that bypass mutual recursion between management_groups and group_members.
-- Safe to execute in the Supabase SQL Editor.
-- ==============================================================================

-- 1. Helper Security Functions (SECURITY DEFINER bypasses RLS evaluation loops)
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
          AND role = 'admin'
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
    SELECT group_id FROM public.group_members WHERE user_id = target_user_id AND role = 'admin';
$$;

-- 2. Drop existing recursive policies on management_groups
DROP POLICY IF EXISTS "Users can view groups they belong to" ON public.management_groups;
DROP POLICY IF EXISTS "Users can insert their own groups" ON public.management_groups;
DROP POLICY IF EXISTS "Owners and admins can update their groups" ON public.management_groups;
DROP POLICY IF EXISTS "Only owners can delete their groups" ON public.management_groups;

-- 3. Re-create non-recursive policies on management_groups
CREATE POLICY "Users can view groups they belong to" 
ON public.management_groups FOR SELECT 
USING (
    owner_id = auth.uid() 
    OR id IN (SELECT public.get_user_member_group_ids(auth.uid()))
);

CREATE POLICY "Users can insert their own groups" 
ON public.management_groups FOR INSERT 
WITH CHECK (owner_id = auth.uid());

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

CREATE POLICY "Only owners can delete their groups" 
ON public.management_groups FOR DELETE 
USING (owner_id = auth.uid());

-- 4. Drop existing recursive policies on group_members
DROP POLICY IF EXISTS "Users can view group members" ON public.group_members;
DROP POLICY IF EXISTS "Owners and admins can manage group members" ON public.group_members;

-- 5. Re-create non-recursive policies on group_members
CREATE POLICY "Users can view group members" 
ON public.group_members FOR SELECT 
USING (
    user_id = auth.uid() 
    OR public.check_is_group_owner(group_id, auth.uid())
);

CREATE POLICY "Owners and admins can manage group members" 
ON public.group_members FOR ALL 
USING (
    public.check_is_group_owner(group_id, auth.uid())
    OR public.check_is_group_admin(group_id, auth.uid())
);
