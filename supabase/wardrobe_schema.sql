-- ============================================================
-- StyleAI Men — Wardrobe Schema
-- Run this in your Supabase SQL Editor after schema.sql
-- ============================================================

-- 1. WARDROBE ITEMS TABLE
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

-- 2. ROW LEVEL SECURITY
ALTER TABLE public.wardrobe_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "wardrobe_select_own"
  ON public.wardrobe_items FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "wardrobe_insert_own"
  ON public.wardrobe_items FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "wardrobe_update_own"
  ON public.wardrobe_items FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "wardrobe_delete_own"
  ON public.wardrobe_items FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- 3. AUTO-UPDATE updated_at
CREATE TRIGGER wardrobe_items_updated_at
  BEFORE UPDATE ON public.wardrobe_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. STORAGE BUCKET FOR WARDROBE ITEM PHOTOS
INSERT INTO storage.buckets (id, name, public)
VALUES ('wardrobe-items', 'wardrobe-items', TRUE)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: public read, owners can manage their folder
CREATE POLICY "wardrobe_items_select_public"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'wardrobe-items');

CREATE POLICY "wardrobe_items_insert_own"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'wardrobe-items' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "wardrobe_items_update_own"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'wardrobe-items' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "wardrobe_items_delete_own"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'wardrobe-items' AND auth.uid()::text = (storage.foldername(name))[1]);
