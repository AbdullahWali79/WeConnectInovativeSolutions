create table if not exists public.project_submission_settings (
  id boolean primary key default true check (id),
  shared_folder_enabled boolean not null default false,
  shared_folder_url text,
  shared_folder_instructions text,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id) on delete set null
);

insert into public.project_submission_settings (id) values (true) on conflict (id) do nothing;
alter table public.project_submission_settings enable row level security;
revoke all on public.project_submission_settings from anon, authenticated;

-- Start with the requested simple shared-folder/manual workflow. The shared
-- folder becomes active after admin saves a valid folder link.
update public.google_drive_settings set enabled = false where id = true;
update public.google_form_project_settings set enabled = false where id = true;

