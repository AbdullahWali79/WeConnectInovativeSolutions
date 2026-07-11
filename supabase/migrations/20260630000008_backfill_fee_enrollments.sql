with fee_pairs as (
  select distinct student_id, course_id
  from public.student_fee_records
)
insert into public.enrollments (student_id, course_id, status)
select fp.student_id, fp.course_id, 'active'
from fee_pairs fp
left join public.enrollments e
  on e.student_id = fp.student_id
  and e.course_id = fp.course_id
where e.id is null
on conflict (student_id, course_id) do update set
  status = 'active';

update public.student_fee_records sfr
set enrollment_id = e.id
from public.enrollments e
where sfr.enrollment_id is null
  and sfr.student_id = e.student_id
  and sfr.course_id = e.course_id;

do $$
declare
  row_record record;
begin
  for row_record in
    select distinct student_id, course_id
    from public.student_fee_records
  loop
    perform public.refresh_student_progress(row_record.student_id, row_record.course_id);
  end loop;
end;
$$;
