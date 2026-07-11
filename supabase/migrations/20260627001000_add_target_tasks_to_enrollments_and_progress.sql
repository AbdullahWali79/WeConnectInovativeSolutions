alter table public.enrollments
add column if not exists target_tasks int default 100;

alter table public.progress_reports
add column if not exists target_tasks int default 100;

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

  if target_total > 0 then
    progress := least(100, floor((reviewed_total::numeric / target_total::numeric) * 100)::int);
  end if;

  update public.enrollments
  set progress_percentage = progress,
      final_score = avg_score,
      target_tasks = coalesce(target_total, 100)
  where student_id = target_student_id
    and course_id = target_course_id
    and status <> 'completed';

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
end;
$$;

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
