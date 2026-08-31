-- Give Social Media Marketing the same 30-row syllabus as Advanced Digital Marketing.
-- Repeat-safe: existing days are updated and missing days are inserted.

begin;

with source_course as (
  select id
  from public.courses
  where lower(btrim(title)) = lower('Advanced Digital Marketing')
  order by created_at asc
  limit 1
), target_course as (
  select id
  from public.courses
  where lower(btrim(title)) = lower('Social Media Marketing')
  order by created_at asc
  limit 1
)
insert into public.course_topics (
  course_id,
  day_number,
  title,
  english_video,
  urdu_video,
  practice_project
)
select
  target_course.id,
  source_topic.day_number,
  source_topic.title,
  source_topic.english_video,
  source_topic.urdu_video,
  source_topic.practice_project
from source_course
join public.course_topics source_topic on source_topic.course_id = source_course.id
cross join target_course
on conflict (course_id, day_number) do update set
  title = excluded.title,
  english_video = excluded.english_video,
  urdu_video = excluded.urdu_video,
  practice_project = excluded.practice_project;

commit;
