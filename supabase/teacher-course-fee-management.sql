-- Teacher course scoping + monthly fee management
-- Paste this complete script into Supabase SQL Editor and run once.

alter table public.profiles
  add column if not exists is_fee_blocked boolean not null default false,
  add column if not exists fee_block_reason text,
  add column if not exists fee_blocked_at timestamptz;

create table if not exists public.teacher_course_assignments (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.profiles(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  assigned_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (teacher_id, course_id)
);

create table if not exists public.student_fee_records (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  enrollment_id uuid references public.enrollments(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  month_key text not null check (month_key ~ '^[0-9]{4}-[0-9]{2}$'),
  amount_due numeric(12,2) not null default 0,
  amount_paid numeric(12,2) not null default 0,
  due_date date,
  paid_at date,
  status text not null default 'pending' check (status in ('pending','paid','partial','overdue','waived')),
  payment_method text,
  notes text,
  blocked boolean not null default false,
  blocked_reason text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (student_id, course_id, month_key)
);

create or replace function public.set_student_fee_records_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_student_fee_records_updated_at on public.student_fee_records;
create trigger trg_student_fee_records_updated_at
  before update on public.student_fee_records
  for each row execute function public.set_student_fee_records_updated_at();

create or replace function public.teacher_has_course_access(target_teacher_id uuid, target_course_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    join public.teacher_course_assignments tca on tca.teacher_id = p.id
    where p.id = target_teacher_id
      and p.role = 'teacher'
      and p.status = 'approved'
      and tca.course_id = target_course_id
  );
$$;

alter table public.teacher_course_assignments enable row level security;
alter table public.student_fee_records enable row level security;

drop policy if exists "Admins manage teacher course assignments" on public.teacher_course_assignments;
drop policy if exists "Teachers read own course assignments" on public.teacher_course_assignments;

create policy "Admins manage teacher course assignments" on public.teacher_course_assignments
  for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

create policy "Teachers read own course assignments" on public.teacher_course_assignments
  for select using (teacher_id = auth.uid() or public.is_admin(auth.uid()));

drop policy if exists "Admins manage student fee records" on public.student_fee_records;
drop policy if exists "Students read own fee records" on public.student_fee_records;

create policy "Admins manage student fee records" on public.student_fee_records
  for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

create policy "Students read own fee records" on public.student_fee_records
  for select using (student_id = auth.uid() or public.is_admin(auth.uid()));

-- Replace broad teacher policies with course-scoped teacher policies.
drop policy if exists "Permitted users can read applications" on public.applications;
create policy "Permitted users can read applications" on public.applications
  for select using (
    public.is_admin(auth.uid())
    or (
      public.has_permission(auth.uid(), 'applications.view')
      and course_id is not null
      and public.teacher_has_course_access(auth.uid(), course_id)
    )
  );

drop policy if exists "Permitted users can update application status" on public.applications;
create policy "Permitted users can update application status" on public.applications
  for update using (
    public.is_admin(auth.uid())
    or (
      public.has_permission(auth.uid(), 'applications.approve')
      and course_id is not null
      and public.teacher_has_course_access(auth.uid(), course_id)
    )
  ) with check (
    public.is_admin(auth.uid())
    or (
      public.has_permission(auth.uid(), 'applications.approve')
      and course_id is not null
      and public.teacher_has_course_access(auth.uid(), course_id)
    )
  );

drop policy if exists "Students or permitted users can read enrollments" on public.enrollments;
create policy "Students or permitted users can read enrollments" on public.enrollments
  for select using (
    student_id = auth.uid()
    or public.is_admin(auth.uid())
    or (
      public.has_any_permission(auth.uid(), array['dashboard.view','students.view','tasks.view','progress.view'])
      and public.teacher_has_course_access(auth.uid(), course_id)
    )
  );

drop policy if exists "Students or permitted users can read tasks" on public.tasks;
create policy "Students or permitted users can read tasks" on public.tasks
  for select using (
    student_id = auth.uid()
    or public.is_admin(auth.uid())
    or (
      public.has_any_permission(auth.uid(), array['dashboard.view','students.view','tasks.view','submissions.view','progress.view'])
      and public.teacher_has_course_access(auth.uid(), course_id)
    )
  );

drop policy if exists "Permitted users can create tasks" on public.tasks;
create policy "Permitted users can create tasks" on public.tasks
  for insert with check (
    public.is_admin(auth.uid())
    or (
      public.has_permission(auth.uid(), 'tasks.create')
      and public.teacher_has_course_access(auth.uid(), course_id)
    )
  );

drop policy if exists "Permitted users can edit tasks" on public.tasks;
create policy "Permitted users can edit tasks" on public.tasks
  for update using (
    public.is_admin(auth.uid())
    or (
      public.has_permission(auth.uid(), 'tasks.edit')
      and public.teacher_has_course_access(auth.uid(), course_id)
    )
  ) with check (
    public.is_admin(auth.uid())
    or (
      public.has_permission(auth.uid(), 'tasks.edit')
      and public.teacher_has_course_access(auth.uid(), course_id)
    )
  );

drop policy if exists "Permitted users can delete tasks" on public.tasks;
create policy "Permitted users can delete tasks" on public.tasks
  for delete using (
    public.is_admin(auth.uid())
    or (
      public.has_permission(auth.uid(), 'tasks.delete')
      and public.teacher_has_course_access(auth.uid(), course_id)
    )
  );

drop policy if exists "Students or permitted users can read task resources" on public.task_resources;
create policy "Students or permitted users can read task resources" on public.task_resources
  for select using (
    public.is_admin(auth.uid())
    or exists (select 1 from public.tasks t where t.id = task_id and t.student_id = auth.uid())
    or exists (
      select 1 from public.tasks t
      where t.id = task_id
        and public.has_permission(auth.uid(), 'tasks.view')
        and public.teacher_has_course_access(auth.uid(), t.course_id)
    )
  );

drop policy if exists "Permitted users can create task resources" on public.task_resources;
create policy "Permitted users can create task resources" on public.task_resources
  for insert with check (
    public.is_admin(auth.uid())
    or exists (
      select 1 from public.tasks t
      where t.id = task_id
        and public.has_permission(auth.uid(), 'tasks.create')
        and public.teacher_has_course_access(auth.uid(), t.course_id)
    )
  );

drop policy if exists "Students or permitted users can read submissions" on public.submissions;
create policy "Students or permitted users can read submissions" on public.submissions
  for select using (
    student_id = auth.uid()
    or public.is_admin(auth.uid())
    or exists (
      select 1 from public.tasks t
      where t.id = task_id
        and public.has_any_permission(auth.uid(), array['dashboard.view','submissions.view','progress.view'])
        and public.teacher_has_course_access(auth.uid(), t.course_id)
    )
  );

drop policy if exists "Permitted users can grade submissions" on public.submissions;
create policy "Permitted users can grade submissions" on public.submissions
  for update using (
    public.is_admin(auth.uid())
    or exists (
      select 1 from public.tasks t
      where t.id = task_id
        and public.has_permission(auth.uid(), 'submissions.grade')
        and public.teacher_has_course_access(auth.uid(), t.course_id)
    )
  ) with check (
    public.is_admin(auth.uid())
    or exists (
      select 1 from public.tasks t
      where t.id = task_id
        and public.has_permission(auth.uid(), 'submissions.grade')
        and public.teacher_has_course_access(auth.uid(), t.course_id)
    )
  );

drop policy if exists "Students or permitted users can read progress reports" on public.progress_reports;
create policy "Students or permitted users can read progress reports" on public.progress_reports
  for select using (
    student_id = auth.uid()
    or public.is_admin(auth.uid())
    or (
      public.has_any_permission(auth.uid(), array['dashboard.view','students.view','progress.view'])
      and public.teacher_has_course_access(auth.uid(), course_id)
    )
  );

-- Prevent blocked students from submitting new task work.
create or replace function public.submit_task(
  target_task_id uuid,
  submission_explanation text default null,
  submission_github_url text default null,
  submission_google_doc_url text default null,
  submission_google_sheet_url text default null,
  submission_image_url text default null,
  submission_proof_url text default null
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target_task public.tasks%rowtype;
  target_enrollment public.enrollments%rowtype;
  blocked_student boolean;
begin
  select * into target_task from public.tasks where id = target_task_id;
  if target_task.id is null then
    raise exception 'Task not found';
  end if;

  if target_task.student_id <> auth.uid() then
    raise exception 'You can submit only your own task.';
  end if;

  select coalesce(is_fee_blocked, false) into blocked_student
  from public.profiles
  where id = auth.uid();

  if coalesce(blocked_student, false) then
    raise exception 'Your student access is temporarily blocked. Please contact admin.';
  end if;

  select * into target_enrollment
  from public.enrollments
  where student_id = target_task.student_id
    and course_id = target_task.course_id
  order by created_at desc
  limit 1;

  if target_enrollment.id is null then
    raise exception 'Enrollment not found.';
  end if;

  if target_enrollment.status <> 'active' then
    raise exception 'This course is locked after completion.';
  end if;

  insert into public.submissions (
    task_id, student_id, explanation, github_url, google_doc_url,
    google_sheet_url, image_url, proof_url, status, score, feedback,
    submitted_at, reviewed_at
  ) values (
    target_task_id, auth.uid(), submission_explanation, submission_github_url,
    submission_google_doc_url, submission_google_sheet_url, submission_image_url,
    submission_proof_url, 'submitted', 0, null, now(), null
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

  update public.tasks set status = 'submitted' where id = target_task_id;
end;
$$;

grant select, insert, update, delete on public.teacher_course_assignments to authenticated, service_role;
grant select, insert, update, delete on public.student_fee_records to authenticated, service_role;
grant execute on function public.teacher_has_course_access(uuid, uuid) to authenticated, service_role;
grant execute on function public.submit_task(uuid, text, text, text, text, text, text) to authenticated, service_role;
