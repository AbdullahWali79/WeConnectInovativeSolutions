-- Migration: Backfill / fix any null student_id references on tasks or submissions.
-- Since the tables reference profiles(id), these fields can be safely updated using task-submission relationships.

-- 1. Update submissions.student_id from tasks.student_id if missing.
update public.submissions s
set student_id = t.student_id
from public.tasks t
where s.task_id = t.id 
  and s.student_id is null 
  and t.student_id is not null;

-- 2. Update tasks.student_id from submissions.student_id if missing.
update public.tasks t
set student_id = s.student_id
from public.submissions s
where s.task_id = t.id 
  and t.student_id is null 
  and s.student_id is not null;
