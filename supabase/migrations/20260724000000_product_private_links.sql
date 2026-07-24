alter table public.products
  add column if not exists related_links text[] not null default '{}';

comment on column public.products.related_links is
  'Admin-only product resources. Public product queries must not select this column.';
