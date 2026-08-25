create table if not exists public.ai_tools (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 2 and 120),
  url text not null,
  benefits text not null check (char_length(trim(benefits)) between 10 and 2000),
  image_url text not null,
  youtube_url text,
  submitted_by uuid references public.profiles(id) on delete set null,
  submitter_email text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  admin_note text,
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists ai_tools_url_unique on public.ai_tools (lower(url));
create index if not exists ai_tools_public_listing on public.ai_tools (status, published_at desc, created_at desc);
create index if not exists ai_tools_submitter on public.ai_tools (submitted_by, created_at desc);

alter table public.ai_tools enable row level security;

drop policy if exists "Anyone can view approved AI tools" on public.ai_tools;
create policy "Anyone can view approved AI tools" on public.ai_tools for select
  using (status = 'approved');

drop policy if exists "Students can view own AI tool submissions" on public.ai_tools;
create policy "Students can view own AI tool submissions" on public.ai_tools for select to authenticated
  using (submitted_by = auth.uid());

drop policy if exists "Students can submit AI tools" on public.ai_tools;
create policy "Students can submit AI tools" on public.ai_tools for insert to authenticated
  with check (submitted_by = auth.uid() and status = 'pending');

grant select on public.ai_tools to anon, authenticated;
grant insert on public.ai_tools to authenticated;
