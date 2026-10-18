create table if not exists public.course_student_menu_controls (
  course_id uuid not null references public.courses(id) on delete cascade,
  menu_key text not null,
  is_visible boolean not null default true,
  updated_at timestamptz not null default now(),
  primary key (course_id, menu_key)
);

alter table public.course_student_menu_controls enable row level security;
create policy "Students read menu controls for enrolled courses" on public.course_student_menu_controls
  for select using (exists (select 1 from public.enrollments e where e.student_id = auth.uid() and e.course_id = course_student_menu_controls.course_id));
create policy "Admins manage course menu controls" on public.course_student_menu_controls
  for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));
grant select on public.course_student_menu_controls to authenticated;
grant all on public.course_student_menu_controls to service_role;
