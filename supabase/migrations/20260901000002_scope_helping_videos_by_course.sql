-- Separate universal must-watch videos from course-specific helping videos.
alter table public.helping_videos
  add column if not exists course_id uuid references public.courses(id) on delete cascade,
  add column if not exists is_must_watch boolean not null default false;

create index if not exists helping_videos_course_status_idx
  on public.helping_videos (course_id, status, display_order);

-- Preserve the existing portal introduction as a universal must-watch video.
update public.helping_videos
set is_must_watch = true, course_id = null
where lower(title) like '%use this updated we connect%'
   or lower(coalesce(description, '')) like '%must watch%';

-- Assign existing social-media tutorials to the Social Media Marketing course.
update public.helping_videos
set course_id = (
  select id from public.courses
  where lower(btrim(title)) = lower('Social Media Marketing')
  order by created_at asc limit 1
), is_must_watch = false
where lower(title) like '%social media%'
  and exists (select 1 from public.courses where lower(btrim(title)) = lower('Social Media Marketing'));
