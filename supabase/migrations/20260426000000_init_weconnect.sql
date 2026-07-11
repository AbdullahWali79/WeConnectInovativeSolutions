create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text unique,
  phone text,
  github_url text,
  weak_areas text,
  next_focus text,
  follow_up_date date,
  role text check (role in ('admin','student')) default 'student',
  status text check (status in ('pending','approved','rejected')) default 'pending',
  created_at timestamptz default now()
);

create table if not exists public.course_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  created_at timestamptz default now()
);

create table if not exists public.courses (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references public.course_categories(id) on delete set null,
  title text not null,
  description text,
  duration text,
  level text,
  status text check (status in ('active','inactive')) default 'active',
  created_at timestamptz default now()
);

create table if not exists public.applications (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text not null,
  phone text not null,
  course_id uuid references public.courses(id) on delete set null,
  message text,
  status text check (status in ('pending','approved','rejected')) default 'pending',
  created_at timestamptz default now()
);

create table if not exists public.enrollments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references public.profiles(id) on delete cascade,
  course_id uuid references public.courses(id) on delete cascade,
  status text check (status in ('active','completed','dropped')) default 'active',
  progress_percentage int default 0,
  final_score numeric default 0,
  target_tasks int default 100,
  completed_at timestamptz,
  created_at timestamptz default now(),
  unique (student_id, course_id)
);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  course_id uuid references public.courses(id) on delete cascade,
  student_id uuid references public.profiles(id) on delete cascade,
  workflow_type text check (workflow_type in ('assigned','daily')) default 'assigned',
  title text not null,
  description text,
  deadline timestamptz,
  max_score numeric default 100,
  status text check (status in ('pending','in_progress','submitted','reviewed','revision_required')) default 'pending',
  created_at timestamptz default now()
);

create table if not exists public.task_resources (
  id uuid primary key default gen_random_uuid(),
  task_id uuid references public.tasks(id) on delete cascade,
  resource_type text check (resource_type in ('video','google_doc','google_sheet','image','github','custom')) default 'custom',
  title text,
  url text not null,
  created_at timestamptz default now()
);

create table if not exists public.submissions (
  id uuid primary key default gen_random_uuid(),
  task_id uuid references public.tasks(id) on delete cascade,
  student_id uuid references public.profiles(id) on delete cascade,
  explanation text,
  github_url text,
  google_doc_url text,
  google_sheet_url text,
  image_url text,
  proof_url text,
  status text check (status in ('submitted','reviewed','revision_required')) default 'submitted',
  score numeric default 0,
  feedback text,
  submitted_at timestamptz default now(),
  reviewed_at timestamptz,
  unique (task_id, student_id)
);

create table if not exists public.progress_reports (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references public.profiles(id) on delete cascade,
  course_id uuid references public.courses(id) on delete cascade,
  total_tasks int default 0,
  completed_tasks int default 0,
  pending_tasks int default 0,
  average_score numeric default 0,
  progress_percentage int default 0,
  target_tasks int default 100,
  updated_at timestamptz default now(),
  unique (student_id, course_id)
);

create table if not exists public.completed_students (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references public.profiles(id) on delete cascade,
  course_id uuid references public.courses(id) on delete cascade,
  final_score numeric default 0,
  progress_percentage int default 100,
  is_public boolean default true,
  completed_at timestamptz default now(),
  unique (student_id, course_id)
);

create index if not exists profiles_email_idx on public.profiles (lower(email));
create index if not exists applications_email_idx on public.applications (lower(email));
create index if not exists applications_status_idx on public.applications (status, created_at desc);
create index if not exists courses_status_idx on public.courses (status);
create index if not exists enrollments_student_idx on public.enrollments (student_id);
create index if not exists tasks_student_idx on public.tasks (student_id, status);
create index if not exists submissions_task_student_idx on public.submissions (task_id, student_id);

create or replace function public.is_admin(user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = user_id and role = 'admin' and status = 'approved'
  );
$$;

