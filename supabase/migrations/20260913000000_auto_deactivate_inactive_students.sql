begin;

-- Older production databases may not have the optional lifecycle migration.
-- Account access still uses status; preserve any existing lifecycle values.
alter table public.profiles
  add column if not exists admin_status text default 'approved'
  constraint profiles_admin_status_check
  check (admin_status in ('approved', 'active', 'completed', 'inactive'));

update public.profiles
set admin_status = 'inactive'
where role = 'student' and status = 'rejected'
  and (admin_status is null or admin_status = 'approved');

-- Run independently of website visits. Requires Supabase Cron.
create extension if not exists pg_cron with schema pg_catalog;

-- Keep the inactivity clock inaccessible to student writes.
create table public.student_inactivity_clock (
  student_id uuid primary key references public.profiles(id) on delete cascade,
  last_active_at timestamptz not null
);
alter table public.student_inactivity_clock enable row level security;
revoke all on public.student_inactivity_clock from anon, authenticated;

-- Existing accounts use their latest known activity/login, or account creation
-- when they have never visited. Do not reset everyone's timer on installation.
insert into public.student_inactivity_clock (student_id, last_active_at)
select p.id, greatest(
  coalesce(p.created_at, now()),
  u.last_sign_in_at,
  (select max(a.last_seen_at) from public.student_activity_daily a where a.student_id = p.id)
)
from public.profiles p
join auth.users u on u.id = p.id
where p.role = 'student';

create function public.reset_student_inactivity_clock()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  if new.role = 'student' and new.status = 'approved' then
    if tg_op = 'INSERT' then
      insert into public.student_inactivity_clock values (new.id, now())
      on conflict (student_id) do update set last_active_at = now();
    elsif old.status is distinct from new.status or old.role is distinct from new.role then
      insert into public.student_inactivity_clock values (new.id, now())
      on conflict (student_id) do update set last_active_at = now();
    end if;
  end if;
  return new;
end;
$$;
revoke all on function public.reset_student_inactivity_clock() from public, anon, authenticated;
create trigger reset_student_inactivity_clock
after insert or update of status, role on public.profiles
for each row execute function public.reset_student_inactivity_clock();

create function public.deactivate_inactive_students()
returns integer language plpgsql security definer set search_path = public
as $$
declare
  student record;
  changed integer := 0;
begin
  -- Lock profiles first, just like activity recording and admin activation.
  -- Recheck the clock after acquiring the lock to avoid racing a recent visit.
  for student in
    select p.id from public.profiles p
    join public.student_inactivity_clock c on c.student_id = p.id
    where p.role = 'student' and p.status = 'approved'
      and c.last_active_at <= now() - interval '7 days'
    order by p.id for update of p
  loop
    if exists (select 1 from public.student_inactivity_clock
      where student_id = student.id and last_active_at <= now() - interval '7 days') then
      update public.profiles set status = 'rejected', admin_status = 'inactive'
      where id = student.id and role = 'student' and status = 'approved';
      if found then changed := changed + 1; end if;
    end if;
  end loop;
  return changed;
end;
$$;
revoke all on function public.deactivate_inactive_students() from public, anon, authenticated;
grant execute on function public.deactivate_inactive_students() to service_role;

create or replace function public.record_student_activity(
  p_event_type text,
  p_path text,
  p_label text default null,
  p_active_seconds integer default 0
) returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_student_id uuid := auth.uid();
  v_today date := (now() at time zone 'Asia/Karachi')::date;
  v_seconds integer := greatest(0, least(coalesce(p_active_seconds, 0), 60));
  v_page_views integer := case when p_event_type = 'page_view' then 1 else 0 end;
  v_submits integer := case when p_event_type = 'submit' then 1 else 0 end;
begin
  if p_event_type is null or p_event_type not in ('page_view', 'submit', 'heartbeat') then
    raise exception 'Unsupported activity type';
  end if;

  perform 1 from public.profiles
  where id = v_student_id and role = 'student' and status = 'approved'
  for update;
  if not found then
    raise exception 'Only approved students can record activity';
  end if;

  -- A late visit must not reactivate the account between scheduled checks.
  if exists (select 1 from public.student_inactivity_clock
    where student_id = v_student_id and last_active_at <= now() - interval '7 days') then
    update public.profiles set status = 'rejected', admin_status = 'inactive'
    where id = v_student_id;
    -- Return normally so the deactivation commits instead of rolling back.
    return;
  end if;

  insert into public.student_inactivity_clock values (v_student_id, now())
  on conflict (student_id) do update set last_active_at = now();

  insert into public.student_activity_daily (
    student_id, activity_date, first_seen_at, last_seen_at, active_seconds, page_views, submit_actions
  ) values (
    v_student_id, v_today, now(), now(), v_seconds, v_page_views, v_submits
  )
  on conflict (student_id, activity_date) do update set
    last_seen_at = now(),
    active_seconds = student_activity_daily.active_seconds + excluded.active_seconds,
    page_views = student_activity_daily.page_views + excluded.page_views,
    submit_actions = student_activity_daily.submit_actions + excluded.submit_actions;

  if p_event_type in ('page_view', 'submit') then
    insert into public.student_activity_events(student_id, event_type, path, label)
    values (v_student_id, p_event_type, left(coalesce(p_path, '/student'), 500), left(nullif(trim(p_label), ''), 500));
  end if;
end;
$$;
revoke all on function public.record_student_activity(text, text, text, integer) from public;
grant execute on function public.record_student_activity(text, text, text, integer) to authenticated;

select public.deactivate_inactive_students();
select cron.schedule('deactivate-inactive-students', '* * * * *',
  'select public.deactivate_inactive_students()');

commit;
