-- ════════════════════════════════════════════════════════════════════
-- SEO AUDIT — run this in Supabase SQL Editor any time to verify that
-- every active product has complete, unique, well-formed SEO metadata.
-- Read-only: this script only SELECTs, it never modifies data.
-- ════════════════════════════════════════════════════════════════════

-- ── 1. Overall health summary ────────────────────────────────────────
-- Every "missing_*" / "duplicate_*" / "bad_*" value should be 0.
select
  count(*)                                                        as total_active_products,
  count(*) filter (where slug is null or slug = '')               as missing_slug,
  count(*) filter (where seo_title is null or seo_title = '')     as missing_title,
  count(*) filter (where seo_description is null or seo_description = '') as missing_description,
  count(*) filter (where seo_keywords is null or cardinality(seo_keywords) = 0) as missing_keywords,
  count(distinct slug)                                            as unique_slugs,
  count(distinct seo_title)                                       as unique_titles,
  count(*) filter (where slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$')    as malformed_slugs,
  count(*) filter (where length(seo_title) > 70)                  as titles_over_70_chars,
  count(*) filter (where length(seo_description) > 160)           as descriptions_over_160_chars
from public.products
where status = 'active';

-- ── 2. Duplicate slugs (each must be unique for clean URLs) ───────────
select slug, count(*) as products, string_agg(name, ' | ' order by name) as names
from public.products
where status = 'active'
group by slug
having count(*) > 1
order by products desc;

-- ── 3. Duplicate SEO titles (duplicate content risk) ──────────────────
select seo_title, count(*) as products, string_agg(name, ' | ' order by name) as names
from public.products
where status = 'active'
group by seo_title
having count(*) > 1
order by products desc;

-- ── 4. Products that still need attention ─────────────────────────────
select
  id,
  name,
  slug,
  coalesce(seo_title, '(missing)')       as seo_title,
  length(coalesce(seo_title, ''))        as title_len,
  length(coalesce(seo_description, ''))  as description_len,
  cardinality(coalesce(seo_keywords, '{}')) as keyword_count
from public.products
where status = 'active'
  and (
    slug is null or slug = ''
    or seo_title is null or seo_title = ''
    or seo_description is null or seo_description = ''
    or seo_keywords is null or cardinality(seo_keywords) = 0
    or slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$'
    or length(seo_title) > 70
  )
order by name;

-- ── 5. Full slug inventory (handy for checking the sitemap) ───────────
select name, slug, seo_title
from public.products
where status = 'active'
order by slug;
