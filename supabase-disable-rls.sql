-- Simplify auth: disable JWT-based RLS, filter by user_id in queries instead.
DROP POLICY IF EXISTS "Users manage their own favorites" ON public.favorites;
DROP POLICY IF EXISTS "Users manage their own alerts"   ON public.alerts;

ALTER TABLE public.favorites DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.alerts    DISABLE ROW LEVEL SECURITY;
