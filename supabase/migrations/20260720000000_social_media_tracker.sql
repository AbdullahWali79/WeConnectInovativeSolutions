create table if not exists public.social_media_settings (
  id boolean primary key default true check (id = true),
  weekly_target integer not null default 3 check (weekly_target between 1 and 20),
  updated_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now()
);

insert into public.social_media_settings (id, weekly_target)
values (true, 3)
on conflict (id) do nothing;

create table if not exists public.social_media_posts (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  url text not null unique,
  platform text not null,
  title text,
  description text,
  image_url text,
  site_name text,
  submitted_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists social_media_posts_student_week_idx
  on public.social_media_posts (student_id, submitted_at desc);

create table if not exists public.social_media_reactions (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.social_media_posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  reaction_type text not null check (reaction_type in ('support', 'insightful', 'celebrate')),
  created_at timestamptz not null default now(),
  unique (post_id, user_id)
);

alter table public.social_media_settings enable row level security;
alter table public.social_media_posts enable row level security;
alter table public.social_media_reactions enable row level security;

create policy "Approved users read social settings" on public.social_media_settings
  for select using (auth.uid() is not null);
create policy "Admins manage social settings" on public.social_media_settings
  for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

create policy "Approved users read social posts" on public.social_media_posts
  for select using (auth.uid() is not null);
create policy "Students submit own social posts" on public.social_media_posts
  for insert with check (student_id = auth.uid());
create policy "Students delete own social posts" on public.social_media_posts
  for delete using (student_id = auth.uid());
create policy "Admins manage social posts" on public.social_media_posts
  for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

create policy "Approved users read social reactions" on public.social_media_reactions
  for select using (auth.uid() is not null);
create policy "Users manage own social reactions" on public.social_media_reactions
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "Admins manage social reactions" on public.social_media_reactions
  for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

grant select on public.social_media_settings to authenticated;
grant select, insert, delete on public.social_media_posts to authenticated;
grant select, insert, update, delete on public.social_media_reactions to authenticated;
grant all on public.social_media_settings, public.social_media_posts, public.social_media_reactions to service_role;
