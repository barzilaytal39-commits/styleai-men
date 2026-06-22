-- ============================================================
-- StyleAI Men — Migration: Personal Style DNA columns
-- Date: 2026-06-20
--
-- Adds the structured Personal Style DNA fields to public.style_profiles.
-- Idempotent (ADD COLUMN IF NOT EXISTS) and additive only — it does not
-- drop or alter any existing column, the user_id UNIQUE constraint, RLS,
-- or the updated_at trigger.
-- ============================================================

-- Personal
ALTER TABLE public.style_profiles ADD COLUMN IF NOT EXISTS height_cm   INTEGER;
ALTER TABLE public.style_profiles ADD COLUMN IF NOT EXISTS body_type   TEXT;
ALTER TABLE public.style_profiles ADD COLUMN IF NOT EXISTS skin_tone   TEXT;
ALTER TABLE public.style_profiles ADD COLUMN IF NOT EXISTS hair_color  TEXT;

-- Work / lifestyle
ALTER TABLE public.style_profiles ADD COLUMN IF NOT EXISTS profession             TEXT;
ALTER TABLE public.style_profiles ADD COLUMN IF NOT EXISTS work_environment       TEXT;
ALTER TABLE public.style_profiles ADD COLUMN IF NOT EXISTS field_work_frequency   TEXT;
ALTER TABLE public.style_profiles ADD COLUMN IF NOT EXISTS office_work_frequency  TEXT;
ALTER TABLE public.style_profiles ADD COLUMN IF NOT EXISTS typical_day_types      TEXT[] DEFAULT '{}';

-- Style preferences
ALTER TABLE public.style_profiles ADD COLUMN IF NOT EXISTS preferred_style          TEXT;
ALTER TABLE public.style_profiles ADD COLUMN IF NOT EXISTS preferred_formality      INTEGER;
ALTER TABLE public.style_profiles ADD COLUMN IF NOT EXISTS wants_premium_look       BOOLEAN DEFAULT FALSE;
ALTER TABLE public.style_profiles ADD COLUMN IF NOT EXISTS wants_effortless_look    BOOLEAN DEFAULT FALSE;
ALTER TABLE public.style_profiles ADD COLUMN IF NOT EXISTS wants_head_turning_look  BOOLEAN DEFAULT FALSE;
ALTER TABLE public.style_profiles ADD COLUMN IF NOT EXISTS favorite_colors          TEXT[] DEFAULT '{}';
ALTER TABLE public.style_profiles ADD COLUMN IF NOT EXISTS avoid_colors             TEXT[] DEFAULT '{}';
ALTER TABLE public.style_profiles ADD COLUMN IF NOT EXISTS preferred_brands         TEXT[] DEFAULT '{}';
ALTER TABLE public.style_profiles ADD COLUMN IF NOT EXISTS disliked_styles          TEXT[] DEFAULT '{}';

-- Fit preferences
ALTER TABLE public.style_profiles ADD COLUMN IF NOT EXISTS shirt_fit_preference  TEXT;
ALTER TABLE public.style_profiles ADD COLUMN IF NOT EXISTS pants_fit_preference  TEXT;
ALTER TABLE public.style_profiles ADD COLUMN IF NOT EXISTS shoe_style_preference TEXT;
ALTER TABLE public.style_profiles ADD COLUMN IF NOT EXISTS tuck_preference       TEXT;
ALTER TABLE public.style_profiles ADD COLUMN IF NOT EXISTS cuffing_preference    TEXT;

-- Context
ALTER TABLE public.style_profiles ADD COLUMN IF NOT EXISTS climate_sensitivity   TEXT;
ALTER TABLE public.style_profiles ADD COLUMN IF NOT EXISTS fragrance_preference  TEXT;
ALTER TABLE public.style_profiles ADD COLUMN IF NOT EXISTS accessory_preference  TEXT;

-- Refresh PostgREST schema cache so the API sees the new columns.
NOTIFY pgrst, 'reload schema';
