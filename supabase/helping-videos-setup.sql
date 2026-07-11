-- Helping Videos setup script for Supabase SQL Editor
-- Run this file in Supabase SQL Editor to create the database objects
-- needed for the Student/Help Videos feature.

create table if not exists public.helping_videos (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  youtube_url text not null,
  description text,
  status text check (status in ('active','inactive')) default 'active',
  display_order int default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists helping_videos_status_order_idx
  on public.helping_videos (status, display_order, created_at desc);

create or replace function public.set_helping_videos_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists helping_videos_updated_at on public.helping_videos;
create trigger helping_videos_updated_at
  before update on public.helping_videos
  for each row execute function public.set_helping_videos_updated_at();

alter table public.helping_videos enable row level security;

drop policy if exists "Public can read active helping videos" on public.helping_videos;
drop policy if exists "Admins can manage helping videos" on public.helping_videos;

create policy "Public can read active helping videos" on public.helping_videos
  for select using (status = 'active' or public.is_admin(auth.uid()));

create policy "Admins can manage helping videos" on public.helping_videos
  for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

grant select, insert, update, delete on public.helping_videos to authenticated, anon;

-- Optional sample rows:
-- insert into public.helping_videos (title, youtube_url, description, status, display_order)
-- values
--   (
--     'How to submit a task',
--     'https://www.youtube.com/watch?v=YOUR_VIDEO_ID',
--     'Step-by-step walkthrough for submitting task proof in the student portal.',
--     'active',
--     1
--   ),
--   (
--     'How to check progress',
--     'https://youtu.be/YOUR_VIDEO_ID',
--     'Quick guide for viewing your progress, tasks, and submission history.',
--     'active',
--     2
--   );