create or replace function public.can_request_student_access(target_email text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.applications
    where lower(email) = lower(target_email)
      and status = 'approved'
  )
  or exists (
    select 1
    from public.profiles
    where lower(email) = lower(target_email)
      and role = 'student'
      and status = 'approved'
  );
$$;

create or replace function public.refresh_student_progress(target_student_id uuid, target_course_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  task_total int := 0;
  reviewed_total int := 0;
  pending_total int := 0;
  avg_score numeric := 0;
  progress int := 0;
  target_total int := 100;
begin
  select coalesce(target_tasks, 100) into target_total
  from public.enrollments
  where student_id = target_student_id
    and course_id = target_course_id;

  select count(*) into task_total
  from public.tasks
  where student_id = target_student_id and course_id = target_course_id;

  select count(*) into reviewed_total
  from public.tasks
  where student_id = target_student_id and course_id = target_course_id and status = 'reviewed';

  pending_total := greatest(target_total - reviewed_total, 0);

  select coalesce(round(avg(nullif(s.score, 0))::numeric, 2), 0) into avg_score
  from public.submissions s
  join public.tasks t on t.id = s.task_id
  where s.student_id = target_student_id
    and t.course_id = target_course_id
    and s.status = 'reviewed';

  if task_total > 0 then
    progress := least(100, floor((reviewed_total::numeric / greatest(target_total, 1)::numeric) * 100)::int);
  end if;

  insert into public.progress_reports (
    student_id,
    course_id,
    total_tasks,
    completed_tasks,
    pending_tasks,
    average_score,
    progress_percentage,
    target_tasks,
    updated_at
  ) values (
    target_student_id,
    target_course_id,
    task_total,
    reviewed_total,
    pending_total,
    avg_score,
    progress,
    coalesce(target_total, 100),
    now()
  )
  on conflict (student_id, course_id) do update set
    total_tasks = excluded.total_tasks,
    completed_tasks = excluded.completed_tasks,
    pending_tasks = excluded.pending_tasks,
    average_score = excluded.average_score,
    progress_percentage = excluded.progress_percentage,
    target_tasks = excluded.target_tasks,
    updated_at = now();

  update public.enrollments
  set progress_percentage = progress,
      final_score = avg_score
  where student_id = target_student_id
    and course_id = target_course_id
    and status <> 'completed';
end;
$$;

create or replace function public.handle_task_progress_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    perform public.refresh_student_progress(old.student_id, old.course_id);
    return old;
  end if;

  perform public.refresh_student_progress(new.student_id, new.course_id);
  return new;
end;
$$;

create or replace trigger tasks_refresh_progress
  after insert or update or delete on public.tasks
  for each row execute function public.handle_task_progress_change();

create or replace function public.handle_enrollment_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    perform public.refresh_student_progress(old.student_id, old.course_id);
    return old;
  end if;

  perform public.refresh_student_progress(new.student_id, new.course_id);
  return new;
end;
$$;

drop trigger if exists enrollments_refresh_progress on public.enrollments;
create trigger enrollments_refresh_progress
  after insert or update or delete on public.enrollments
  for each row execute function public.handle_enrollment_change();

create or replace function public.handle_submission_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target_course_id uuid;
begin
  if tg_op = 'DELETE' then
    select course_id into target_course_id from public.tasks where id = old.task_id;
    if target_course_id is not null then
      update public.tasks set status = 'pending' where id = old.task_id;
      perform public.refresh_student_progress(old.student_id, target_course_id);
    end if;
    return old;
  end if;

  select course_id into target_course_id from public.tasks where id = new.task_id;

  if target_course_id is not null then
    update public.tasks
    set status = new.status
    where id = new.task_id;

    perform public.refresh_student_progress(new.student_id, target_course_id);
  end if;

  return new;
end;
$$;

create or replace trigger submissions_sync_task_status
  after insert or update or delete on public.submissions
  for each row execute function public.handle_submission_change();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  matched_application public.applications%rowtype;
  resolved_status text := 'pending';
begin
  select * into matched_application
  from public.applications
  where lower(email) = lower(new.email)
    and status = 'approved'
  order by created_at desc
  limit 1;

  if matched_application.id is not null then
    resolved_status := 'approved';
  end if;

  insert into public.profiles (id, full_name, email, phone, role, status)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', matched_application.full_name, split_part(new.email, '@', 1)),
    new.email,
    coalesce(new.raw_user_meta_data ->> 'phone', matched_application.phone),
    'student',
    resolved_status
  )
  on conflict (id) do update set
    full_name = coalesce(excluded.full_name, public.profiles.full_name),
    email = coalesce(excluded.email, public.profiles.email),
    phone = coalesce(excluded.phone, public.profiles.phone),
    status = case
      when public.profiles.role = 'admin' then public.profiles.status
      when matched_application.id is not null then 'approved'
      else public.profiles.status
    end;

  if matched_application.id is not null and matched_application.course_id is not null then
    insert into public.enrollments (student_id, course_id, status)
    values (new.id, matched_application.course_id, 'active')
    on conflict (student_id, course_id) do nothing;

    perform public.refresh_student_progress(new.id, matched_application.course_id);
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.approve_application(application_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target_application public.applications%rowtype;
  target_profile public.profiles%rowtype;
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'Only approved admins can approve applications';
  end if;

  update public.applications
  set status = 'approved'
  where id = application_id
  returning * into target_application;

  if target_application.id is null then
    raise exception 'Application not found';
  end if;

  select * into target_profile
  from public.profiles
  where lower(email) = lower(target_application.email)
  limit 1;

  if target_profile.id is not null then
    update public.profiles
    set status = 'approved',
        full_name = coalesce(public.profiles.full_name, target_application.full_name),
        phone = coalesce(public.profiles.phone, target_application.phone)
    where id = target_profile.id;

    if target_application.course_id is not null then
      insert into public.enrollments (student_id, course_id, status)
      values (target_profile.id, target_application.course_id, 'active')
      on conflict (student_id, course_id) do update set status = 'active';

      perform public.refresh_student_progress(target_profile.id, target_application.course_id);
    end if;
  end if;
end;
$$;

create or replace function public.reject_application(application_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target_application public.applications%rowtype;
  target_profile public.profiles%rowtype;
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'Only approved admins can reject applications';
  end if;

  update public.applications
  set status = 'rejected'
  where id = application_id
  returning * into target_application;

  if target_application.id is null then
    raise exception 'Application not found';
  end if;

  select * into target_profile
  from public.profiles
  where lower(email) = lower(target_application.email)
    and role = 'student'
  limit 1;

  if target_profile.id is not null then
    update public.profiles
    set status = 'rejected'
    where id = target_profile.id;

    if target_application.course_id is not null then
      update public.enrollments
      set status = 'dropped',
          completed_at = null
      where student_id = target_profile.id
        and course_id = target_application.course_id;

      delete from public.completed_students
      where student_id = target_profile.id
        and course_id = target_application.course_id;
    end if;
  end if;
end;
$$;

create or replace function public.mark_course_completed(target_student_id uuid, target_course_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  report public.progress_reports%rowtype;
  completion_score numeric := 0;
  completion_progress int := 100;
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'Only approved admins can complete courses';
  end if;

  perform public.refresh_student_progress(target_student_id, target_course_id);

  select * into report
  from public.progress_reports
  where student_id = target_student_id and course_id = target_course_id;

  completion_score := coalesce(report.average_score, 0);
  completion_progress := greatest(coalesce(report.progress_percentage, 0), 100);

  update public.enrollments
  set status = 'completed',
      progress_percentage = completion_progress,
      final_score = completion_score,
      completed_at = now()
  where student_id = target_student_id
    and course_id = target_course_id;

  insert into public.completed_students (student_id, course_id, final_score, progress_percentage, is_public, completed_at)
  values (target_student_id, target_course_id, completion_score, completion_progress, true, now())
  on conflict (student_id, course_id) do update set
    final_score = excluded.final_score,
    progress_percentage = excluded.progress_percentage,
    is_public = true,
    completed_at = now();
end;
$$;

create or replace function public.submit_task(
  target_task_id uuid,
  submission_explanation text,
  submission_github_url text default null,
  submission_google_doc_url text default null,
  submission_google_sheet_url text default null,
  submission_image_url text default null,
  submission_proof_url text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target_task public.tasks%rowtype;
  existing_submission public.submissions%rowtype;
begin
  select * into target_task
  from public.tasks
  where id = target_task_id
    and student_id = auth.uid();

  if target_task.id is null then
    raise exception 'Task not found for current student';
  end if;

  select * into existing_submission
  from public.submissions
  where task_id = target_task_id
    and student_id = auth.uid();

  if existing_submission.id is not null and existing_submission.status <> 'revision_required' then
    raise exception 'This task already has a submission under review or reviewed';
  end if;

  insert into public.submissions (
    task_id,
    student_id,
    explanation,
    github_url,
    google_doc_url,
    google_sheet_url,
    image_url,
    proof_url,
    status,
    score,
    feedback,
    submitted_at,
    reviewed_at
  ) values (
    target_task_id,
    auth.uid(),
    submission_explanation,
    submission_github_url,
    submission_google_doc_url,
    submission_google_sheet_url,
    submission_image_url,
    submission_proof_url,
    'submitted',
    0,
    null,
    now(),
    null
  )
  on conflict (task_id, student_id) do update set
    explanation = excluded.explanation,
    github_url = excluded.github_url,
    google_doc_url = excluded.google_doc_url,
    google_sheet_url = excluded.google_sheet_url,
    image_url = excluded.image_url,
    proof_url = excluded.proof_url,
    status = 'submitted',
    score = 0,
    feedback = null,
    submitted_at = now(),
    reviewed_at = null;
end;
$$;

create or replace view public.completed_student_showcase as
select
  cs.id,
  cs.student_id,
  cs.course_id,
  p.full_name as student_name,
  c.title as course_name,
  cs.final_score,
  cs.progress_percentage,
  cs.completed_at
from public.completed_students cs
join public.profiles p on p.id = cs.student_id
join public.courses c on c.id = cs.course_id
where cs.is_public = true;

alter table public.profiles enable row level security;
alter table public.course_categories enable row level security;
alter table public.courses enable row level security;
alter table public.applications enable row level security;
alter table public.enrollments enable row level security;
alter table public.tasks enable row level security;
alter table public.task_resources enable row level security;
alter table public.submissions enable row level security;
alter table public.progress_reports enable row level security;
alter table public.completed_students enable row level security;

drop policy if exists "Profiles are readable by owner or admin" on public.profiles;
drop policy if exists "Admins can write profiles" on public.profiles;
drop policy if exists "Public can read course categories" on public.course_categories;
drop policy if exists "Admins can manage course categories" on public.course_categories;
drop policy if exists "Public can read active courses" on public.courses;
drop policy if exists "Admins can manage courses" on public.courses;
drop policy if exists "Public can submit applications" on public.applications;
drop policy if exists "Admins can manage applications" on public.applications;
drop policy if exists "Students can read own enrollments" on public.enrollments;
drop policy if exists "Admins can manage enrollments" on public.enrollments;
drop policy if exists "Students can read own tasks" on public.tasks;
drop policy if exists "Admins can manage tasks" on public.tasks;
drop policy if exists "Students can read resources for own tasks" on public.task_resources;
drop policy if exists "Admins can manage task resources" on public.task_resources;
drop policy if exists "Students can read own submissions" on public.submissions;
drop policy if exists "Students can insert own clean submissions" on public.submissions;
drop policy if exists "Admins can manage submissions" on public.submissions;
drop policy if exists "Students can read own progress" on public.progress_reports;
drop policy if exists "Admins can manage progress reports" on public.progress_reports;
drop policy if exists "Public can read public completed students" on public.completed_students;
drop policy if exists "Admins can manage completed students" on public.completed_students;

create policy "Profiles are readable by owner or admin" on public.profiles
  for select using (id = auth.uid() or public.is_admin(auth.uid()));

create policy "Admins can write profiles" on public.profiles
  for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

create policy "Public can read course categories" on public.course_categories
  for select using (true);

create policy "Admins can manage course categories" on public.course_categories
  for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

create policy "Public can read active courses" on public.courses
  for select using (status = 'active' or public.is_admin(auth.uid()));

create policy "Admins can manage courses" on public.courses
  for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

create policy "Public can submit applications" on public.applications
  for insert with check (status = 'pending');

create policy "Admins can manage applications" on public.applications
  for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

create policy "Students can read own enrollments" on public.enrollments
  for select using (student_id = auth.uid() or public.is_admin(auth.uid()));

create policy "Admins can manage enrollments" on public.enrollments
  for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

create policy "Students can read own tasks" on public.tasks
  for select using (student_id = auth.uid() or public.is_admin(auth.uid()));

create policy "Admins can manage tasks" on public.tasks
  for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

create policy "Students can read resources for own tasks" on public.task_resources
  for select using (
    public.is_admin(auth.uid())
    or exists (
      select 1 from public.tasks t
      where t.id = task_id and t.student_id = auth.uid()
    )
  );

create policy "Admins can manage task resources" on public.task_resources
  for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

create policy "Students can read own submissions" on public.submissions
  for select using (student_id = auth.uid() or public.is_admin(auth.uid()));

create policy "Students can insert own clean submissions" on public.submissions
  for insert with check (
    student_id = auth.uid()
    and status = 'submitted'
    and coalesce(score, 0) = 0
    and feedback is null
    and reviewed_at is null
    and exists (
      select 1 from public.tasks t
      where t.id = task_id and t.student_id = auth.uid()
    )
  );

create policy "Admins can manage submissions" on public.submissions
  for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

create policy "Students can read own progress" on public.progress_reports
  for select using (student_id = auth.uid() or public.is_admin(auth.uid()));

create policy "Admins can manage progress reports" on public.progress_reports
  for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

create policy "Public can read public completed students" on public.completed_students
  for select using (is_public = true or public.is_admin(auth.uid()) or student_id = auth.uid());

create policy "Admins can manage completed students" on public.completed_students
  for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  message text not null,
  priority text check (priority in ('low','normal','high','urgent')) default 'normal',
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

drop policy if exists "Anyone can read active announcements" on public.announcements;
drop policy if exists "Admins can manage announcements" on public.announcements;

create policy "Anyone can read active announcements" on public.announcements
  for select using (is_active = true or public.is_admin(auth.uid()));

create policy "Admins can manage announcements" on public.announcements
  for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

create table if not exists public.promotional_popups (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  message text not null,
  image_url text,
  show_on text check (show_on in ('landing','student','both')) default 'both',
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

drop policy if exists "Public can read active promotional popups" on public.promotional_popups;
drop policy if exists "Admins can manage promotional popups" on public.promotional_popups;

create policy "Public can read active promotional popups" on public.promotional_popups
  for select using (is_active = true or public.is_admin(auth.uid()));

create policy "Admins can manage promotional popups" on public.promotional_popups
  for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

grant usage on schema public to anon, authenticated;
grant select on public.completed_student_showcase to anon, authenticated;
grant execute on function public.approve_application(uuid) to authenticated;
grant execute on function public.can_request_student_access(text) to anon, authenticated;
grant execute on function public.reject_application(uuid) to authenticated;
grant execute on function public.mark_course_completed(uuid, uuid) to authenticated;
grant execute on function public.refresh_student_progress(uuid, uuid) to authenticated;
grant execute on function public.submit_task(uuid, text, text, text, text, text, text) to authenticated;
