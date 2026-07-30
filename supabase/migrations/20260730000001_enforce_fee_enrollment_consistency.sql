-- A fee must reference the same student and course as its enrollment.
-- This prevents fee entry from silently creating or pointing at an unrelated course.
create or replace function public.validate_student_fee_enrollment()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.enrollment_id is null then
    raise exception 'Fee record must be linked to an enrollment';
  end if;

  if not exists (
    select 1
    from public.enrollments e
    where e.id = new.enrollment_id
      and e.student_id = new.student_id
      and e.course_id = new.course_id
  ) then
    raise exception 'Fee enrollment does not match the selected student and course';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_validate_student_fee_enrollment on public.student_fee_records;
create trigger trg_validate_student_fee_enrollment
  before insert or update of student_id, enrollment_id, course_id
  on public.student_fee_records
  for each row execute function public.validate_student_fee_enrollment();
