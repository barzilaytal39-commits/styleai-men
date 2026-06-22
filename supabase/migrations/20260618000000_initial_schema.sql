-- ============================================================
-- StyleAI Men — Initial Schema (Phase 1 baseline)
-- Date: 2026-06-18
--
-- Complete bootstrap for a CLEAN Supabase project. Creates every
-- table, function, trigger, RLS policy, and storage bucket the app
-- relies on. Safe to run on an empty project and safe to re-run:
--   * tables       -> CREATE TABLE IF NOT EXISTS
--   * functions    -> CREATE OR REPLACE FUNCTION
--   * triggers     -> DROP TRIGGER IF EXISTS, then CREATE
--   * policies     -> DROP POLICY IF EXISTS, then CREATE
--   * buckets      -> INSERT ... ON CONFLICT DO NOTHING
-- It never drops a table or any data.
--
-- NOTE: AI-analysis columns on wardrobe_items are added by the later
-- migration 20260619000000_wardrobe_ai_analysis.sql. This file is the
-- pre-AI baseline; apply migrations in filename (timestamp) order.
-- ============================================================

-- ------------------------------------------------------------
-- 0. SHARED FUNCTIONS
-- ------------------------------------------------------------

-- Keeps updated_at current on any table that wires up the trigger below.
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- ------------------------------------------------------------
-- 1. PROFILES  (1:1 with auth.users)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id                   UUID         REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  username             TEXT         UNIQUE,
  full_name            TEXT,
  bio                  TEXT,
  avatar_url           TEXT,
  height_cm            INTEGER      CHECK (height_cm BETWEEN 100 AND 250),
  weight_kg            DECIMAL(5,1) CHECK (weight_kg BETWEEN 30 AND 300),
  age                  INTEGER      CHECK (age BETWEEN 13 AND 120),
  style_preferences    TEXT[]       DEFAULT '{}',
  onboarding_completed BOOLEAN      DEFAULT FALSE,
  created_at           TIMESTAMPTZ  DEFAULT NOW() NOT NULL,
  updated_at           TIMESTAMPTZ  DEFAULT NOW() NOT NULL
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
CREATE POLICY "profiles_select_own"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
CREATE POLICY "profiles_insert_own"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

