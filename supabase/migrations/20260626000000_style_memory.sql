-- ============================================================
-- StyleAI Men — Migration: Adaptive Style Memory (Phase 7D)
-- Date: 2026-06-26
--
-- Stores STRUCTURED learned preferences only — never raw chat history.
-- One row per user (user_id UNIQUE). Owner-only RLS. Idempotent, additive.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.style_memory (
  id                    UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id               UUID        REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  favorite_styles       TEXT[]      DEFAULT '{}',
  favorite_colors       TEXT[]      DEFAULT '{}',
  favorite_brands       TEXT[]      DEFAULT '{}',
  favorite_fragrances   TEXT[]      DEFAULT '{}',
  favorite_watches      TEXT[]      DEFAULT '{}',
  favorite_accessories  TEXT[]      DEFAULT '{}',
  preferred_formality   INTEGER,
  preferred_fits        JSONB       DEFAULT '{}',
  learned_avoids        TEXT[]      DEFAULT '{}',
  learned_preferences   TEXT[]      DEFAULT '{}',
  confidence            NUMERIC     DEFAULT 0,
  feedback_counts       JSONB       DEFAULT '{}',
  saved_recommendations JSONB       DEFAULT '[]',
  created_at            TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at            TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE public.style_memory ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "style_memory_select_own" ON public.style_memory;
CREATE POLICY "style_memory_select_own" ON public.style_memory
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "style_memory_insert_own" ON public.style_memory;
CREATE POLICY "style_memory_insert_own" ON public.style_memory
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "style_memory_update_own" ON public.style_memory;
CREATE POLICY "style_memory_update_own" ON public.style_memory
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "style_memory_delete_own" ON public.style_memory;
CREATE POLICY "style_memory_delete_own" ON public.style_memory
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

DROP TRIGGER IF EXISTS style_memory_updated_at ON public.style_memory;
CREATE TRIGGER style_memory_updated_at
  BEFORE UPDATE ON public.style_memory
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

NOTIFY pgrst, 'reload schema';
