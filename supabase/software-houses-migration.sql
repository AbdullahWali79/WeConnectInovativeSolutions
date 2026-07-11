-- ============================================================
-- Software Houses Module Migration
-- Run this in Supabase SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS public.software_houses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  tagline text,
  logo_url text,
  watermark_url text,
  website_url text,
  facebook_url text,
  phone text,
  phone2 text,
  email text,
  address text,
  hr_manager_name text,
  ceo_name text,
  -- Letter styling
  header_color1 text DEFAULT '#1e40af',
  header_color2 text DEFAULT '#1e40af',
  is_active boolean DEFAULT true,
  display_order int DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS software_houses_active_idx ON public.software_houses (is_active, display_order);

ALTER TABLE public.software_houses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage software houses" ON public.software_houses;
DROP POLICY IF EXISTS "Public can read active software houses" ON public.software_houses;

CREATE POLICY "Admins can manage software houses" ON public.software_houses
  FOR ALL USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Public can read active software houses" ON public.software_houses
  FOR SELECT USING (true);

-- Seed WeConnect as first entry
INSERT INTO public.software_houses (name, tagline, phone, email, address, hr_manager_name, ceo_name, display_order)
SELECT
  'WeConnect-Inovation',
  'Professional Training and Software Development',
  '03046983794',
  'atifayyoub582@gmail.com',
  'Sharqi Colony Back Side of Cookooz Cafe, Near Main Masjid.',
  'HR Manager',
  'CEO',
  0
WHERE NOT EXISTS (SELECT 1 FROM public.software_houses WHERE name = 'WeConnect-Inovation');
