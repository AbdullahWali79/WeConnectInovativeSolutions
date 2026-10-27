-- Keep client purchases and follow-ups as history. Legacy assignment dates are
-- estimates because the original data has no client-specific subscription term.
alter table public.am_clients
  add column if not exists marketing_opt_in boolean not null default false,
  add column if not exists marketing_opt_in_at timestamptz,
  add column if not exists marketing_opt_in_source text;

create table if not exists public.am_client_subscriptions (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.am_clients(id) on delete cascade,
  account_id uuid references public.am_accounts(id) on delete set null,
  tool_name text not null,
  start_date date not null,
  end_date date not null,
  paid_amount numeric(12,2) check (paid_amount is null or paid_amount >= 0),
  source text not null default 'manual' check (source in ('legacy', 'manual')),
  source_assignment_id uuid unique,
  created_at timestamptz not null default now(),
  check (end_date >= start_date)
);

create index if not exists am_client_subscriptions_client_tool_end_idx
  on public.am_client_subscriptions (client_id, tool_name, end_date desc);
create index if not exists am_client_subscriptions_end_idx
  on public.am_client_subscriptions (end_date);

create table if not exists public.am_renewal_followups (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.am_clients(id) on delete cascade,
  tool_name text not null,
  outcome text not null check (outcome in ('contacted', 'interested', 'not_interested')),
  notes text,
  next_follow_up_date date,
  contacted_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null
);

create index if not exists am_renewal_followups_client_tool_idx
  on public.am_renewal_followups (client_id, tool_name, contacted_at desc);
create index if not exists am_renewal_followups_next_idx
  on public.am_renewal_followups (next_follow_up_date)
  where next_follow_up_date is not null;

alter table public.am_client_subscriptions enable row level security;
alter table public.am_renewal_followups enable row level security;

-- The SQL Editor may have applied this before the CLI records migration history.
drop policy if exists "Admins can manage am_client_subscriptions" on public.am_client_subscriptions;
drop policy if exists "Admins can manage am_renewal_followups" on public.am_renewal_followups;
create policy "Admins can manage am_client_subscriptions"
  on public.am_client_subscriptions for all
  using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));
create policy "Admins can manage am_renewal_followups"
  on public.am_renewal_followups for all
  using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

insert into public.am_client_subscriptions (
  client_id, account_id, tool_name, start_date, end_date,
  paid_amount, source, source_assignment_id, created_at
)
select assignment.client_id, account.id, account.tool_name,
  least(coalesce(assignment.assigned_date, account.start_date, account.buy_date, account.created_at::date), account.end_date),
  account.end_date, null, 'legacy', assignment.id, assignment.created_at
from public.am_assignments assignment
join public.am_accounts account on account.id = assignment.account_id
where account.end_date is not null
on conflict (source_assignment_id) do nothing;

-- New links get an estimated term until an admin verifies the client's dates.
create or replace function public.am_estimate_subscription_for_assignment()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  linked_account public.am_accounts%rowtype;
begin
  select * into linked_account from public.am_accounts where id = new.account_id;
  if linked_account.end_date is not null then
    insert into public.am_client_subscriptions (
      client_id, account_id, tool_name, start_date, end_date,
      paid_amount, source, source_assignment_id, created_at
    ) values (
      new.client_id, new.account_id, linked_account.tool_name,
      least(coalesce(new.assigned_date, linked_account.start_date, linked_account.buy_date, current_date), linked_account.end_date),
      linked_account.end_date, null, 'legacy', new.id, new.created_at
    ) on conflict (source_assignment_id) do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists am_assignment_estimated_subscription on public.am_assignments;
create trigger am_assignment_estimated_subscription
  after insert on public.am_assignments
  for each row execute function public.am_estimate_subscription_for_assignment();
