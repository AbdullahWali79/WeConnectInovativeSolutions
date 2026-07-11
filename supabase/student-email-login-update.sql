create or replace function public.can_request_student_access(target_email text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.applications
    where lower(email) = lower(target_email)
      and status = 'approved'
  )
  or exists (
    select 1
    from public.profiles
    where lower(email) = lower(target_email)
      and role = 'student'
      and status = 'approved'
  );
$$;

grant execute on function public.can_request_student_access(text) to anon, authenticated;
