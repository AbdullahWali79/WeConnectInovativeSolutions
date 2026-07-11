alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles
  add constraint profiles_role_check check (role in ('admin', 'teacher', 'student'));

create or replace function public.is_admin_or_teacher(user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = user_id
      and role in ('admin', 'teacher')
      and status = 'approved'
  );
$$;

drop policy if exists "Profiles are readable by owner or admin" on public.profiles;
drop policy if exists "Profiles are readable by owner admin or teacher" on public.profiles;
drop policy if exists "Admins can write profiles" on public.profiles;

create policy "Profiles are readable by owner admin or teacher" on public.profiles
  for select using (id = auth.uid() or public.is_admin_or_teacher(auth.uid()));

create policy "Admins can write profiles" on public.profiles
  for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

drop policy if exists "Public can read course categories" on public.course_categories;
drop policy if exists "Admins can manage course categories" on public.course_categories;
drop policy if exists "Admins and teachers can manage course categories" on public.course_categories;

create policy "Public can read course categories" on public.course_categories
  for select using (true);

create policy "Admins and teachers can manage course categories" on public.course_categories
  for all using (public.is_admin_or_teacher(auth.uid())) with check (public.is_admin_or_teacher(auth.uid()));

drop policy if exists "Public can read active courses" on public.courses;
drop policy if exists "Admins can manage courses" on public.courses;
drop policy if exists "Admins and teachers can manage courses" on public.courses;

create policy "Public can read active courses" on public.courses
  for select using (status = 'active' or public.is_admin_or_teacher(auth.uid()));

create policy "Admins and teachers can manage courses" on public.courses
  for all using (public.is_admin_or_teacher(auth.uid())) with check (public.is_admin_or_teacher(auth.uid()));

drop policy if exists "Students can read own enrollments" on public.enrollments;
drop policy if exists "Admins can manage enrollments" on public.enrollments;
drop policy if exists "Admins and teachers can manage enrollments" on public.enrollments;

create policy "Students can read own enrollments" on public.enrollments
  for select using (student_id = auth.uid() or public.is_admin_or_teacher(auth.uid()));

create policy "Admins and teachers can manage enrollments" on public.enrollments
  for all using (public.is_admin_or_teacher(auth.uid())) with check (public.is_admin_or_teacher(auth.uid()));

drop policy if exists "Students can read own tasks" on public.tasks;
drop policy if exists "Admins can manage tasks" on public.tasks;
drop policy if exists "Admins and teachers can manage tasks" on public.tasks;

create policy "Students can read own tasks" on public.tasks
  for select using (student_id = auth.uid() or public.is_admin_or_teacher(auth.uid()));

create policy "Admins and teachers can manage tasks" on public.tasks
  for all using (public.is_admin_or_teacher(auth.uid())) with check (public.is_admin_or_teacher(auth.uid()));

drop policy if exists "Students can read resources for own tasks" on public.task_resources;
drop policy if exists "Admins can manage task resources" on public.task_resources;
drop policy if exists "Admins and teachers can manage task resources" on public.task_resources;

create policy "Students can read resources for own tasks" on public.task_resources
  for select using (
    public.is_admin_or_teacher(auth.uid())
    or exists (
      select 1
      from public.tasks t
      where t.id = task_id
        and t.student_id = auth.uid()
    )
  );

create policy "Admins and teachers can manage task resources" on public.task_resources
  for all using (public.is_admin_or_teacher(auth.uid())) with check (public.is_admin_or_teacher(auth.uid()));

drop policy if exists "Students can read own submissions" on public.submissions;
drop policy if exists "Admins can manage submissions" on public.submissions;
drop policy if exists "Admins and teachers can manage submissions" on public.submissions;

create policy "Students can read own submissions" on public.submissions
  for select using (student_id = auth.uid() or public.is_admin_or_teacher(auth.uid()));

create policy "Admins and teachers can manage submissions" on public.submissions
  for all using (public.is_admin_or_teacher(auth.uid())) with check (public.is_admin_or_teacher(auth.uid()));

drop policy if exists "Students can read own progress" on public.progress_reports;
drop policy if exists "Admins can manage progress reports" on public.progress_reports;
drop policy if exists "Admins and teachers can manage progress reports" on public.progress_reports;

create policy "Students can read own progress" on public.progress_reports
  for select using (student_id = auth.uid() or public.is_admin_or_teacher(auth.uid()));

create policy "Admins and teachers can manage progress reports" on public.progress_reports
  for all using (public.is_admin_or_teacher(auth.uid())) with check (public.is_admin_or_teacher(auth.uid()));

drop policy if exists "Anyone can read active announcements" on public.announcements;
drop policy if exists "Admins can manage announcements" on public.announcements;
drop policy if exists "Admins and teachers can manage announcements" on public.announcements;

create policy "Anyone can read active announcements" on public.announcements
  for select using (is_active = true or public.is_admin_or_teacher(auth.uid()));

create policy "Admins and teachers can manage announcements" on public.announcements
  for all using (public.is_admin_or_teacher(auth.uid())) with check (public.is_admin_or_teacher(auth.uid()));

grant execute on function public.is_admin_or_teacher(uuid) to anon, authenticated;
