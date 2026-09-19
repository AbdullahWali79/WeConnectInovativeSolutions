create or replace function public.edit_student_submission_proof(
  target_task_id uuid,
  new_proof_url text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target_submission public.submissions%rowtype;
begin
  select * into target_submission
  from public.submissions
  where task_id = target_task_id
    and student_id = auth.uid()
  order by submitted_at desc
  limit 1;

  if not found then
    raise exception 'Submission not found or you are not allowed to edit this submission.';
  end if;

  update public.submissions
  set proof_url = new_proof_url
  where id = target_submission.id;
end;
$$;
