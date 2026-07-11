-- Create migration for submission screenshots and task editing RPC

-- 1. Create table public.submission_screenshots
create table if not exists public.submission_screenshots (
  id uuid primary key default gen_random_uuid(),
  task_submission_id uuid not null references public.submissions(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  task_id uuid not null references public.tasks(id) on delete cascade,
  github_url text not null,
  cdn_url text not null,
  original_filename text not null,
  file_size bigint not null,
  mime_type text not null,
  created_at timestamptz not null default now()
);

-- Enable RLS
alter table public.submission_screenshots enable row level security;

-- Drop existing policies if any
drop policy if exists "Students can view their own screenshots" on public.submission_screenshots;
drop policy if exists "Students can insert their own screenshots" on public.submission_screenshots;
drop policy if exists "Students can delete their own screenshots" on public.submission_screenshots;
drop policy if exists "Admins and teachers can view all screenshots" on public.submission_screenshots;
drop policy if exists "Admins and teachers can manage screenshots" on public.submission_screenshots;

-- Policies for students
create policy "Students can view their own screenshots"
  on public.submission_screenshots for select
  using (auth.uid() = student_id);

create policy "Students can insert their own screenshots"
  on public.submission_screenshots for insert
  with check (auth.uid() = student_id);

create policy "Students can delete their own screenshots"
  on public.submission_screenshots for delete
  using (auth.uid() = student_id);

-- Policies for admins/teachers
create policy "Admins and teachers can view all screenshots"
  on public.submission_screenshots for select
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('admin', 'teacher')
    )
  );

create policy "Admins and teachers can manage screenshots"
  on public.submission_screenshots for all
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('admin', 'teacher')
    )
  );

-- 2. Modify public.submit_task to return uuid (the submission id)
drop function if exists public.submit_task(uuid, text, text, text, text, text, text, text);

create or replace function public.submit_task(
  target_task_id uuid,
  submission_explanation text,
  submission_github_url text default null,
  submission_google_doc_url text default null,
  submission_google_sheet_url text default null,
  submission_image_url text default null,
  submission_youtube_url text default null,
  submission_proof_url text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  target_task public.tasks%rowtype;
  existing_submission public.submissions%rowtype;
  target_enrollment public.enrollments%rowtype;
  inserted_id uuid;
begin
  select * into target_task
  from public.tasks
  where id = target_task_id
    and student_id = auth.uid();

  if target_task.id is null then
    raise exception 'Task not found for current student';
  end if;

  select * into target_enrollment
  from public.enrollments
  where student_id = auth.uid()
    and course_id = target_task.course_id;

  if target_enrollment.status = 'completed' then
    raise exception 'This course is completed and locked';
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
    youtube_url,
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
    nullif(trim(submission_youtube_url), ''),
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
    youtube_url = excluded.youtube_url,
    proof_url = excluded.proof_url,
    status = 'submitted',
    score = 0,
    feedback = null,
    submitted_at = now(),
    reviewed_at = null
  returning id into inserted_id;

  return inserted_id;
end;
$$;

-- 3. Create public.edit_student_task to allow editing unaccepted tasks
create or replace function public.edit_student_task(
  target_task_id uuid,
  new_title text,
  new_description text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target_task public.tasks%rowtype;
begin
  select * into target_task
  from public.tasks
  where id = target_task_id
    and student_id = auth.uid();

  if target_task.id is null then
    raise exception 'Task not found or you are not allowed to edit this task';
  end if;

  if target_task.status = 'reviewed' then
    raise exception 'Accepted tasks cannot be edited.';
  end if;

  update public.tasks
  set title = new_title,
      description = new_description
  where id = target_task_id;
end;
$$;
