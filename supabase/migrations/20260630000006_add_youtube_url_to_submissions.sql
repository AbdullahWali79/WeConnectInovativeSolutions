alter table public.submissions
  add column if not exists youtube_url text;

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
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target_task public.tasks%rowtype;
  existing_submission public.submissions%rowtype;
  target_enrollment public.enrollments%rowtype;
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
    reviewed_at = null;
end;
$$;

create or replace function public.submit_student_task(
  target_course_id uuid,
  task_title text,
  task_description text default null,
  submission_explanation text default null,
  submission_github_url text default null,
  submission_google_doc_url text default null,
  submission_google_sheet_url text default null,
  submission_image_url text default null,
  submission_youtube_url text default null,
  submission_proof_url text default null,
  submission_proof_links jsonb default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  target_enrollment public.enrollments%rowtype;
  created_task public.tasks%rowtype;
  proof_links_value jsonb := coalesce(submission_proof_links, '[]'::jsonb);
begin
  if coalesce(trim(task_title), '') = '' then
    raise exception 'Task title is required';
  end if;

  if submission_proof_url is null and jsonb_array_length(proof_links_value) = 0 then
    raise exception 'At least one proof link is required';
  end if;

  select *
  into target_enrollment
  from public.enrollments
  where student_id = auth.uid()
    and course_id = target_course_id
    and status = 'active'
  limit 1;

  if target_enrollment.id is null then
    raise exception 'Active course enrollment not found';
  end if;

  insert into public.tasks (
    course_id,
    student_id,
    title,
    description,
    max_score,
    status
  ) values (
    target_course_id,
    auth.uid(),
    trim(task_title),
    nullif(trim(task_description), ''),
    100,
    'submitted'
  )
  returning * into created_task;

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
    proof_links,
    status,
    score,
    feedback,
    submitted_at,
    reviewed_at
  ) values (
    created_task.id,
    auth.uid(),
    nullif(trim(submission_explanation), ''),
    nullif(trim(submission_github_url), ''),
    nullif(trim(submission_google_doc_url), ''),
    nullif(trim(submission_google_sheet_url), ''),
    nullif(trim(submission_image_url), ''),
    nullif(trim(submission_youtube_url), ''),
    nullif(trim(submission_proof_url), ''),
    proof_links_value,
    'submitted',
    0,
    null,
    now(),
    null
  );

  return created_task.id;
end;
$$;

grant execute on function public.submit_task(uuid, text, text, text, text, text, text, text) to authenticated;
grant execute on function public.submit_student_task(uuid, text, text, text, text, text, text, text, text, text, jsonb) to authenticated;
