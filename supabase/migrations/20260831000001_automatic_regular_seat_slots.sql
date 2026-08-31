-- Automatically maintain regular seat slots in Pakistan time.
-- Working days: Monday through Thursday, 09:00 to 13:00.

begin;

-- Close any future weekend slots that may have been created manually.
update public.seat_slots
set is_active = false
where slot_date >= (now() at time zone 'Asia/Karachi')::date
  and extract(isodow from slot_date) in (5, 6, 7);

create or replace function public.ensure_regular_seat_slots(days_ahead integer default 90)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  inserted_count integer;
  pakistan_today date := (now() at time zone 'Asia/Karachi')::date;
begin
  if auth.uid() is null then
    raise exception 'You must be signed in.';
  end if;

  insert into public.seat_slots (slot_date, start_time, end_time, notes)
  select slot_day::date, time '09:00', time '13:00', 'Regular Monday-Thursday schedule'
  from generate_series(
    pakistan_today::timestamp,
    (pakistan_today + least(greatest(days_ahead, 1), 366))::timestamp,
    interval '1 day'
  ) as slot_day
  where extract(isodow from slot_day) between 1 and 4
  on conflict (slot_date, start_time, end_time) do nothing;

  get diagnostics inserted_count = row_count;
  return inserted_count;
end;
$$;

grant execute on function public.ensure_regular_seat_slots(integer) to authenticated;

-- Keep weekends closed even if an old or manually-created slot is active.
create or replace function public.reserve_seat(target_slot_id uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  target_student uuid := auth.uid();
  selected_slot public.seat_slots%rowtype;
  settings public.seat_reservation_settings%rowtype;
  active_count integer;
  reservation_id uuid;
begin
  if target_student is null then raise exception 'You must be signed in.'; end if;

  select * into selected_slot
  from public.seat_slots
  where id = target_slot_id
  for update;

  if not found or not selected_slot.is_active then
    raise exception 'This slot is not available.';
  end if;

  if extract(isodow from selected_slot.slot_date) not between 1 and 4 then
    raise exception 'Seat reservations are closed Friday through Sunday.';
  end if;

  if exists (
    select 1 from public.seat_holiday_closures
    where closure_date = selected_slot.slot_date
  ) then
    raise exception 'The software house is closed on this date. Seat reservation is unavailable.';
  end if;

  if (selected_slot.slot_date + selected_slot.end_time) <= (now() at time zone 'Asia/Karachi') then
    raise exception 'This slot has already ended.';
  end if;

  select * into settings from public.seat_reservation_settings where id = true;

  if settings.block_on_unpaid_fine and exists (
    select 1 from public.seat_fines
    where student_id = target_student and status = 'unpaid'
  ) then
    raise exception 'Please clear your unpaid fine before reserving another seat.';
  end if;

  select count(*) into active_count
  from public.seat_reservations
  where slot_id = target_slot_id and status in ('reserved', 'checked_in');

  if active_count >= coalesce(selected_slot.capacity, settings.total_seats) then
    raise exception 'Sorry, this slot is full.';
  end if;

  insert into public.seat_reservations (slot_id, student_id, status, cancelled_at, updated_at)
  values (target_slot_id, target_student, 'reserved', null, now())
  on conflict (slot_id, student_id) do update
    set status = 'reserved', cancelled_at = null, checked_in_at = null, updated_at = now()
    where public.seat_reservations.status = 'cancelled'
  returning id into reservation_id;

  if reservation_id is null then
    raise exception 'You have already reserved this slot.';
  end if;

  return reservation_id;
end;
$$;

grant execute on function public.reserve_seat(uuid) to authenticated;

commit;
