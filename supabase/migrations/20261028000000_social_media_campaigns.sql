-- Social Media Campaigns
--
-- Turns a client's day-wise posting plan (the "30-Day Calendar" workbook) into a
-- live board the admin and the assigned teacher work from. One campaign holds N
-- day rows; each day row is exactly one row of the client's spreadsheet.
--
-- Approval is deliberately two independent flags: the teacher can mark a day
-- done, and the admin can mark it done. Either one is enough to show "Done",
-- and both actions stay attributable.

create table if not exists public.sm_campaigns (
  id uuid primary key default gen_random_uuid(),
  client_name text not null,
  campaign_name text,
  period_start date,
  period_end date,
  goal text,
  teacher_id uuid references public.profiles(id) on delete set null,
  teacher_drive_url text,
  drive_folder_url text,
  status text not null default 'draft' check (status in ('draft', 'active', 'paused', 'completed')),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.sm_campaign_days (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.sm_campaigns(id) on delete cascade,
  day_number integer not null check (day_number between 1 and 366),
  post_date date,
  theme text,
  goal text,
  research_note text,
  platform_plan text,
  caption text,
  image_headline text,
  x_draft text,
  source_link text,
  reel_script text,
  hashtags text,
  engagement_action text,
  cta text,
  metrics_to_record text,
  published_url text,
  status text not null default 'not_started'
    check (status in ('not_started', 'in_progress', 'submitted', 'approved', 'published', 'missed')),
  teacher_status text not null default 'pending' check (teacher_status in ('pending', 'done')),
  admin_status text not null default 'pending' check (admin_status in ('pending', 'done')),
  teacher_action_by uuid references public.profiles(id) on delete set null,
  teacher_action_at timestamptz,
  admin_action_by uuid references public.profiles(id) on delete set null,
  admin_action_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (campaign_id, day_number)
);

create table if not exists public.sm_campaign_members (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.sm_campaigns(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  drive_url text,
  status text not null default 'active' check (status in ('active', 'paused', 'removed')),
  assigned_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (campaign_id, student_id)
);

create index if not exists sm_campaigns_teacher_idx on public.sm_campaigns (teacher_id);
create index if not exists sm_campaigns_status_idx on public.sm_campaigns (status, created_at desc);
create index if not exists sm_campaign_days_campaign_idx on public.sm_campaign_days (campaign_id, day_number);
create index if not exists sm_campaign_days_date_idx on public.sm_campaign_days (post_date);
create index if not exists sm_campaign_members_campaign_idx on public.sm_campaign_members (campaign_id);
create index if not exists sm_campaign_members_student_idx on public.sm_campaign_members (student_id);

create or replace function public.set_sm_campaigns_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists sm_campaigns_set_updated_at on public.sm_campaigns;
create trigger sm_campaigns_set_updated_at
  before update on public.sm_campaigns
  for each row execute function public.set_sm_campaigns_updated_at();

drop trigger if exists sm_campaign_days_set_updated_at on public.sm_campaign_days;
create trigger sm_campaign_days_set_updated_at
  before update on public.sm_campaign_days
  for each row execute function public.set_sm_campaigns_updated_at();

alter table public.sm_campaigns enable row level security;
alter table public.sm_campaign_days enable row level security;
alter table public.sm_campaign_members enable row level security;

-- Campaigns -----------------------------------------------------------------
drop policy if exists "Admins manage campaigns" on public.sm_campaigns;
create policy "Admins manage campaigns" on public.sm_campaigns
  for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

drop policy if exists "Teachers read own campaigns" on public.sm_campaigns;
create policy "Teachers read own campaigns" on public.sm_campaigns
  for select using (teacher_id = auth.uid());

drop policy if exists "Members read joined campaigns" on public.sm_campaigns;
create policy "Members read joined campaigns" on public.sm_campaigns
  for select using (
    exists (
      select 1 from public.sm_campaign_members m
      where m.campaign_id = sm_campaigns.id
        and m.student_id = auth.uid()
        and m.status = 'active'
    )
  );

-- Campaign days -------------------------------------------------------------
drop policy if exists "Admins manage campaign days" on public.sm_campaign_days;
create policy "Admins manage campaign days" on public.sm_campaign_days
  for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

drop policy if exists "Teachers read own campaign days" on public.sm_campaign_days;
create policy "Teachers read own campaign days" on public.sm_campaign_days
  for select using (
    exists (
      select 1 from public.sm_campaigns c
      where c.id = sm_campaign_days.campaign_id and c.teacher_id = auth.uid()
    )
  );

-- Teachers may only touch the two approval/status fields on their own campaigns.
drop policy if exists "Teachers update own campaign day status" on public.sm_campaign_days;
create policy "Teachers update own campaign day status" on public.sm_campaign_days
  for update using (
    exists (
      select 1 from public.sm_campaigns c
      where c.id = sm_campaign_days.campaign_id and c.teacher_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.sm_campaigns c
      where c.id = sm_campaign_days.campaign_id and c.teacher_id = auth.uid()
    )
  );

drop policy if exists "Members read own campaign days" on public.sm_campaign_days;
create policy "Members read own campaign days" on public.sm_campaign_days
  for select using (
    exists (
      select 1 from public.sm_campaign_members m
      where m.campaign_id = sm_campaign_days.campaign_id
        and m.student_id = auth.uid()
        and m.status = 'active'
    )
  );

-- Campaign members ----------------------------------------------------------
drop policy if exists "Admins manage campaign members" on public.sm_campaign_members;
create policy "Admins manage campaign members" on public.sm_campaign_members
  for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

drop policy if exists "Teachers read own campaign members" on public.sm_campaign_members;
create policy "Teachers read own campaign members" on public.sm_campaign_members
  for select using (
    exists (
      select 1 from public.sm_campaigns c
      where c.id = sm_campaign_members.campaign_id and c.teacher_id = auth.uid()
    )
  );

drop policy if exists "Students read own membership" on public.sm_campaign_members;
create policy "Students read own membership" on public.sm_campaign_members
  for select using (student_id = auth.uid());

grant select, insert, update, delete on public.sm_campaigns to authenticated;
grant select, insert, update, delete on public.sm_campaign_days to authenticated;
grant select, insert, update, delete on public.sm_campaign_members to authenticated;
grant all on public.sm_campaigns, public.sm_campaign_days, public.sm_campaign_members to service_role;
