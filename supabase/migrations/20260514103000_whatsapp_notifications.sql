create table if not exists public.admin_notification_settings (
  id uuid primary key default gen_random_uuid(),
  admin_user_id uuid references public.profiles(id) on delete cascade,
  whatsapp_number text not null default '923270728950',
  registration_alert_enabled boolean not null default true,
  pending_task_alert_enabled boolean not null default false,
  pending_task_alert_time time not null default '19:00:00',
  pending_task_alert_timezone text not null default 'Asia/Karachi',
  pending_task_alert_frequency text not null default 'daily',
  last_pending_task_alert_sent_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_admin_notification_settings_admin_user
  on public.admin_notification_settings(admin_user_id);

create table if not exists public.whatsapp_notification_logs (
  id uuid primary key default gen_random_uuid(),
  recipient_number text not null,
  alert_type text not null,
  template_name text,
  message_body text,
  status text not null default 'queued' check (status in ('queued', 'sent', 'failed')),
  provider_message_id text,
  error_message text,
  sent_at timestamptz,
  created_at timestamptz default now()
);

create index if not exists idx_whatsapp_notification_logs_alert_type
  on public.whatsapp_notification_logs(alert_type);

create index if not exists idx_whatsapp_notification_logs_created_at
  on public.whatsapp_notification_logs(created_at desc);

create or replace function public.set_admin_notification_settings_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists admin_notification_settings_updated_at on public.admin_notification_settings;
create trigger admin_notification_settings_updated_at
  before update on public.admin_notification_settings
  for each row execute function public.set_admin_notification_settings_updated_at();

alter table public.admin_notification_settings enable row level security;
alter table public.whatsapp_notification_logs enable row level security;

drop policy if exists "Admins can manage whatsapp notification settings" on public.admin_notification_settings;
drop policy if exists "Admins can read whatsapp notification logs" on public.whatsapp_notification_logs;
drop policy if exists "Admins can insert whatsapp notification logs" on public.whatsapp_notification_logs;

create policy "Admins can manage whatsapp notification settings" on public.admin_notification_settings
  for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

create policy "Admins can read whatsapp notification logs" on public.whatsapp_notification_logs
  for select using (public.is_admin(auth.uid()));

create policy "Admins can insert whatsapp notification logs" on public.whatsapp_notification_logs
  for insert with check (public.is_admin(auth.uid()));

grant select, insert, update, delete on public.admin_notification_settings to authenticated;
grant select, insert on public.whatsapp_notification_logs to authenticated;
