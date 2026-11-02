-- Team members: editable social links + leadership card flag.
--
-- Why: the two leadership cards on /team (Dr. Hammad Habib Qazi and
-- Muhammad Abdullah) were hardcoded in the public component, so admins could
-- not edit their name, role, bio, phone or links from the admin panel.
-- These columns let the whole card be data-driven and let every member carry
-- GitHub / LinkedIn links.

alter table public.team_members
  add column if not exists github_url text,
  add column if not exists linkedin_url text,
  add column if not exists is_leadership boolean not null default false;

create index if not exists team_members_leadership_idx
  on public.team_members (is_leadership, display_order);

-- Seed the founder, who previously existed only as hardcoded markup.
insert into public.team_members (
  name, role, department, bio, phone, linkedin_url,
  status, is_leadership, display_order
)
select
  'Dr. Hammad Habib Qazi',
  'Founder & CEO',
  'Leadership',
  'Leading the vision and strategy for digital excellence and innovation.',
  '+44 7454 498664',
  'https://www.linkedin.com/in/hummad-h-qazi-01bb8662/',
  'active',
  true,
  0
where not exists (
  select 1 from public.team_members where lower(name) = lower('Dr. Hammad Habib Qazi')
);

-- Align the existing co-founder row with what the public page was displaying,
-- and flag it as a leadership card.
update public.team_members
set
  role = 'Co-Founder & Operational Manager',
  department = 'Leadership',
  bio = coalesce(nullif(bio, ''), 'Overseeing operations, product development, and ensuring client success.'),
  phone = coalesce(nullif(phone, ''), '0304 698 3794'),
  linkedin_url = coalesce(nullif(linkedin_url, ''), 'https://www.linkedin.com/in/abdullahwale/'),
  is_leadership = true,
  display_order = 1,
  updated_at = now()
where lower(name) = lower('Muhammad Abdullah');
