create table if not exists public.google_drive_settings (
  id boolean primary key default true check (id),
  refresh_token_encrypted text,
  account_email text,
  folder_id text,
  folder_name text,
  enabled boolean not null default false,
  max_image_mb integer not null default 15 check (max_image_mb between 1 and 100),
  max_video_mb integer not null default 500 check (max_video_mb between 1 and 5000),
  connected_at timestamptz,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id) on delete set null
);

insert into public.google_drive_settings (id) values (true) on conflict (id) do nothing;
alter table public.google_drive_settings enable row level security;
revoke all on public.google_drive_settings from anon, authenticated;

