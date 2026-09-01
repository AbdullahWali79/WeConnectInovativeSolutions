-- Allow an admin to publish an existing student profile as a public team member.
alter table public.team_members
  add column if not exists profile_id uuid references public.profiles(id) on delete set null;

create unique index if not exists team_members_profile_id_unique_idx
  on public.team_members (profile_id)
  where profile_id is not null;
