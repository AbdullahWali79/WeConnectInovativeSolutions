create or replace view public.completed_student_showcase as
select
  cs.id,
  cs.student_id,
  cs.course_id,
  p.full_name as student_name,
  p.email as student_email,
  c.title as course_name,
  cs.final_score,
  cs.progress_percentage,
  cs.completed_at
from public.completed_students cs
join public.enrollments e
  on e.student_id = cs.student_id
  and e.course_id = cs.course_id
join public.profiles p on p.id = cs.student_id
join public.courses c on c.id = cs.course_id
where cs.is_public = true
  and e.status = 'completed'
  and e.completed_at is not null;
