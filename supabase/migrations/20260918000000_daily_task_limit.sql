alter table public.profiles add column daily_task_limit integer default 5;

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
  student_daily_limit integer;
  today_submissions integer;
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

  if existing_submission.id is null then
    select coalesce(daily_task_limit, 5) into student_daily_limit
    from public.profiles
    where id = auth.uid();

    select count(*) into today_submissions
    from public.submissions
    where student_id = auth.uid()
      and date(submitted_at at time zone 'utc') = date(now() at time zone 'utc');

    if today_submissions >= student_daily_limit then
      raise exception 'You have reached your daily limit of % task submissions. Please try again tomorrow.', student_daily_limit;
    end if;
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
