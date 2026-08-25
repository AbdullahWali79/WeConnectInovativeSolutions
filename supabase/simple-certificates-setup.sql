-- Run this complete script in the Supabase SQL Editor.
create table if not exists public.simple_certificates (
  id uuid primary key default gen_random_uuid(),
  roll_number text not null unique,
  student_name text not null,
  course_name text not null,
  duration_weeks integer not null default 8 check (duration_weeks > 0 and duration_weeks <= 520),
  start_date date not null,
  end_date date not null,
  software_house_id uuid references public.software_houses(id) on delete set null,
  software_house_name text not null,
  logo_url text,
  signatory_name text,
  signatory_title text,
  primary_color text not null default '#1455d9',
  secondary_color text not null default '#338ed8',
  text_color text not null default '#244b5e',
  template_style text not null default 'modern' check (template_style in ('modern', 'classic', 'executive', 'minimal', 'geometric', 'prestige')),
  punctuality_percentage integer not null default 100 check (punctuality_percentage between 0 and 100),
  task_completion_percentage integer not null default 100 check (task_completion_percentage between 0 and 100),
  project_involvement_percentage integer not null default 100 check (project_involvement_percentage between 0 and 100),
  software_house_name_position_x integer not null default 9 check (software_house_name_position_x between 2 and 80),
  software_house_name_position_y integer not null default 9 check (software_house_name_position_y between 2 and 80),
  logo_size integer not null default 64 check (logo_size between 32 and 180),
  signature_url text,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint simple_certificate_dates check (end_date >= start_date)
);

-- Safe to run again for projects where the table was created by an older version.
alter table public.simple_certificates add column if not exists primary_color text not null default '#1455d9';
alter table public.simple_certificates add column if not exists secondary_color text not null default '#338ed8';
alter table public.simple_certificates add column if not exists text_color text not null default '#244b5e';
alter table public.simple_certificates add column if not exists template_style text not null default 'modern';
alter table public.simple_certificates add column if not exists logo_size integer not null default 64;
alter table public.simple_certificates add column if not exists signature_url text;
alter table public.simple_certificates add column if not exists digital_stamp_opacity numeric(4,3) not null default 0.15;
alter table public.simple_certificates add column if not exists digital_stamp_offset_x integer not null default 40 check (digital_stamp_offset_x between -240 and 240);

-- A reusable Head/CEO signature can be stored against each software house.
alter table public.software_houses add column if not exists head_signature_url text;

create index if not exists simple_certificates_roll_idx on public.simple_certificates (roll_number);
create index if not exists simple_certificates_student_idx on public.simple_certificates using gin (to_tsvector('simple', student_name));
create index if not exists simple_certificates_house_idx on public.simple_certificates (software_house_name);

alter table public.simple_certificates enable row level security;
drop policy if exists "Admins manage simple certificates" on public.simple_certificates;
create policy "Admins manage simple certificates" on public.simple_certificates for all to authenticated
using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin' and p.status = 'approved'))
with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin' and p.status = 'approved'));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('certificate-logos', 'certificate-logos', true, 5242880, array['image/png','image/jpeg','image/webp','image/svg+xml'])
on conflict (id) do update set public = true, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public reads certificate logos" on storage.objects;
create policy "Public reads certificate logos" on storage.objects for select to public using (bucket_id = 'certificate-logos');
drop policy if exists "Admins upload certificate logos" on storage.objects;
create policy "Admins upload certificate logos" on storage.objects for insert to authenticated
with check (bucket_id = 'certificate-logos' and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin' and p.status = 'approved'));
drop policy if exists "Admins update certificate logos" on storage.objects;
create policy "Admins update certificate logos" on storage.objects for update to authenticated
using (bucket_id = 'certificate-logos' and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin' and p.status = 'approved'));

create or replace function public.touch_simple_certificate_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;
drop trigger if exists simple_certificates_updated_at on public.simple_certificates;
create trigger simple_certificates_updated_at before update on public.simple_certificates for each row execute function public.touch_simple_certificate_updated_at();
