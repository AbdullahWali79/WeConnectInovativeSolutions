-- A helping video can be assigned to one or several courses.
create table if not exists public.helping_video_courses (
  video_id uuid not null references public.helping_videos(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (video_id, course_id)
);

create index if not exists helping_video_courses_course_idx
  on public.helping_video_courses (course_id, video_id);

alter table public.helping_video_courses enable row level security;

create policy "Students can read helping video course assignments"
  on public.helping_video_courses for select
  using (auth.uid() is not null);

create policy "Admins can manage helping video course assignments"
  on public.helping_video_courses for all
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

grant select, insert, update, delete on public.helping_video_courses to authenticated;

-- Carry forward assignments created by the previous single-course migration.
insert into public.helping_video_courses (video_id, course_id)
select id, course_id from public.helping_videos where course_id is not null
on conflict (video_id, course_id) do nothing;
