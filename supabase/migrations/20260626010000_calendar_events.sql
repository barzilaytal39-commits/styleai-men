-- ============================================================
-- StyleAI Men — Migration: Manual Calendar Events (Phase 8B)
-- Date: 2026-06-26
--
-- User-entered calendar events (foundation for future Google/Apple/Outlook
-- sync via source + external_id). Owner-only RLS. Idempotent, additive.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.calendar_events (
  id           UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id      UUID        REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title        TEXT        NOT NULL,
  description  TEXT,
  start_at     TIMESTAMPTZ NOT NULL,
  end_at       TIMESTAMPTZ,
  location     TEXT,
  source       TEXT        NOT NULL DEFAULT 'manual',
  external_id  TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at   TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS calendar_events_user_start_idx
  ON public.calendar_events (user_id, start_at);

ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "calendar_events_select_own" ON public.calendar_events;
CREATE POLICY "calendar_events_select_own" ON public.calendar_events
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "calendar_events_insert_own" ON public.calendar_events;
CREATE POLICY "calendar_events_insert_own" ON public.calendar_events
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "calendar_events_update_own" ON public.calendar_events;
CREATE POLICY "calendar_events_update_own" ON public.calendar_events
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "calendar_events_delete_own" ON public.calendar_events;
CREATE POLICY "calendar_events_delete_own" ON public.calendar_events
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

DROP TRIGGER IF EXISTS calendar_events_updated_at ON public.calendar_events;
CREATE TRIGGER calendar_events_updated_at
  BEFORE UPDATE ON public.calendar_events
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

NOTIFY pgrst, 'reload schema';
