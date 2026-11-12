-- Migration: Add slug column to products table for SEO-friendly URLs
-- This is optional — the application code generates slugs from product names at runtime.
-- However, having a DB column allows for direct slug lookups and admin management.

-- Add slug column (nullable so existing rows don't break)
alter table public.products add column if not exists slug text;

-- Generate slugs for existing products from their names
-- Format: lowercase, hyphenated, special chars removed
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
where slug is null;

-- Handle collisions: append short hash of id for duplicate slugs
update public.products p
set slug = p.slug || '-' || substring(p.id::text, 1, 8)
where exists (
  select 1 from public.products p2
  where p2.slug = p.slug
    and p2.id < p.id
)
and p.slug is not null;

-- Add unique index for future direct lookups
create index if not exists idx_products_slug on public.products (slug);

-- Note: We don't make slug NOT NULL yet so the runtime slug generation
-- continues to work as a fallback for any rows without a slug.
