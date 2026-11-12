-- Migration: Add SEO columns to products table for admin-controlled SEO
-- These columns allow admins to customize slug, meta title, meta description, and keywords
-- per product. All columns are nullable — the app auto-generates values when null.

-- ── Slug column ──────────────────────────────────────────────────────
-- Allows admins to set a custom URL slug (e.g. "ai-resume-builder")
alter table public.products add column if not exists slug text;

-- Auto-generate slugs for existing products from their names
update public.products
set slug = lower(
  regexp_replace(
    regexp_replace(
      regexp_replace(
        trim(name),
        '[^a-zA-Z0-9\s-]',
        ''
      ),
      '\s+',
      '-',
      'g'
    ),
    '-+',
    '-',
    'g'
  )
)
where slug is null or slug = '';

-- Handle collisions: append short hash of id for duplicate slugs
update public.products p
set slug = p.slug || '-' || substring(p.id::text, 1, 8)
where exists (
  select 1 from public.products p2
  where p2.slug = p.slug
    and p2.id < p.id
)
and p.slug is not null;

-- Index for slug lookups
create index if not exists idx_products_slug on public.products (slug);

-- ── SEO metadata columns ─────────────────────────────────────────────
-- Admin can override the auto-generated SEO title (shown in <title> and OG tags)
alter table public.products add column if not exists seo_title text;

-- Admin can override the auto-generated meta description (max 160 chars recommended)
alter table public.products add column if not exists seo_description text;

-- Admin can specify custom SEO keywords as a text array
alter table public.products add column if not exists seo_keywords text[] default '{}';

-- Note: All columns are nullable. The application code generates fallback values
-- from product name, category, short_description, and features when these are null.
