create table if not exists public.student_projects (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  category text not null,
  short_description text,
  full_description text,
  github_url text not null,
  live_url text,
  image_urls text[] not null default '{}',
  technologies text[] not null default '{}',
  status text not null default 'submitted' check (status in ('submitted','approved','rejected')),
  admin_feedback text,
  reviewed_at timestamptz,
  reviewed_by uuid references public.profiles(id) on delete set null,
  promoted_product_id uuid references public.products(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.products
  add column if not exists gallery_urls text[] not null default '{}',
  add column if not exists source_project_id uuid references public.student_projects(id) on delete set null,
  add column if not exists student_name text;

create index if not exists student_projects_student_idx on public.student_projects(student_id, created_at desc);
create index if not exists student_projects_status_idx on public.student_projects(status, created_at desc);

alter table public.student_projects enable row level security;

drop policy if exists "Students read own projects" on public.student_projects;
drop policy if exists "Students create own projects" on public.student_projects;
drop policy if exists "Students update submitted projects" on public.student_projects;
drop policy if exists "Admins manage student projects" on public.student_projects;

create policy "Students read own projects" on public.student_projects
  for select using (student_id = auth.uid() or public.is_admin(auth.uid()));

create policy "Students create own projects" on public.student_projects
  for insert with check (student_id = auth.uid() and status = 'submitted' and promoted_product_id is null);

create policy "Students update submitted projects" on public.student_projects
  for update using (student_id = auth.uid() and status = 'submitted')
  with check (student_id = auth.uid() and status = 'submitted' and promoted_product_id is null);

create policy "Admins manage student projects" on public.student_projects
  for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));