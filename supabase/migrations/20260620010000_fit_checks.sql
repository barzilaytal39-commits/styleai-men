-- ============================================================
-- StyleAI Men — Migration: Fit Check history
-- Date: 2026-06-20
--
-- Creates public.fit_checks to store completed AI Fit Checks.
-- Idempotent and additive — does not touch existing tables. Photos are
-- stored in the existing `outfit-photos` storage bucket (no new bucket).
-- ============================================================

CREATE TABLE IF NOT EXISTS public.fit_checks (
  id             UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id        UUID        REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  photo_url      TEXT        NOT NULL,
  outfit_id      UUID        REFERENCES public.outfits(id) ON DELETE SET NULL,
  occasion       TEXT,
  desired_style  TEXT,
  weather        JSONB,
  result         JSONB,
  overall_score  NUMERIC,
  final_verdict  TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE public.fit_checks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "fit_checks_select_own" ON public.fit_checks;
CREATE POLICY "fit_checks_select_own"
  ON public.fit_checks FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "fit_checks_insert_own" ON public.fit_checks;
CREATE POLICY "fit_checks_insert_own"
  ON public.fit_checks FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "fit_checks_update_own" ON public.fit_checks;
CREATE POLICY "fit_checks_update_own"
  ON public.fit_checks FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "fit_checks_delete_own" ON public.fit_checks;
CREATE POLICY "fit_checks_delete_own"
  ON public.fit_checks FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Refresh PostgREST schema cache so the API sees the new table.
NOTIFY pgrst, 'reload schema';
