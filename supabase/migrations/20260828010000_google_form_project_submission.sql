create table if not exists public.google_form_project_settings (
  id boolean primary key default true check (id),
  enabled boolean not null default false,
  form_url text,
  title text not null default 'Project Submission Form',
  instructions text,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id) on delete set null
);

insert into public.google_form_project_settings (id) values (true) on conflict (id) do nothing;
alter table public.google_form_project_settings enable row level security;
revoke all on public.google_form_project_settings from anon, authenticated;

