alter table public.software_houses
  add column if not exists hr_email text,
  add column if not exists hr_contact_number text;

alter table public.simple_certificates
  add column if not exists hr_email text,
  add column if not exists hr_contact_number text;

