create or replace function public.reject_application(application_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target_application public.applications%rowtype;
  target_profile public.profiles%rowtype;
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'Only approved admins can reject applications';
  end if;

  update public.applications
  set status = 'rejected'
  where id = application_id
  returning * into target_application;

  if target_application.id is null then
    raise exception 'Application not found';
  end if;

  select * into target_profile
  from public.profiles
  where lower(email) = lower(target_application.email)
    and role = 'student'
  limit 1;

  if target_profile.id is not null then
    update public.profiles
    set status = 'rejected'
    where id = target_profile.id;

    if target_application.course_id is not null then
      update public.enrollments
      set status = 'dropped',
          completed_at = null
      where student_id = target_profile.id
        and course_id = target_application.course_id;

      delete from public.completed_students
      where student_id = target_profile.id
        and course_id = target_application.course_id;
    end if;
  end if;
end;
$$;
