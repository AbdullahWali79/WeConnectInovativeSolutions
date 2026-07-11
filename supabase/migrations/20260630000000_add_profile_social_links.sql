alter table public.profiles
  add column if not exists github_url text;

alter table public.profiles
  add column if not exists linkedin_url text;

alter table public.profiles
  add column if not exists facebook_url text;

alter table public.profiles
  add column if not exists indeed_url text;
