-- Add optional links for software house partner cards.
-- Run this in Supabase SQL Editor.

alter table public.software_houses
  add column if not exists website_url text,
  add column if not exists facebook_url text;
