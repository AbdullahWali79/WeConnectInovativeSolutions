create table if not exists public.team_members (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  role text not null,
  department text,
  image_url text,
  email text,
  phone text,
  skills text[] default '{}',
  bio text,
  reports_to uuid references public.team_members(id) on delete set null,
  status text check (status in ('active','inactive')) default 'active',
  display_order int default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null,
  image_url text,
  short_description text,
  full_description text,
  price_or_access_type text,
  badge text check (badge in ('premium','hot','new','free','paid')) default 'new',
  product_link text,
  features text[] default '{}',
  status text check (status in ('active','inactive')) default 'active',
  display_order int default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.trainees (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  course_id uuid references public.courses(id) on delete set null,
  enrollment_id uuid references public.enrollments(id) on delete set null,
  assigned_tasks int default 0,
  completed_tasks int default 0,
  pending_tasks int default 0,
  progress_percentage int default 0,
  status text check (status in ('active','completed','pending','dropped')) default 'pending',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists team_members_order_idx on public.team_members (display_order, created_at desc);
create index if not exists products_order_idx on public.products (display_order, created_at desc);
create index if not exists trainees_status_idx on public.trainees (status, created_at desc);

alter table public.team_members enable row level security;
alter table public.products enable row level security;
alter table public.trainees enable row level security;

drop policy if exists "Public can read active team members" on public.team_members;
drop policy if exists "Admins can manage team members" on public.team_members;
drop policy if exists "Public can read active products" on public.products;
drop policy if exists "Admins can manage products" on public.products;
drop policy if exists "Authenticated can read trainees" on public.trainees;
drop policy if exists "Admins can manage trainees" on public.trainees;

create policy "Public can read active team members" on public.team_members
  for select using (status = 'active' or public.is_admin(auth.uid()));

create policy "Admins can manage team members" on public.team_members
  for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

create policy "Public can read active products" on public.products
  for select using (status = 'active' or public.is_admin(auth.uid()));

create policy "Admins can manage products" on public.products
  for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

create policy "Authenticated can read trainees" on public.trainees
  for select using (auth.uid() is not null or public.is_admin(auth.uid()));

create policy "Admins can manage trainees" on public.trainees
  for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

insert into public.team_members (name, role, department, email, skills, bio, status, display_order)
select 'Muhammad Abdullah', 'Team Leader', 'Leadership', null, array['Team Management','Operations','Mentoring'], 'Leads WeConnect-Inovation team strategy, execution, and trainee mentorship.', 'active', 1
where not exists (select 1 from public.team_members where lower(name) = lower('Muhammad Abdullah'));

insert into public.team_members (name, role, department, email, skills, bio, status, display_order)
select 'Atif Ayyoub', 'Web Developer', 'Engineering', null, array['Next.js','Supabase','Frontend'], 'Builds and maintains web products and internal tools.', 'active', 2
where not exists (select 1 from public.team_members where lower(name) = lower('Atif Ayyoub'));

insert into public.team_members (name, role, department, email, skills, bio, status, display_order)
select 'Abdullah Javeed', 'Flutter Mobile Application Developer', 'Mobile Engineering', null, array['Flutter','Dart','API Integration'], 'Develops cross-platform mobile applications for product initiatives.', 'active', 3
where not exists (select 1 from public.team_members where lower(name) = lower('Abdullah Javeed'));

insert into public.team_members (name, role, department, email, skills, bio, status, display_order)
select 'Sanawar Ali', 'Web Designer', 'Design', null, array['UI Design','UX','Prototyping'], 'Designs user interfaces and improves experience across web modules.', 'active', 4
where not exists (select 1 from public.team_members where lower(name) = lower('Sanawar Ali'));

insert into public.team_members (name, role, department, email, skills, bio, status, display_order)
select 'Haseeb Amjad', 'AI Developer', 'AI Automation', null, array['LLM Workflows','Automation','Prompt Engineering'], 'Works on AI-powered features, automations, and assistant tooling.', 'active', 5
where not exists (select 1 from public.team_members where lower(name) = lower('Haseeb Amjad'));

update public.team_members tm
set reports_to = lead.id
from public.team_members lead
where lower(lead.name) = lower('Muhammad Abdullah')
  and lower(tm.name) <> lower('Muhammad Abdullah')
  and tm.reports_to is null;

insert into public.products (name, category, short_description, full_description, price_or_access_type, badge, product_link, features, status, display_order)
select
  'AI Resume Optimizer',
  'AI Tools',
  'Optimize resumes for role-specific hiring with ATS-friendly formatting.',
  'A guided resume assistant that helps trainees optimize structure, keywords, and achievements for targeted job roles.',
  'Free',
  'free',
  null,
  array['ATS keyword suggestions','Role-specific scoring','Export tips'],
  'active',
  1
where not exists (select 1 from public.products where lower(name) = lower('AI Resume Optimizer'));

insert into public.products (name, category, short_description, full_description, price_or_access_type, badge, product_link, features, status, display_order)
select
  'Client Proposal Pack',
  'Templates',
  'Ready-to-use proposal and scope templates for freelancers/agencies.',
  'A professional proposal package including scope matrix, timelines, and client communication templates.',
  'Paid',
  'premium',
  null,
  array['Editable templates','Scope checklist','Delivery milestones'],
  'active',
  2
where not exists (select 1 from public.products where lower(name) = lower('Client Proposal Pack'));
