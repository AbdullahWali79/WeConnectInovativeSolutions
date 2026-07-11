-- Add completed/passout trainee records for the public Trainees page.
-- Run this in Supabase SQL Editor.

alter table public.trainees
  add column if not exists university text,
  add column if not exists training_duration text;

drop policy if exists "Authenticated can read trainees" on public.trainees;
drop policy if exists "Public can read trainees" on public.trainees;

create policy "Public can read trainees" on public.trainees
  for select using (true);

insert into public.trainees (
  name,
  email,
  course_id,
  assigned_tasks,
  completed_tasks,
  pending_tasks,
  progress_percentage,
  status,
  university,
  training_duration,
  created_at,
  updated_at
)
select *
from (
  values
    (
      'Muhammad Hamza',
      'muhammad.hamza.ue@weconnect.test',
      (select id from public.courses where title ilike '%WordPress%' order by created_at desc limit 1),
      12, 12, 0, 100, 'completed', 'University of Education', '6 Month Internship',
      now() - interval '6 months', now()
    ),
    (
      'Ayesha Noor',
      'ayesha.noor.ue@weconnect.test',
      (select id from public.courses where title ilike '%Digital Marketing%' order by created_at desc limit 1),
      8, 8, 0, 100, 'completed', 'University of Education', '3 Month Internship',
      now() - interval '3 months', now()
    ),
    (
      'Ali Raza',
      'ali.raza.ue@weconnect.test',
      (select id from public.courses where title ilike '%MERN%' order by created_at desc limit 1),
      14, 14, 0, 100, 'completed', 'University of Education', '6 Month Internship',
      now() - interval '6 months', now()
    ),
    (
      'Fatima Zahra',
      'fatima.zahra.ue@weconnect.test',
      (select id from public.courses where title ilike '%App%' order by created_at desc limit 1),
      10, 10, 0, 100, 'completed', 'University of Education', '3 Month Internship',
      now() - interval '3 months', now()
    ),
    (
      'Usman Tariq',
      'usman.tariq.ue@weconnect.test',
      (select id from public.courses where title ilike '%Client%' order by created_at desc limit 1),
      9, 9, 0, 100, 'completed', 'University of Education', '3 Month Internship',
      now() - interval '3 months', now()
    ),
    (
      'Hira Iqbal',
      'hira.iqbal.ue@weconnect.test',
      (select id from public.courses where title ilike '%WordPress%' order by created_at desc limit 1),
      12, 12, 0, 100, 'completed', 'University of Education', '6 Month Internship',
      now() - interval '6 months', now()
    ),
    (
      'Ahmed Hassan',
      'ahmed.hassan.ue@weconnect.test',
      (select id from public.courses where title ilike '%Digital Marketing%' order by created_at desc limit 1),
      8, 8, 0, 100, 'completed', 'University of Education', '3 Month Internship',
      now() - interval '3 months', now()
    ),
    (
      'Sana Batool',
      'sana.batool.ue@weconnect.test',
      (select id from public.courses where title ilike '%MERN%' order by created_at desc limit 1),
      14, 14, 0, 100, 'completed', 'University of Education', '6 Month Internship',
      now() - interval '6 months', now()
    ),
    (
      'Bilal Ahmad',
      'bilal.ahmad.ue@weconnect.test',
      (select id from public.courses where title ilike '%App%' order by created_at desc limit 1),
      10, 10, 0, 100, 'completed', 'University of Education', '3 Month Internship',
      now() - interval '3 months', now()
    ),
    (
      'Mariam Khalid',
      'mariam.khalid.ue@weconnect.test',
      (select id from public.courses where title ilike '%Client%' order by created_at desc limit 1),
      9, 9, 0, 100, 'completed', 'University of Education', '3 Month Internship',
      now() - interval '3 months', now()
    )
) as seed(
  name,
  email,
  course_id,
  assigned_tasks,
  completed_tasks,
  pending_tasks,
  progress_percentage,
  status,
  university,
  training_duration,
  created_at,
  updated_at
)
where not exists (
  select 1
  from public.trainees existing
  where existing.email = seed.email
);
