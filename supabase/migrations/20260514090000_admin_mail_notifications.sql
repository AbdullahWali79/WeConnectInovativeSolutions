create table if not exists public.admin_mail_settings (
  id uuid primary key default gen_random_uuid(),
  admin_user_id uuid references public.profiles(id) on delete cascade,
  admin_email text not null default 'atifayyoub582@gmail.com',
  send_registration_alerts boolean not null default true,
  send_daily_pending_summary boolean not null default false,
  daily_summary_time time not null default '16:00:00',
  timezone text not null default 'Asia/Karachi',
  last_daily_summary_sent_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_admin_mail_settings_admin_user
  on public.admin_mail_settings(admin_user_id);

create table if not exists public.email_notification_logs (
  id uuid primary key default gen_random_uuid(),
  email_type text not null,
  recipient_email text not null,
  status text not null default 'sent' check (status in ('sent', 'failed')),
  payload jsonb,
  error_message text,
  sent_at timestamptz default now()
);

create index if not exists idx_email_notification_logs_sent_at
  on public.email_notification_logs(sent_at desc);

create index if not exists idx_email_notification_logs_type
  on public.email_notification_logs(email_type, sent_at desc);

create or replace function public.set_admin_mail_settings_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists admin_mail_settings_updated_at on public.admin_mail_settings;
create trigger admin_mail_settings_updated_at
  before update on public.admin_mail_settings
  for each row execute function public.set_admin_mail_settings_updated_at();

alter table public.admin_mail_settings enable row level security;
alter table public.email_notification_logs enable row level security;

drop policy if exists "Admins can manage mail settings" on public.admin_mail_settings;
drop policy if exists "Admins can read email logs" on public.email_notification_logs;
drop policy if exists "Admins can insert email logs" on public.email_notification_logs;

create policy "Admins can manage mail settings" on public.admin_mail_settings
  for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

create policy "Admins can read email logs" on public.email_notification_logs
  for select using (public.is_admin(auth.uid()));

create policy "Admins can insert email logs" on public.email_notification_logs
  for insert with check (public.is_admin(auth.uid()));

grant select, insert, update, delete on public.admin_mail_settings to authenticated;
grant select, insert on public.email_notification_logs to authenticated;
