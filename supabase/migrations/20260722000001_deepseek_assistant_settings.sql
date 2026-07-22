create table if not exists public.deepseek_assistant_settings (
  id boolean primary key default true check (id = true),
  api_key text,
  model text not null default 'deepseek-v4-flash',
  enabled boolean not null default false,
  system_instructions text,
  validation_status text not null default 'not_tested' check (validation_status in ('not_tested','active','invalid','error')),
  last_error text,
  last_checked_at timestamptz,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.deepseek_assistant_settings (id) values (true) on conflict (id) do nothing;

alter table public.deepseek_assistant_settings enable row level security;
revoke all on public.deepseek_assistant_settings from anon, authenticated;

drop policy if exists "Service role manages DeepSeek assistant settings" on public.deepseek_assistant_settings;
create policy "Service role manages DeepSeek assistant settings" on public.deepseek_assistant_settings
  for all to service_role using (true) with check (true);

grant all on public.deepseek_assistant_settings to service_role;
