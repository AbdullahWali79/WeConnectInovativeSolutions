alter table public.products
  add column if not exists video_url text,
  add column if not exists show_in_branding boolean not null default false;

comment on column public.products.video_url is
  'Public YouTube, Google Drive, or direct video URL shown in the product detail.';

comment on column public.products.show_in_branding is
  'When true, the product also appears in the public Branding category without duplicating the product row.';
