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

  if coalesce(report.total_tasks, 0) = 0 then
    raise exception 'Assign and review course tasks before marking this course complete';
  end if;

  if coalesce(report.completed_tasks, 0) < coalesce(report.total_tasks, 0) then
    raise exception 'All assigned tasks must be reviewed before marking this course complete';
  end if;

  completion_score := coalesce(report.average_score, 0);
  completion_progress := coalesce(report.progress_percentage, 100);

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
