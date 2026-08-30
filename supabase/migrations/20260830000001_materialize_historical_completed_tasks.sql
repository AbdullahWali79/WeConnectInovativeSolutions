-- Older manual progress summaries stored only a completed-task number in
-- progress_reports. Materialize the missing accepted task rows so review
-- history and public progress cards use the same underlying task data.
with task_gaps as (
  select
    pr.student_id,
    pr.course_id,
    coalesce(pr.completed_tasks, 0) as reported_completed,
    (
      select count(*)::int
      from public.tasks t
      where t.student_id = pr.student_id
        and t.course_id = pr.course_id
        and t.status = 'reviewed'
    ) as saved_reviewed
  from public.progress_reports pr
), missing_tasks as (
  select
    gap.student_id,
    gap.course_id,
    gap.saved_reviewed,
    series.task_number
  from task_gaps gap
  cross join lateral generate_series(
    1,
    greatest(gap.reported_completed - gap.saved_reviewed, 0)
  ) as series(task_number)
)
insert into public.tasks (
  student_id,
  course_id,
  workflow_type,
  title,
  description,
  max_score,
  status,
  created_at
)
select
  student_id,
  course_id,
  'daily',
  format('Historical accepted task %s', saved_reviewed + task_number),
  'Imported from the previously saved manual progress summary. Original submission details were not stored.',
  100,
  'reviewed',
  now()
from missing_tasks;
