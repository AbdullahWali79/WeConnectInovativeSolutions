-- Independent prompt accounts: deliberately no references to profiles, auth.users or courses.
create table public.prompt_contributors (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(name) between 2 and 100),
  email text not null unique check (email = lower(email)),
  password_hash text not null,
  request_note text not null default '',
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  auto_publish boolean not null default false,
  admin_note text not null default '',
  created_at timestamptz not null default now()
);
create table public.prompt_sessions (
  token_hash text primary key,
  contributor_id uuid not null references public.prompt_contributors(id) on delete cascade,
  expires_at timestamptz not null
);
create index on public.prompt_sessions(contributor_id);
create table public.prompt_library (
  id uuid primary key default gen_random_uuid(),
  contributor_id uuid references public.prompt_contributors(id) on delete set null,
  title text not null check (length(title) between 3 and 140),
  description text not null,
  category text not null,
  model text not null,
  template text not null,
  media_urls jsonb not null default '[]'::jsonb check (jsonb_typeof(media_urls) = 'array'),
  price numeric(12,2) not null default 0 check (price >= 0),
  purchase_url text not null default '',
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  admin_note text not null default '',
  created_at timestamptz not null default now(),
  check (price = 0 or purchase_url like 'https://%')
);
create index on public.prompt_library(status, created_at desc);
create index on public.prompt_library(contributor_id);
create table public.prompt_rate_limits (
  key text primary key,
  attempts integer not null default 1,
  started_at timestamptz not null default now()
);
create or replace function public.prompt_take_attempt(bucket text, max_attempts integer)
returns boolean language plpgsql security definer set search_path = public as $$
declare result integer;
begin
  delete from public.prompt_rate_limits where started_at < now() - interval '1 day';
  insert into public.prompt_rate_limits as limits(key) values (bucket)
  on conflict (key) do update set
    attempts = case when limits.started_at < now() - interval '15 minutes' then 1 else limits.attempts + 1 end,
    started_at = case when limits.started_at < now() - interval '15 minutes' then now() else limits.started_at end
  returning attempts into result;
  return result <= max_attempts;
end;
$$;
revoke all on function public.prompt_take_attempt(text, integer) from public, anon, authenticated;
grant execute on function public.prompt_take_attempt(text, integer) to service_role;
alter table public.prompt_contributors enable row level security;
alter table public.prompt_sessions enable row level security;
alter table public.prompt_library enable row level security;
alter table public.prompt_rate_limits enable row level security;
-- All access is through server actions; paid templates and credentials are never public.
revoke all on public.prompt_contributors, public.prompt_sessions, public.prompt_library, public.prompt_rate_limits from anon, authenticated;
grant all on public.prompt_contributors, public.prompt_sessions, public.prompt_library, public.prompt_rate_limits to service_role;
