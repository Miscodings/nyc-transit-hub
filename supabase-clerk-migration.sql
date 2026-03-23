-- Drop policies first (they block column type changes)
DROP POLICY IF EXISTS "Users manage their own favorites" ON public.favorites;
DROP POLICY IF EXISTS "Users manage their own alerts"   ON public.alerts;

-- Change user_id from UUID to TEXT to accept Clerk user IDs
ALTER TABLE public.favorites DROP CONSTRAINT IF EXISTS favorites_user_id_fkey;
ALTER TABLE public.favorites ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT;

ALTER TABLE public.alerts DROP CONSTRAINT IF EXISTS alerts_user_id_fkey;
ALTER TABLE public.alerts ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT;

-- Helper: extract Clerk user ID from JWT sub claim
CREATE OR REPLACE FUNCTION requesting_user_id()
RETURNS TEXT AS $$
  SELECT NULLIF(
    current_setting('request.jwt.claims', true)::json->>'sub',
    ''
  )::text;
$$ LANGUAGE SQL STABLE;

-- Recreate RLS policies using Clerk user ID
CREATE POLICY "Users manage their own favorites"
  ON public.favorites
  USING  (user_id = requesting_user_id())
  WITH CHECK (user_id = requesting_user_id());

CREATE POLICY "Users manage their own alerts"
  ON public.alerts
  USING  (user_id = requesting_user_id())
  WITH CHECK (user_id = requesting_user_id());
