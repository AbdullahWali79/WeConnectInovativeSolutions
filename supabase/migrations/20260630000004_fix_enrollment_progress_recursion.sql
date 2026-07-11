create or replace function public.handle_enrollment_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Skip recursive progress refreshes that are caused by refresh_student_progress itself.
  if pg_trigger_depth() > 1 then
    if tg_op = 'DELETE' then
      return old;
    end if;

    return new;
  end if;

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
