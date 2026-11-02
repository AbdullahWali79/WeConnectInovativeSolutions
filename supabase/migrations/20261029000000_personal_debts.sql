-- Personal udhaar: payments given outside any shared account.
create table if not exists public.am_personal_debts (
  id uuid primary key default gen_random_uuid(),
  person_name text not null,
  phone text,
  amount numeric(12,2) not null default 0 check (amount >= 0),
  pending_amount numeric(12,2) not null default 0 check (pending_amount >= 0),
  payment_status text not null default 'pending' check (payment_status in ('pending', 'cleared')),
  notes text,
  debt_date date default current_date,
  created_at timestamptz not null default now()
);

create index if not exists am_personal_debts_status_idx
  on public.am_personal_debts (payment_status, created_at desc);

alter table public.am_personal_debts enable row level security;

-- The SQL Editor may have applied this before the CLI records migration history.
drop policy if exists "Admins can manage am_personal_debts" on public.am_personal_debts;
create policy "Admins can manage am_personal_debts"
  on public.am_personal_debts for all
  using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));
