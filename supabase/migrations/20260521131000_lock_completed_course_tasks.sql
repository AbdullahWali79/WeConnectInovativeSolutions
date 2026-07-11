create or replace function public.prevent_locked_course_task_changes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  enrollment_status text;
begin
  select status into enrollment_status
  from public.enrollments
  where student_id = new.student_id
    and course_id = new.course_id;

  if enrollment_status = 'completed' then
    raise exception 'This course enrollment is completed and locked';
  end if;

  return new;
end;
$$;

drop trigger if exists prevent_locked_course_task_changes on public.tasks;
create trigger prevent_locked_course_task_changes
  before insert or update on public.tasks
  for each row execute function public.prevent_locked_course_task_changes();

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