DROP TRIGGER IF EXISTS profiles_updated_at ON public.profiles;
CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create a profile row whenever an auth user is created.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, updated_at)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data ->> 'full_name',
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ------------------------------------------------------------
-- 2. STYLE PROFILES  (one optional style profile per user)
--    Forward-looking scaffolding — not yet referenced by app code.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.style_profiles (
  id                UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id           UUID        REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  preferred_styles  TEXT[]      DEFAULT '{}',
  preferred_colors  TEXT[]      DEFAULT '{}',
  avoided_colors    TEXT[]      DEFAULT '{}',
  favorite_brands   TEXT[]      DEFAULT '{}',
  occasions         TEXT[]      DEFAULT '{}',
  budget_level      TEXT,
  fit_preference    TEXT,
  notes             TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at        TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE public.style_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "style_profiles_select_own" ON public.style_profiles;
CREATE POLICY "style_profiles_select_own"
  ON public.style_profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "style_profiles_insert_own" ON public.style_profiles;
CREATE POLICY "style_profiles_insert_own"
  ON public.style_profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "style_profiles_update_own" ON public.style_profiles;
CREATE POLICY "style_profiles_update_own"
  ON public.style_profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "style_profiles_delete_own" ON public.style_profiles;
CREATE POLICY "style_profiles_delete_own"
  ON public.style_profiles FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

DROP TRIGGER IF EXISTS style_profiles_updated_at ON public.style_profiles;
CREATE TRIGGER style_profiles_updated_at
  BEFORE UPDATE ON public.style_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ------------------------------------------------------------
-- 3. WARDROBE ITEMS  (actively used by the app)
--    AI columns are added later by 20260619000000_wardrobe_ai_analysis.sql
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.wardrobe_items (
  id            UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       UUID        REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name          TEXT        NOT NULL,
  category      TEXT        NOT NULL CHECK (category IN ('tops', 'bottoms', 'outerwear', 'shoes', 'accessories')),
  subcategory   TEXT,
  brand         TEXT,
  color         TEXT[]      DEFAULT '{}',
  size          TEXT,
  image_url     TEXT,
  notes         TEXT,
  favorite      BOOLEAN     DEFAULT FALSE,
  worn_count    INTEGER     DEFAULT 0,
  last_worn_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at    TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE public.wardrobe_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "wardrobe_select_own" ON public.wardrobe_items;
CREATE POLICY "wardrobe_select_own"
  ON public.wardrobe_items FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "wardrobe_insert_own" ON public.wardrobe_items;
CREATE POLICY "wardrobe_insert_own"
  ON public.wardrobe_items FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "wardrobe_update_own" ON public.wardrobe_items;
CREATE POLICY "wardrobe_update_own"
  ON public.wardrobe_items FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "wardrobe_delete_own" ON public.wardrobe_items;
CREATE POLICY "wardrobe_delete_own"
  ON public.wardrobe_items FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

DROP TRIGGER IF EXISTS wardrobe_items_updated_at ON public.wardrobe_items;
CREATE TRIGGER wardrobe_items_updated_at
  BEFORE UPDATE ON public.wardrobe_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ------------------------------------------------------------
-- 4. OUTFITS  (forward-looking scaffolding — route is a placeholder)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.outfits (
  id            UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       UUID        REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name          TEXT        NOT NULL,
  occasion      TEXT,
  season        TEXT,
  notes         TEXT,
  image_url     TEXT,
  favorite      BOOLEAN     DEFAULT FALSE,
  worn_count    INTEGER     DEFAULT 0,
  last_worn_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at    TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE public.outfits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "outfits_select_own" ON public.outfits;
CREATE POLICY "outfits_select_own"
  ON public.outfits FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "outfits_insert_own" ON public.outfits;
CREATE POLICY "outfits_insert_own"
  ON public.outfits FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "outfits_update_own" ON public.outfits;
CREATE POLICY "outfits_update_own"
  ON public.outfits FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "outfits_delete_own" ON public.outfits;
CREATE POLICY "outfits_delete_own"
  ON public.outfits FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

DROP TRIGGER IF EXISTS outfits_updated_at ON public.outfits;
CREATE TRIGGER outfits_updated_at
  BEFORE UPDATE ON public.outfits
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ------------------------------------------------------------
-- 5. OUTFIT ITEMS  (join: outfit <-> wardrobe_item)
--    Ownership is inherited from the parent outfit.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.outfit_items (
  id                UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  outfit_id         UUID        REFERENCES public.outfits(id) ON DELETE CASCADE NOT NULL,
  wardrobe_item_id  UUID        REFERENCES public.wardrobe_items(id) ON DELETE CASCADE NOT NULL,
  slot              TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE (outfit_id, wardrobe_item_id)
);

ALTER TABLE public.outfit_items ENABLE ROW LEVEL SECURITY;

-- A row is visible/editable only if the parent outfit belongs to the user.
DROP POLICY IF EXISTS "outfit_items_select_own" ON public.outfit_items;
CREATE POLICY "outfit_items_select_own"
  ON public.outfit_items FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.outfits o
    WHERE o.id = outfit_items.outfit_id AND o.user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "outfit_items_insert_own" ON public.outfit_items;
CREATE POLICY "outfit_items_insert_own"
  ON public.outfit_items FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.outfits o
    WHERE o.id = outfit_items.outfit_id AND o.user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "outfit_items_update_own" ON public.outfit_items;
CREATE POLICY "outfit_items_update_own"
  ON public.outfit_items FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.outfits o
    WHERE o.id = outfit_items.outfit_id AND o.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.outfits o
    WHERE o.id = outfit_items.outfit_id AND o.user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "outfit_items_delete_own" ON public.outfit_items;
CREATE POLICY "outfit_items_delete_own"
  ON public.outfit_items FOR DELETE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.outfits o
    WHERE o.id = outfit_items.outfit_id AND o.user_id = auth.uid()
  ));

-- ------------------------------------------------------------
-- 6. OUTFIT RATINGS  (user feedback on an outfit)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.outfit_ratings (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  outfit_id   UUID        REFERENCES public.outfits(id) ON DELETE CASCADE NOT NULL,
  user_id     UUID        REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  rating      INTEGER     NOT NULL CHECK (rating BETWEEN 1 AND 5),
  feedback    TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE (outfit_id, user_id)
);

ALTER TABLE public.outfit_ratings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "outfit_ratings_select_own" ON public.outfit_ratings;
CREATE POLICY "outfit_ratings_select_own"
  ON public.outfit_ratings FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "outfit_ratings_insert_own" ON public.outfit_ratings;
CREATE POLICY "outfit_ratings_insert_own"
  ON public.outfit_ratings FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "outfit_ratings_update_own" ON public.outfit_ratings;
CREATE POLICY "outfit_ratings_update_own"
  ON public.outfit_ratings FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "outfit_ratings_delete_own" ON public.outfit_ratings;
CREATE POLICY "outfit_ratings_delete_own"
  ON public.outfit_ratings FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- ------------------------------------------------------------
-- 7. STORAGE BUCKETS
--    avatars        — profile photos        (used today)
--    wardrobe-items — clothing item photos  (used today)
--    outfit-photos  — outfit cover photos   (forward-looking)
-- ------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES
  ('avatars',        'avatars',        TRUE),
  ('wardrobe-items', 'wardrobe-items', TRUE),
  ('outfit-photos',  'outfit-photos',  TRUE)
ON CONFLICT (id) DO NOTHING;

-- Public read for all three buckets.
DROP POLICY IF EXISTS "storage_public_read" ON storage.objects;
CREATE POLICY "storage_public_read"
  ON storage.objects FOR SELECT
  USING (bucket_id IN ('avatars', 'wardrobe-items', 'outfit-photos'));

-- Owners may write only inside their own {user_id}/... folder, in any app bucket.
DROP POLICY IF EXISTS "storage_insert_own" ON storage.objects;
CREATE POLICY "storage_insert_own"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id IN ('avatars', 'wardrobe-items', 'outfit-photos')
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "storage_update_own" ON storage.objects;
CREATE POLICY "storage_update_own"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id IN ('avatars', 'wardrobe-items', 'outfit-photos')
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "storage_delete_own" ON storage.objects;
CREATE POLICY "storage_delete_own"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id IN ('avatars', 'wardrobe-items', 'outfit-photos')
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
