alter table public.tasks
  drop constraint if exists tasks_status_check;

alter table public.tasks
  add constraint tasks_status_check
  check (status in ('pending', 'in_progress', 'submitted', 'reviewed', 'revision_required', 'rejected'));

alter table public.submissions
  drop constraint if exists submissions_status_check;

alter table public.submissions
  add constraint submissions_status_check
  check (status in ('submitted', 'reviewed', 'revision_required', 'rejected'));

create or replace function public.handle_submission_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target_course_id uuid;
begin
  if tg_op = 'DELETE' then
    select course_id into target_course_id from public.tasks where id = old.task_id;
    if target_course_id is not null then
      update public.tasks set status = 'pending' where id = old.task_id;
      perform public.refresh_student_progress(old.student_id, target_course_id);
    end if;
    return old;
  end if;

  select course_id into target_course_id from public.tasks where id = new.task_id;

  if target_course_id is not null then
    update public.tasks
    set status = new.status
    where id = new.task_id;

    perform public.refresh_student_progress(new.student_id, target_course_id);
  end if;

  return new;
end;
$$;
