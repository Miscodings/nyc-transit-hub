-- Run this in your Supabase project → SQL Editor
-- Auth is handled by Supabase Auth (auth.users) — no custom users table needed.

-- ============================================================
-- Favorites
-- ============================================================
CREATE TABLE IF NOT EXISTS public.favorites (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  route_id   TEXT NOT NULL,
  route_type TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, route_id)
);

ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own favorites"
  ON public.favorites
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- Alerts
-- ============================================================
CREATE TABLE IF NOT EXISTS public.alerts (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  route_id   TEXT NOT NULL,
  alert_type TEXT NOT NULL,
  enabled    BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own alerts"
  ON public.alerts
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
