-- ============================================================
-- StyleAI Men — Migration: Weekly Planner
-- Date: 2026-06-20
--
-- Creates weekly_plans + weekly_plan_days. Idempotent and additive —
-- does not touch existing tables. Owner-only RLS on both.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.weekly_plans (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID        REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  start_date  DATE        NOT NULL,
  mode        TEXT        NOT NULL DEFAULT 'work_week',
  created_at  TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.weekly_plan_days (
  id               UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  plan_id          UUID        REFERENCES public.weekly_plans(id) ON DELETE CASCADE NOT NULL,
  user_id          UUID        REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  day              DATE        NOT NULL,
  day_index        INTEGER     NOT NULL DEFAULT 0,
  occasion         TEXT,
  location_type    TEXT,
  formality_level  INTEGER,
  weather_snapshot JSONB,
  outfit_id        UUID        REFERENCES public.outfits(id) ON DELETE SET NULL,
  notes            TEXT,
  worn_at          TIMESTAMPTZ,
  generated_at     TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE public.weekly_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weekly_plan_days ENABLE ROW LEVEL SECURITY;

-- weekly_plans policies
DROP POLICY IF EXISTS "weekly_plans_select_own" ON public.weekly_plans;
CREATE POLICY "weekly_plans_select_own" ON public.weekly_plans
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "weekly_plans_insert_own" ON public.weekly_plans;
CREATE POLICY "weekly_plans_insert_own" ON public.weekly_plans
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "weekly_plans_update_own" ON public.weekly_plans;
CREATE POLICY "weekly_plans_update_own" ON public.weekly_plans
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "weekly_plans_delete_own" ON public.weekly_plans;
CREATE POLICY "weekly_plans_delete_own" ON public.weekly_plans
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- weekly_plan_days policies
DROP POLICY IF EXISTS "weekly_plan_days_select_own" ON public.weekly_plan_days;
CREATE POLICY "weekly_plan_days_select_own" ON public.weekly_plan_days
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "weekly_plan_days_insert_own" ON public.weekly_plan_days;
CREATE POLICY "weekly_plan_days_insert_own" ON public.weekly_plan_days
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "weekly_plan_days_update_own" ON public.weekly_plan_days;
CREATE POLICY "weekly_plan_days_update_own" ON public.weekly_plan_days
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "weekly_plan_days_delete_own" ON public.weekly_plan_days;
CREATE POLICY "weekly_plan_days_delete_own" ON public.weekly_plan_days
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

NOTIFY pgrst, 'reload schema';
