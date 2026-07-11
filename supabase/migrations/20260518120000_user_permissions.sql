create table if not exists public.user_permissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  permission_key text not null,
  enabled boolean not null default true,
  granted_by uuid references public.profiles(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id, permission_key)
);

create index if not exists user_permissions_user_id_idx on public.user_permissions (user_id);
create index if not exists user_permissions_permission_key_idx on public.user_permissions (permission_key);

create or replace function public.set_user_permissions_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists user_permissions_updated_at on public.user_permissions;
create trigger user_permissions_updated_at
  before update on public.user_permissions
  for each row execute function public.set_user_permissions_updated_at();

create or replace function public.has_permission(target_user_id uuid, target_permission_key text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.is_admin(target_user_id)
    or (
      target_permission_key <> 'completions.certificates.issue'
      and exists (
        select 1
        from public.profiles p
        join public.user_permissions up on up.user_id = p.id
        where p.id = target_user_id
          and p.role = 'teacher'
          and p.status = 'approved'
          and up.permission_key = target_permission_key
          and up.enabled = true
      )
    );
$$;

create or replace function public.has_any_permission(target_user_id uuid, target_permission_keys text[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.is_admin(target_user_id)
    or exists (
      select 1
      from unnest(target_permission_keys) as permission_key
      where public.has_permission(target_user_id, permission_key)
    );
$$;

alter table public.user_permissions enable row level security;

drop policy if exists "Admins can manage user permissions" on public.user_permissions;
drop policy if exists "Users can read own enabled permissions" on public.user_permissions;

create policy "Admins can manage user permissions" on public.user_permissions
  for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

create policy "Users can read own enabled permissions" on public.user_permissions
  for select using (user_id = auth.uid() and enabled = true);

drop policy if exists "Profiles are readable by owner or admin" on public.profiles;
drop policy if exists "Profiles are readable by owner admin or teacher" on public.profiles;
drop policy if exists "Profiles are readable by owner admin or permitted teacher" on public.profiles;
drop policy if exists "Admins can write profiles" on public.profiles;

create policy "Profiles are readable by owner admin or permitted teacher" on public.profiles
  for select using (
    id = auth.uid()
    or public.has_any_permission(auth.uid(), array[
      'dashboard.view',
      'students.view',
      'tasks.view',
      'submissions.view',
      'progress.view'
    ])
  );

create policy "Admins can write profiles" on public.profiles
  for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

drop policy if exists "Public can read course categories" on public.course_categories;
drop policy if exists "Admins can manage course categories" on public.course_categories;
drop policy if exists "Admins and teachers can manage course categories" on public.course_categories;
drop policy if exists "Permitted users can create course categories" on public.course_categories;
drop policy if exists "Permitted users can edit course categories" on public.course_categories;
drop policy if exists "Permitted users can delete course categories" on public.course_categories;

create policy "Public can read course categories" on public.course_categories
  for select using (true);

create policy "Permitted users can create course categories" on public.course_categories
  for insert with check (public.has_permission(auth.uid(), 'courses.create'));

create policy "Permitted users can edit course categories" on public.course_categories
  for update using (public.has_permission(auth.uid(), 'courses.edit')) with check (public.has_permission(auth.uid(), 'courses.edit'));

create policy "Permitted users can delete course categories" on public.course_categories
  for delete using (public.has_permission(auth.uid(), 'courses.delete'));

drop policy if exists "Public can read active courses" on public.courses;
drop policy if exists "Admins can manage courses" on public.courses;
drop policy if exists "Admins and teachers can manage courses" on public.courses;
drop policy if exists "Permitted users can create courses" on public.courses;
drop policy if exists "Permitted users can edit courses" on public.courses;
drop policy if exists "Permitted users can delete courses" on public.courses;

create policy "Public can read active courses" on public.courses
  for select using (
    status = 'active'
    or public.has_any_permission(auth.uid(), array[
      'dashboard.view',
      'courses.view',
      'students.view',
      'tasks.view',
      'submissions.view',
      'progress.view',
      'applications.view',
      'trainees.view'
    ])
  );

create policy "Permitted users can create courses" on public.courses
  for insert with check (public.has_permission(auth.uid(), 'courses.create'));

create policy "Permitted users can edit courses" on public.courses
  for update using (public.has_permission(auth.uid(), 'courses.edit')) with check (public.has_permission(auth.uid(), 'courses.edit'));

create policy "Permitted users can delete courses" on public.courses
  for delete using (public.has_permission(auth.uid(), 'courses.delete'));

drop policy if exists "Public can submit applications" on public.applications;
drop policy if exists "Admins can manage applications" on public.applications;
drop policy if exists "Permitted users can read applications" on public.applications;
drop policy if exists "Permitted users can update application status" on public.applications;
drop policy if exists "Admins can delete applications" on public.applications;

create policy "Public can submit applications" on public.applications
  for insert with check (status = 'pending');

create policy "Permitted users can read applications" on public.applications
  for select using (public.has_any_permission(auth.uid(), array['dashboard.view', 'applications.view']));

create policy "Permitted users can update application status" on public.applications
  for update using (public.has_permission(auth.uid(), 'applications.approve')) with check (public.has_permission(auth.uid(), 'applications.approve'));

create policy "Admins can delete applications" on public.applications
  for delete using (public.is_admin(auth.uid()));

drop policy if exists "Students can read own enrollments" on public.enrollments;
drop policy if exists "Admins can manage enrollments" on public.enrollments;
drop policy if exists "Admins and teachers can manage enrollments" on public.enrollments;
drop policy if exists "Students or permitted users can read enrollments" on public.enrollments;

create policy "Students or permitted users can read enrollments" on public.enrollments
  for select using (
    student_id = auth.uid()
    or public.has_any_permission(auth.uid(), array[
      'dashboard.view',
      'students.view',
      'tasks.view',
      'progress.view',
      'completions.certificates.issue'
    ])
  );

create policy "Admins can manage enrollments" on public.enrollments
  for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

drop policy if exists "Students can read own tasks" on public.tasks;
drop policy if exists "Admins can manage tasks" on public.tasks;
drop policy if exists "Admins and teachers can manage tasks" on public.tasks;
drop policy if exists "Students or permitted users can read tasks" on public.tasks;
drop policy if exists "Permitted users can create tasks" on public.tasks;
drop policy if exists "Permitted users can edit tasks" on public.tasks;
drop policy if exists "Permitted users can delete tasks" on public.tasks;

create policy "Students or permitted users can read tasks" on public.tasks
  for select using (
    student_id = auth.uid()
    or public.has_any_permission(auth.uid(), array[
      'dashboard.view',
      'students.view',
      'tasks.view',
      'submissions.view',
      'progress.view'
    ])
  );

create policy "Permitted users can create tasks" on public.tasks
  for insert with check (public.has_permission(auth.uid(), 'tasks.create'));

create policy "Permitted users can edit tasks" on public.tasks
  for update using (public.has_permission(auth.uid(), 'tasks.edit')) with check (public.has_permission(auth.uid(), 'tasks.edit'));

create policy "Permitted users can delete tasks" on public.tasks
  for delete using (public.has_permission(auth.uid(), 'tasks.delete'));

drop policy if exists "Students can read resources for own tasks" on public.task_resources;
drop policy if exists "Admins can manage task resources" on public.task_resources;
drop policy if exists "Admins and teachers can manage task resources" on public.task_resources;
drop policy if exists "Students or permitted users can read task resources" on public.task_resources;
drop policy if exists "Permitted users can create task resources" on public.task_resources;
drop policy if exists "Permitted users can edit task resources" on public.task_resources;
drop policy if exists "Permitted users can delete task resources" on public.task_resources;

create policy "Students or permitted users can read task resources" on public.task_resources
  for select using (
    public.has_any_permission(auth.uid(), array['dashboard.view', 'tasks.view'])
    or exists (
      select 1
      from public.tasks t
      where t.id = task_id
        and t.student_id = auth.uid()
    )
  );

create policy "Permitted users can create task resources" on public.task_resources
  for insert with check (public.has_permission(auth.uid(), 'tasks.create'));

create policy "Permitted users can edit task resources" on public.task_resources
  for update using (public.has_permission(auth.uid(), 'tasks.edit')) with check (public.has_permission(auth.uid(), 'tasks.edit'));

create policy "Permitted users can delete task resources" on public.task_resources
  for delete using (public.has_permission(auth.uid(), 'tasks.delete'));

drop policy if exists "Students can read own submissions" on public.submissions;
drop policy if exists "Students can insert own clean submissions" on public.submissions;
drop policy if exists "Admins can manage submissions" on public.submissions;
drop policy if exists "Admins and teachers can manage submissions" on public.submissions;
drop policy if exists "Students or permitted users can read submissions" on public.submissions;
drop policy if exists "Permitted users can grade submissions" on public.submissions;
drop policy if exists "Admins can delete submissions" on public.submissions;

create policy "Students or permitted users can read submissions" on public.submissions
  for select using (
    student_id = auth.uid()
    or public.has_any_permission(auth.uid(), array['dashboard.view', 'submissions.view', 'progress.view'])
  );

create policy "Students can insert own clean submissions" on public.submissions
  for insert with check (
    student_id = auth.uid()
    and status = 'submitted'
    and coalesce(score, 0) = 0
    and feedback is null
    and reviewed_at is null
    and exists (
      select 1 from public.tasks t
      where t.id = task_id and t.student_id = auth.uid()
    )
  );

create policy "Permitted users can grade submissions" on public.submissions
  for update using (public.has_permission(auth.uid(), 'submissions.grade')) with check (public.has_permission(auth.uid(), 'submissions.grade'));

create policy "Admins can delete submissions" on public.submissions
  for delete using (public.is_admin(auth.uid()));

drop policy if exists "Students can read own progress" on public.progress_reports;
drop policy if exists "Admins can manage progress reports" on public.progress_reports;
drop policy if exists "Admins and teachers can manage progress reports" on public.progress_reports;
drop policy if exists "Students or permitted users can read progress reports" on public.progress_reports;

create policy "Students or permitted users can read progress reports" on public.progress_reports
  for select using (
    student_id = auth.uid()
    or public.has_any_permission(auth.uid(), array['dashboard.view', 'students.view', 'progress.view'])
  );

create policy "Admins can manage progress reports" on public.progress_reports
  for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

drop policy if exists "Public can read public completed students" on public.completed_students;
drop policy if exists "Admins can manage completed students" on public.completed_students;

create policy "Public can read public completed students" on public.completed_students
  for select using (is_public = true or public.is_admin(auth.uid()) or student_id = auth.uid());

create policy "Admins can manage completed students" on public.completed_students
  for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

drop policy if exists "Anyone can read active announcements" on public.announcements;
drop policy if exists "Admins can manage announcements" on public.announcements;
drop policy if exists "Admins and teachers can manage announcements" on public.announcements;
drop policy if exists "Permitted users can create announcements" on public.announcements;
drop policy if exists "Permitted users can update announcements" on public.announcements;
drop policy if exists "Permitted users can delete announcements" on public.announcements;

create policy "Anyone can read active announcements" on public.announcements
  for select using (is_active = true or public.has_permission(auth.uid(), 'announcements.view'));

create policy "Permitted users can create announcements" on public.announcements
  for insert with check (public.has_permission(auth.uid(), 'announcements.create'));

create policy "Permitted users can update announcements" on public.announcements
  for update using (public.has_permission(auth.uid(), 'announcements.create')) with check (public.has_permission(auth.uid(), 'announcements.create'));

create policy "Permitted users can delete announcements" on public.announcements
  for delete using (public.has_permission(auth.uid(), 'announcements.create'));

drop policy if exists "Public can read active promotional popups" on public.promotional_popups;
drop policy if exists "Public or permitted users can read promotional popups" on public.promotional_popups;
drop policy if exists "Admins can manage promotional popups" on public.promotional_popups;
drop policy if exists "Permitted users can create promotional popups" on public.promotional_popups;
drop policy if exists "Permitted users can edit promotional popups" on public.promotional_popups;
drop policy if exists "Permitted users can delete promotional popups" on public.promotional_popups;

create policy "Public or permitted users can read promotional popups" on public.promotional_popups
  for select using (is_active = true or public.has_permission(auth.uid(), 'promotional_popups.view'));

create policy "Admins can manage promotional popups" on public.promotional_popups
  for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

create policy "Permitted users can create promotional popups" on public.promotional_popups
  for insert with check (public.has_permission(auth.uid(), 'promotional_popups.create'));

create policy "Permitted users can edit promotional popups" on public.promotional_popups
  for update using (public.has_permission(auth.uid(), 'promotional_popups.edit')) with check (public.has_permission(auth.uid(), 'promotional_popups.edit'));

create policy "Permitted users can delete promotional popups" on public.promotional_popups
  for delete using (public.has_permission(auth.uid(), 'promotional_popups.delete'));

drop policy if exists "Public can read active team members" on public.team_members;
drop policy if exists "Public or permitted users can read active team members" on public.team_members;
drop policy if exists "Admins can manage team members" on public.team_members;
drop policy if exists "Permitted users can create team members" on public.team_members;
drop policy if exists "Permitted users can edit team members" on public.team_members;
drop policy if exists "Permitted users can delete team members" on public.team_members;

create policy "Public or permitted users can read active team members" on public.team_members
  for select using (status = 'active' or public.has_permission(auth.uid(), 'team_members.view'));

create policy "Admins can manage team members" on public.team_members
  for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

create policy "Permitted users can create team members" on public.team_members
  for insert with check (public.has_permission(auth.uid(), 'team_members.create'));

create policy "Permitted users can edit team members" on public.team_members
  for update using (public.has_permission(auth.uid(), 'team_members.edit')) with check (public.has_permission(auth.uid(), 'team_members.edit'));

create policy "Permitted users can delete team members" on public.team_members
  for delete using (public.has_permission(auth.uid(), 'team_members.delete'));

drop policy if exists "Public can read active products" on public.products;
drop policy if exists "Public or permitted users can read active products" on public.products;
drop policy if exists "Admins can manage products" on public.products;
drop policy if exists "Permitted users can create products" on public.products;
drop policy if exists "Permitted users can edit products" on public.products;
drop policy if exists "Permitted users can delete products" on public.products;

create policy "Public or permitted users can read active products" on public.products
  for select using (status = 'active' or public.has_permission(auth.uid(), 'products.view'));

create policy "Admins can manage products" on public.products
  for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

create policy "Permitted users can create products" on public.products
  for insert with check (public.has_permission(auth.uid(), 'products.create'));

create policy "Permitted users can edit products" on public.products
  for update using (public.has_permission(auth.uid(), 'products.edit')) with check (public.has_permission(auth.uid(), 'products.edit'));

create policy "Permitted users can delete products" on public.products
  for delete using (public.has_permission(auth.uid(), 'products.delete'));

drop policy if exists "Authenticated can read trainees" on public.trainees;
drop policy if exists "Permitted users can read trainees" on public.trainees;
drop policy if exists "Admins can manage trainees" on public.trainees;
drop policy if exists "Permitted users can create trainees" on public.trainees;
drop policy if exists "Permitted users can edit trainees" on public.trainees;
drop policy if exists "Permitted users can delete trainees" on public.trainees;

create policy "Permitted users can read trainees" on public.trainees
  for select using (public.has_permission(auth.uid(), 'trainees.view'));

create policy "Admins can manage trainees" on public.trainees
  for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

create policy "Permitted users can create trainees" on public.trainees
  for insert with check (public.has_permission(auth.uid(), 'trainees.create'));

create policy "Permitted users can edit trainees" on public.trainees
  for update using (public.has_permission(auth.uid(), 'trainees.edit')) with check (public.has_permission(auth.uid(), 'trainees.edit'));

create policy "Permitted users can delete trainees" on public.trainees
  for delete using (public.has_permission(auth.uid(), 'trainees.delete'));

create or replace function public.approve_application(application_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target_application public.applications%rowtype;
  target_profile public.profiles%rowtype;
begin
  if not public.has_permission(auth.uid(), 'applications.approve') then
    raise exception 'Only approved admins or permitted teachers can approve applications';
  end if;

  update public.applications
  set status = 'approved'
  where id = application_id
  returning * into target_application;

  if target_application.id is null then
    raise exception 'Application not found';
  end if;

  select * into target_profile
  from public.profiles
  where lower(email) = lower(target_application.email)
  limit 1;

  if target_profile.id is not null then
    update public.profiles
    set status = 'approved',
        full_name = coalesce(public.profiles.full_name, target_application.full_name),
        phone = coalesce(public.profiles.phone, target_application.phone)
    where id = target_profile.id;

    if target_application.course_id is not null then
      insert into public.enrollments (student_id, course_id, status)
      values (target_profile.id, target_application.course_id, 'active')
      on conflict (student_id, course_id) do update set status = 'active';

      perform public.refresh_student_progress(target_profile.id, target_application.course_id);
    end if;
  end if;
end;
$$;

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
  if not public.has_permission(auth.uid(), 'applications.approve') then
    raise exception 'Only approved admins or permitted teachers can reject applications';
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

grant select, insert, update, delete on public.user_permissions to authenticated;
grant execute on function public.has_permission(uuid, text) to anon, authenticated;
grant execute on function public.has_any_permission(uuid, text[]) to anon, authenticated;
