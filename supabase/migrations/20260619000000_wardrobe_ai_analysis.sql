-- ============================================================
-- StyleAI Men — Migration: Wardrobe AI Analysis columns
-- Date: 2026-06-19
--
-- Adds AI-analysis support columns to public.wardrobe_items.
-- Idempotent: every column uses ADD COLUMN IF NOT EXISTS, so this
-- migration is safe to re-run and does not touch existing data,
-- constraints, RLS, triggers, or any current column.
-- ============================================================

-- Free-text descriptors detected by the analyzer.
ALTER TABLE public.wardrobe_items
  ADD COLUMN IF NOT EXISTS style    TEXT;

ALTER TABLE public.wardrobe_items
  ADD COLUMN IF NOT EXISTS season   TEXT;

ALTER TABLE public.wardrobe_items
  ADD COLUMN IF NOT EXISTS material TEXT;

ALTER TABLE public.wardrobe_items
  ADD COLUMN IF NOT EXISTS pattern  TEXT;

-- Formality on a numeric scale (e.g. 1 = very casual … 5 = formal).
ALTER TABLE public.wardrobe_items
  ADD COLUMN IF NOT EXISTS formality_level INTEGER;

-- Raw structured analyzer output, kept verbatim for auditing / re-use.
ALTER TABLE public.wardrobe_items
  ADD COLUMN IF NOT EXISTS ai_analysis JSONB;

-- Model's overall confidence for the analysis (0.0 – 1.0).
ALTER TABLE public.wardrobe_items
  ADD COLUMN IF NOT EXISTS ai_confidence NUMERIC;

-- When the item was last analyzed; NULL means never analyzed.
ALTER TABLE public.wardrobe_items
  ADD COLUMN IF NOT EXISTS ai_analyzed_at TIMESTAMPTZ;
