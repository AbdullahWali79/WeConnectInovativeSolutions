create table if not exists public.seat_reservation_settings (
  id boolean primary key default true check (id = true),
  total_seats integer not null default 20 check (total_seats between 1 and 500),
  default_fine numeric(10,2) not null default 500 check (default_fine >= 0),
  cancellation_minutes integer not null default 60 check (cancellation_minutes >= 0),
  grace_minutes integer not null default 30 check (grace_minutes >= 0),
  block_on_unpaid_fine boolean not null default true,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id) on delete set null
);

insert into public.seat_reservation_settings (id) values (true) on conflict (id) do nothing;

create table if not exists public.seat_slots (
  id uuid primary key default gen_random_uuid(),
  slot_date date not null,
  start_time time not null,
  end_time time not null,
  capacity integer check (capacity is null or capacity > 0),
  is_active boolean not null default true,
  notes text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  check (end_time > start_time),
  unique (slot_date, start_time, end_time)
);

create table if not exists public.seat_reservations (
  id uuid primary key default gen_random_uuid(),
  slot_id uuid not null references public.seat_slots(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'reserved' check (status in ('reserved','checked_in','cancelled','no_show')),
  checked_in_at timestamptz,
  cancelled_at timestamptz,
  admin_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (slot_id, student_id)
);

create table if not exists public.seat_fines (
  id uuid primary key default gen_random_uuid(),
  reservation_id uuid not null unique references public.seat_reservations(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  amount numeric(10,2) not null check (amount >= 0),
  status text not null default 'unpaid' check (status in ('unpaid','paid','waived')),
  reason text not null default 'Reserved seat was not used',
  resolved_at timestamptz,
  resolved_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists seat_slots_date_idx on public.seat_slots (slot_date, start_time);
create index if not exists seat_reservations_slot_status_idx on public.seat_reservations (slot_id, status);
create index if not exists seat_reservations_student_idx on public.seat_reservations (student_id, created_at desc);
create index if not exists seat_fines_student_status_idx on public.seat_fines (student_id, status);

alter table public.seat_reservation_settings enable row level security;
alter table public.seat_slots enable row level security;
alter table public.seat_reservations enable row level security;
alter table public.seat_fines enable row level security;

create policy "Authenticated users read seat settings" on public.seat_reservation_settings for select using (auth.uid() is not null);
create policy "Admins manage seat settings" on public.seat_reservation_settings for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));
create policy "Authenticated users read seat slots" on public.seat_slots for select using (auth.uid() is not null);
create policy "Admins manage seat slots" on public.seat_slots for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));
create policy "Students read own reservations" on public.seat_reservations for select using (student_id = auth.uid());
create policy "Admins read all reservations" on public.seat_reservations for select using (public.is_admin(auth.uid()));
create policy "Admins manage reservations" on public.seat_reservations for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));
create policy "Students read own fines" on public.seat_fines for select using (student_id = auth.uid());
create policy "Admins manage fines" on public.seat_fines for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

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

create or replace function public.cancel_seat_reservation(target_reservation_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare slot_start timestamptz; cutoff integer;
begin
  select (s.slot_date + s.start_time), st.cancellation_minutes into slot_start, cutoff
  from public.seat_reservations r join public.seat_slots s on s.id = r.slot_id
  cross join public.seat_reservation_settings st
  where r.id = target_reservation_id and r.student_id = auth.uid() and r.status = 'reserved' for update of r;
  if not found then raise exception 'Active reservation not found.'; end if;
  if now() > slot_start - make_interval(mins => cutoff) then raise exception 'The cancellation deadline has passed.'; end if;
  update public.seat_reservations set status = 'cancelled', cancelled_at = now(), updated_at = now() where id = target_reservation_id;
end; $$;

create or replace function public.get_seat_slot_availability()
returns table (slot_id uuid, reserved_count bigint)
language sql security definer set search_path = public stable as $$
  select s.id, count(r.id)
  from public.seat_slots s
  left join public.seat_reservations r on r.slot_id = s.id and r.status in ('reserved','checked_in')
  where s.is_active = true and s.slot_date >= current_date
  group by s.id;
$$;

grant select on public.seat_reservation_settings, public.seat_slots, public.seat_reservations, public.seat_fines to authenticated;
grant execute on function public.reserve_seat(uuid), public.cancel_seat_reservation(uuid) to authenticated;
grant execute on function public.get_seat_slot_availability() to authenticated;
grant all on public.seat_reservation_settings, public.seat_slots, public.seat_reservations, public.seat_fines to service_role;
