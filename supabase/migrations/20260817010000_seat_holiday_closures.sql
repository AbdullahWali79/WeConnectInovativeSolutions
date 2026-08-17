create table if not exists public.seat_holiday_closures (
  id uuid primary key default gen_random_uuid(),
  closure_date date not null unique,
  title text not null default 'Holiday',
  message text not null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.seat_holiday_closures enable row level security;

create policy "Authenticated users read seat holidays" on public.seat_holiday_closures
  for select using (auth.uid() is not null);
create policy "Admins manage seat holidays" on public.seat_holiday_closures
  for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

grant select on public.seat_holiday_closures to authenticated;
grant all on public.seat_holiday_closures to service_role;

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
  select * into selected_slot from public.seat_slots where id = target_slot_id for update;
  if not found or not selected_slot.is_active then raise exception 'This slot is not available.'; end if;
  if exists (select 1 from public.seat_holiday_closures where closure_date = selected_slot.slot_date) then
    raise exception 'The software house is closed on this date. Seat reservation is unavailable.';
  end if;
  if (selected_slot.slot_date + selected_slot.start_time) <= now() then raise exception 'This slot has already started.'; end if;
  select * into settings from public.seat_reservation_settings where id = true;
  if settings.block_on_unpaid_fine and exists (select 1 from public.seat_fines where student_id = target_student and status = 'unpaid') then
    raise exception 'Please clear your unpaid fine before reserving another seat.';
  end if;
  select count(*) into active_count from public.seat_reservations where slot_id = target_slot_id and status in ('reserved','checked_in');
  if active_count >= coalesce(selected_slot.capacity, settings.total_seats) then raise exception 'Sorry, this slot is full.'; end if;
  insert into public.seat_reservations (slot_id, student_id, status, cancelled_at, updated_at)
  values (target_slot_id, target_student, 'reserved', null, now())
  on conflict (slot_id, student_id) do update set status = 'reserved', cancelled_at = null, checked_in_at = null, updated_at = now()
  where public.seat_reservations.status = 'cancelled'
  returning id into reservation_id;
  if reservation_id is null then raise exception 'You have already reserved this slot.'; end if;
  return reservation_id;
end; $$;
