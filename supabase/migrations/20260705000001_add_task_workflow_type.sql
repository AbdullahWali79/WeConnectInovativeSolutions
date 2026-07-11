alter table public.tasks
  add column if not exists workflow_type text default 'assigned';

update public.tasks
set workflow_type = coalesce(workflow_type, 'assigned')
where workflow_type is null;

alter table public.tasks
  alter column workflow_type set default 'assigned';

alter table public.tasks
  alter column workflow_type set not null;

do $$
begin
  alter table public.tasks drop constraint if exists tasks_workflow_type_check;
exception
  when undefined_object then null;
end $$;

alter table public.tasks
  add constraint tasks_workflow_type_check
  check (workflow_type in ('assigned', 'daily'));

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
    workflow_type,
    title,
    description,
    max_score,
    status
  ) values (
    target_course_id,
    auth.uid(),
    'daily',
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

grant execute on function public.submit_student_task(uuid, text, text, text, text, text, text, text, text, text, jsonb) to authenticated;
