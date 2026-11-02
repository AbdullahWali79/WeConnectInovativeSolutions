-- Social Media Campaigns — student portal
--
-- Adds the student-facing half of the campaign workflow:
--   * every assigned student gets their OWN Drive folder link (already on the
--     member row as drive_url) plus a registration gate they must clear before
--     they can see the plan or submit anything
--   * the admin decides, per student, which campaign menus that student sees
--     (plan / submit / history)
--   * a day is invisible to students until the teacher or admin publishes it,
--     so the plan can be written, edited and reviewed in private first
--   * students submit a video link, the published post URL and image links;
--     the teacher picks the winner and that feeds the day's published URL

-- ---------------------------------------------------------------------------
-- 1. Member registration + per-student menu permissions
-- ---------------------------------------------------------------------------
alter table public.sm_campaign_members
  add column if not exists registration_status text not null default 'pending'
    check (registration_status in ('pending', 'registered', 'approved', 'rejected')),
  add column if not exists registered_at timestamptz,
  add column if not exists approved_at timestamptz,
  add column if not exists approved_by uuid references public.profiles(id) on delete set null,
  add column if not exists registration_note text,
  add column if not exists social_handles jsonb not null default '{}'::jsonb,
  add column if not exists menu_permissions jsonb not null default
    '{"plan": true, "submit": true, "history": true}'::jsonb;

-- Existing assignments predate the gate; treat them as already registered but
-- still awaiting admin approval so nothing silently opens up.
update public.sm_campaign_members
   set registration_status = 'registered',
       registered_at = coalesce(registered_at, created_at)
 where registration_status = 'pending'
   and created_at < now();

create index if not exists sm_campaign_members_registration_idx
  on public.sm_campaign_members (campaign_id, registration_status);

-- ---------------------------------------------------------------------------
-- 2. Day visibility — nothing reaches a student until it is published
-- ---------------------------------------------------------------------------
alter table public.sm_campaign_days
  add column if not exists visible_to_students boolean not null default false,
  add column if not exists published_to_students_at timestamptz,
  add column if not exists published_to_students_by uuid references public.profiles(id) on delete set null;

create index if not exists sm_campaign_days_visibility_idx
  on public.sm_campaign_days (campaign_id, visible_to_students, post_date);

-- ---------------------------------------------------------------------------
-- 3. Student submissions — one row per student per day, editable until approved
-- ---------------------------------------------------------------------------
create table if not exists public.sm_day_submissions (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.sm_campaigns(id) on delete cascade,
  day_id uuid not null references public.sm_campaign_days(id) on delete cascade,
  member_id uuid not null references public.sm_campaign_members(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  video_url text,
  post_url text,
  doc_url text,
  image_urls text[] not null default '{}'::text[],
  caption text,
  note text,
  status text not null default 'submitted'
    check (status in ('draft', 'submitted', 'revision', 'approved', 'rejected', 'selected')),
  score integer,
  feedback text,
  is_selected boolean not null default false,
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (day_id, member_id)
);

create index if not exists sm_day_submissions_day_idx on public.sm_day_submissions (day_id);
create index if not exists sm_day_submissions_campaign_idx on public.sm_day_submissions (campaign_id, created_at desc);
create index if not exists sm_day_submissions_member_idx on public.sm_day_submissions (member_id);
create index if not exists sm_day_submissions_student_idx on public.sm_day_submissions (student_id);

drop trigger if exists sm_day_submissions_set_updated_at on public.sm_day_submissions;
create trigger sm_day_submissions_set_updated_at
  before update on public.sm_day_submissions
  for each row execute function public.set_sm_campaigns_updated_at();

-- Only one winner per day.
create unique index if not exists sm_day_submissions_one_winner_idx
  on public.sm_day_submissions (day_id)
  where is_selected;

-- ---------------------------------------------------------------------------
-- 4. RLS
-- ---------------------------------------------------------------------------
alter table public.sm_day_submissions enable row level security;

drop policy if exists "Admins manage day submissions" on public.sm_day_submissions;
create policy "Admins manage day submissions" on public.sm_day_submissions
  for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

drop policy if exists "Teachers read own campaign submissions" on public.sm_day_submissions;
create policy "Teachers read own campaign submissions" on public.sm_day_submissions
  for select using (
    exists (
      select 1 from public.sm_campaigns c
      where c.id = sm_day_submissions.campaign_id and c.teacher_id = auth.uid()
    )
  );

drop policy if exists "Teachers review own campaign submissions" on public.sm_day_submissions;
create policy "Teachers review own campaign submissions" on public.sm_day_submissions
  for update using (
    exists (
      select 1 from public.sm_campaigns c
      where c.id = sm_day_submissions.campaign_id and c.teacher_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.sm_campaigns c
      where c.id = sm_day_submissions.campaign_id and c.teacher_id = auth.uid()
    )
  );

drop policy if exists "Students read own submissions" on public.sm_day_submissions;
create policy "Students read own submissions" on public.sm_day_submissions
  for select using (student_id = auth.uid());

drop policy if exists "Students insert own submissions" on public.sm_day_submissions;
create policy "Students insert own submissions" on public.sm_day_submissions
  for insert with check (
    student_id = auth.uid()
    and exists (
      select 1 from public.sm_campaign_members m
      join public.sm_campaign_days d on d.id = sm_day_submissions.day_id
      where m.id = sm_day_submissions.member_id
        and m.student_id = auth.uid()
        and m.status = 'active'
        and m.registration_status = 'approved'
        and d.campaign_id = m.campaign_id
        and d.visible_to_students
    )
  );

drop policy if exists "Students update own pending submissions" on public.sm_day_submissions;
create policy "Students update own pending submissions" on public.sm_day_submissions
  for update using (
    student_id = auth.uid() and status in ('draft', 'submitted', 'revision')
  ) with check (
    student_id = auth.uid() and status in ('draft', 'submitted', 'revision')
  );

-- A student must be registered + approved before any day is visible to them.
drop policy if exists "Registered members read published days" on public.sm_campaign_days;
create policy "Registered members read published days" on public.sm_campaign_days
  for select using (
    visible_to_students
    and exists (
      select 1 from public.sm_campaign_members m
      where m.campaign_id = sm_campaign_days.campaign_id
        and m.student_id = auth.uid()
        and m.status = 'active'
        and m.registration_status = 'approved'
    )
  );

grant select, insert, update, delete on public.sm_day_submissions to authenticated;
grant all on public.sm_day_submissions to service_role;

-- ---------------------------------------------------------------------------
-- 5. Per-student student-hub menu overrides
--
-- The student sidebar is currently driven by course-level defaults. Campaign
-- students need their own switches so an admin can give one student nothing but
-- "Campaigns" while another keeps the full hub.
-- ---------------------------------------------------------------------------
create table if not exists public.student_menu_overrides (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  menu_key text not null,
  is_visible boolean not null default true,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (student_id, menu_key)
);

create index if not exists student_menu_overrides_student_idx
  on public.student_menu_overrides (student_id);

alter table public.student_menu_overrides enable row level security;

drop policy if exists "Admins manage student menu overrides" on public.student_menu_overrides;
create policy "Admins manage student menu overrides" on public.student_menu_overrides
  for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

drop policy if exists "Students read own menu overrides" on public.student_menu_overrides;
create policy "Students read own menu overrides" on public.student_menu_overrides
  for select using (student_id = auth.uid());

grant select on public.student_menu_overrides to authenticated;
grant all on public.student_menu_overrides to service_role;
