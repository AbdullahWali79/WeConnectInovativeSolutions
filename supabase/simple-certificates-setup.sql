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
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint simple_certificate_dates check (end_date >= start_date)
);

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
