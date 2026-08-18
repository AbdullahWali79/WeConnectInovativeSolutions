-- Some production databases created simple_certificates before display controls
-- were introduced. Keep this migration idempotent so it is safe everywhere.
alter table public.simple_certificates
  add column if not exists primary_color text not null default '#1455d9',
  add column if not exists secondary_color text not null default '#338ed8',
  add column if not exists text_color text not null default '#244b5e',
  add column if not exists template_style text not null default 'modern',
  add column if not exists logo_size integer not null default 64,
  add column if not exists signature_url text,
  add column if not exists hr_email text,
  add column if not exists hr_contact_number text,
  add column if not exists digital_stamp_url text,
  add column if not exists digital_stamp_size integer not null default 80;

notify pgrst, 'reload schema';
