create table if not exists public.branding_settings (
  id uuid primary key default gen_random_uuid(),
  scope text not null unique check (scope in ('landing', 'admin', 'student')),
  logo_url text,
  background_color text not null default '#030b1c',
  surface_color text not null default '#ffffff',
  primary_color text not null default '#062b7f',
  secondary_color text not null default '#ffd24a',
  accent_color text not null default '#ffa03a',
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz default now(),
  created_at timestamptz default now()
);

insert into public.branding_settings (scope, logo_url, background_color, surface_color, primary_color, secondary_color, accent_color)
values
  ('landing', null, '#030b1c', '#061a3d', '#062b7f', '#ffd24a', '#ffa03a'),
  ('admin', null, '#f8fafc', '#ffffff', '#0f4c81', '#0ea5a4', '#22c55e'),
  ('student', null, '#f7fbff', '#ffffff', '#1d4ed8', '#14b8a6', '#f59e0b')
on conflict (scope) do update
set
  logo_url = excluded.logo_url,
  background_color = excluded.background_color,
  surface_color = excluded.surface_color,
  primary_color = excluded.primary_color,
  secondary_color = excluded.secondary_color,
  accent_color = excluded.accent_color;

alter table public.branding_settings enable row level security;

drop policy if exists "Public can read branding settings" on public.branding_settings;
drop policy if exists "Admins can manage branding settings" on public.branding_settings;

create policy "Public can read branding settings" on public.branding_settings
  for select using (true);

create policy "Admins can manage branding settings" on public.branding_settings
  for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

insert into storage.buckets (id, name, public)
values ('branding-assets', 'branding-assets', true)
on conflict (id) do nothing;

drop policy if exists "Admins can upload branding assets" on storage.objects;
drop policy if exists "Public can view branding assets" on storage.objects;

create policy "Admins can upload branding assets" on storage.objects
  for all using (bucket_id = 'branding-assets' and public.is_admin(auth.uid()))
  with check (bucket_id = 'branding-assets' and public.is_admin(auth.uid()));

create policy "Public can view branding assets" on storage.objects
  for select using (bucket_id = 'branding-assets');

