-- Create course_projects table
create table public.course_projects (
    id uuid default gen_random_uuid() primary key,
    course_id uuid not null references public.courses(id) on delete cascade,
    title text not null,
    description text not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS for course_projects
alter table public.course_projects enable row level security;

create policy "Admins can manage course projects"
    on public.course_projects
    for all
    to authenticated
    using (
        exists (
            select 1 from public.profiles
            where profiles.id = auth.uid() and profiles.role = 'admin'
        )
    );

create policy "Everyone can view course projects"
    on public.course_projects
    for select
    to authenticated
    using (true);

-- Update TaskWorkflowType to allow 'project'
alter table public.tasks drop constraint if exists tasks_workflow_type_check;

alter table public.tasks
  add constraint tasks_workflow_type_check
  check (workflow_type in ('assigned', 'daily', 'project'));
