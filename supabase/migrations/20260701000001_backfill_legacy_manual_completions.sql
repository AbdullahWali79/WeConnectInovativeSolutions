with matched_manuals as (
  select
    me.id as manual_id,
    p.id as student_id,
    c.id as course_id,
    coalesce(me.completion_date::timestamptz, me.created_at) as completed_at,
    coalesce(me.joining_date::timestamptz, me.created_at) as joined_at,
    coalesce(me.total_marks, 25) as total_marks,
    coalesce(me.final_score, 100) as final_score,
    coalesce(me.show_on_completed_page, false) as show_on_completed_page
  from public.manual_enrollments me
  join public.profiles p
    on lower(p.email) = lower(me.email)
    and p.role = 'student'
  join public.courses c
    on lower(c.title) = lower(me.course_name)
)
insert into public.enrollments (
  student_id,
  course_id,
  status,
  progress_percentage,
  final_score,
  target_tasks,
  completed_at
)
select
  student_id,
  course_id,
  'completed',
  100,
  final_score,
  greatest(total_marks::int, 100),
  completed_at
from matched_manuals
on conflict (student_id, course_id) do update set
  status = 'completed',
  progress_percentage = 100,
  final_score = excluded.final_score,
  target_tasks = excluded.target_tasks,
  completed_at = excluded.completed_at;

insert into public.completed_students (
  student_id,
  course_id,
  final_score,
  progress_percentage,
  is_public,
  completed_at
)
select
  student_id,
  course_id,
  final_score,
  100,
  show_on_completed_page,
  completed_at
from matched_manuals
on conflict (student_id, course_id) do update set
  final_score = excluded.final_score,
  progress_percentage = excluded.progress_percentage,
  is_public = excluded.is_public,
  completed_at = excluded.completed_at;

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
)
select
  student_id,
  course_id,
  greatest(total_marks::int, 100),
  greatest(total_marks::int, 100),
  0,
  final_score,
  100,
  greatest(total_marks::int, 100),
  completed_at
from matched_manuals
on conflict (student_id, course_id) do update set
  total_tasks = excluded.total_tasks,
  completed_tasks = excluded.completed_tasks,
  pending_tasks = excluded.pending_tasks,
  average_score = excluded.average_score,
  progress_percentage = excluded.progress_percentage,
  target_tasks = excluded.target_tasks,
  updated_at = excluded.updated_at;
