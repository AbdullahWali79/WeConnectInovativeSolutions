alter table public.student_projects
  drop constraint if exists student_projects_status_check;

alter table public.student_projects
  add constraint student_projects_status_check
  check (status in ('submitted', 'approved', 'rejected', 'revision_required'));

drop policy if exists "Students update submitted projects" on public.student_projects;

create policy "Students update submitted projects" on public.student_projects
  for update
  using (
    student_id = auth.uid()
    and status in ('submitted', 'revision_required')
    and promoted_product_id is null
  )
  with check (
    student_id = auth.uid()
    and status = 'submitted'
    and promoted_product_id is null
  );
