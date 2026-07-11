alter table public.blogs
  add column if not exists cover_image_github_path text,
  add column if not exists cover_image_github_url text,
  add column if not exists cover_image_cdn_url text;

alter table public.team_members
  add column if not exists image_github_path text,
  add column if not exists image_github_url text,
  add column if not exists image_cdn_url text;

alter table public.products
  add column if not exists image_github_path text,
  add column if not exists image_github_url text,
  add column if not exists image_cdn_url text;

alter table public.software_houses
  add column if not exists logo_github_path text,
  add column if not exists logo_github_url text,
  add column if not exists logo_cdn_url text,
  add column if not exists watermark_github_path text,
  add column if not exists watermark_github_url text,
  add column if not exists watermark_cdn_url text;

alter table public.admin_signature_settings
  add column if not exists signature_github_path text,
  add column if not exists signature_github_url text,
  add column if not exists signature_cdn_url text,
  add column if not exists stamp_github_path text,
  add column if not exists stamp_github_url text,
  add column if not exists stamp_cdn_url text,
  add column if not exists hr_signature_github_path text,
  add column if not exists hr_signature_github_url text,
  add column if not exists hr_signature_cdn_url text;

alter table public.branding_settings
  add column if not exists logo_github_path text,
  add column if not exists logo_github_url text,
  add column if not exists logo_cdn_url text;

alter table public.submissions
  add column if not exists file_urls text[],
  add column if not exists files_metadata jsonb default '[]'::jsonb;

alter table public.applications
  add column if not exists documents text[],
  add column if not exists documents_metadata jsonb default '[]'::jsonb;