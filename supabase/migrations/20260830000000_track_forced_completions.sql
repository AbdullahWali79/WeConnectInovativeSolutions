alter table public.completed_students
  add column if not exists completion_type text not null default 'automatic'
  check (completion_type in ('automatic', 'forced'));

-- Preserve the two completions explicitly confirmed as manual overrides.
update public.completed_students cs
set completion_type = 'forced'
from public.profiles p
where p.id = cs.student_id
  and lower(p.email) in ('ahsanjatt2160@gmail.com', 'hamnaqazafiofficial@gmail.com');

-- Remove stale automatic completions whose reviewed task target was never met.
update public.enrollments e
set status = 'active',
    progress_percentage = coalesce(pr.progress_percentage, 0),
    completed_at = null
from public.progress_reports pr
where pr.student_id = e.student_id
  and pr.course_id = e.course_id
  and e.status = 'completed'
  and coalesce(pr.completed_tasks, 0) < coalesce(pr.target_tasks, e.target_tasks, 100)
  and not exists (
    select 1
    from public.completed_students cs
    where cs.student_id = e.student_id
      and cs.course_id = e.course_id
      and cs.completion_type = 'forced'
  );

delete from public.completed_students cs
using public.progress_reports pr
where pr.student_id = cs.student_id
  and pr.course_id = cs.course_id
  and cs.completion_type = 'automatic'
  and coalesce(pr.completed_tasks, 0) < coalesce(pr.target_tasks, 100);

-- admin_status is optional on older production databases.
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profiles'
      and column_name = 'admin_status'
  ) then
    execute $sql$
      update public.profiles p
      set admin_status = 'active',
          status = 'approved'
      where p.role = 'student'
        and p.admin_status = 'completed'
        and not exists (
          select 1
          from public.completed_students cs
          where cs.student_id = p.id
            and (
              cs.completion_type = 'forced'
              or exists (
                select 1
                from public.progress_reports pr
                where pr.student_id = cs.student_id
                  and pr.course_id = cs.course_id
                  and coalesce(pr.completed_tasks, 0) >= coalesce(pr.target_tasks, 100)
              )
            )
        )
    $sql$;
  end if;
end $$;
