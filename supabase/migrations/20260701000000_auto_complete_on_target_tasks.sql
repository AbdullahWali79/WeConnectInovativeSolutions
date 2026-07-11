create or replace function public.refresh_student_progress(target_student_id uuid, target_course_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  task_total int := 0;
  reviewed_total int := 0;
  revision_required_total int := 0;
  pending_total int := 0;
  avg_score numeric := 0;
  progress int := 0;
  target_total int := 100;
  current_status text := 'active';
  current_completed_at timestamptz;
  should_complete boolean := false;
begin
  select
    coalesce(target_tasks, 100),
    coalesce(status, 'active'),
    completed_at
  into target_total, current_status, current_completed_at
  from public.enrollments
  where student_id = target_student_id
    and course_id = target_course_id;

  if not found then
    return;
  end if;

  if target_total is null then
    target_total := 100;
  end if;

  select count(*) into task_total
  from public.tasks
  where student_id = target_student_id and course_id = target_course_id;

  select count(*) into reviewed_total
  from public.tasks
  where student_id = target_student_id and course_id = target_course_id and status = 'reviewed';

  select count(*) into revision_required_total
  from public.tasks
  where student_id = target_student_id and course_id = target_course_id and status = 'revision_required';

  if revision_required_total > 0 then
    pending_total := revision_required_total;
  else
    pending_total := greatest(target_total - reviewed_total, 0);
  end if;

  select coalesce(round(avg(nullif(s.score, 0))::numeric, 2), 0) into avg_score
  from public.submissions s
  join public.tasks t on t.id = s.task_id
  where s.student_id = target_student_id
    and t.course_id = target_course_id
    and s.status = 'reviewed';

  should_complete := target_total > 0 and reviewed_total >= target_total;

  if should_complete then
    progress := 100;
  else
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

  if current_status <> 'dropped' then
    update public.enrollments
    set progress_percentage = progress,
        final_score = avg_score,
        status = case
          when should_complete then 'completed'
          else current_status
        end,
        completed_at = case
          when should_complete then coalesce(current_completed_at, now())
          when current_status = 'completed' then coalesce(current_completed_at, now())
          else null
        end
    where student_id = target_student_id
      and course_id = target_course_id;
  end if;

  if should_complete and current_status <> 'dropped' then
    insert into public.completed_students (student_id, course_id, final_score, progress_percentage, is_public, completed_at)
    values (target_student_id, target_course_id, avg_score, 100, true, coalesce(current_completed_at, now()))
    on conflict (student_id, course_id) do update set
      final_score = excluded.final_score,
      progress_percentage = excluded.progress_percentage,
      completed_at = excluded.completed_at;
  end if;
end;
$$;
