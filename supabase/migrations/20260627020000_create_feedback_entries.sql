create type if not exists public.feedback_audience_type as enum ('student', 'client');
create type if not exists public.feedback_status_type as enum ('pending', 'approved', 'rejected');

create table if not exists public.feedback_entries (
  id uuid primary key default gen_random_uuid(),
  audience_type public.feedback_audience_type not null,
  category text not null,
  name text not null,
  email text,
  phone text,
  rating int not null default 5 check (rating between 1 and 5),
  title text,
  message text not null,
  status public.feedback_status_type not null default 'pending',
  reviewer_notes text,
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  published_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_feedback_entries_status on public.feedback_entries(status);
create index if not exists idx_feedback_entries_audience_type on public.feedback_entries(audience_type);
create index if not exists idx_feedback_entries_category on public.feedback_entries(category);
create index if not exists idx_feedback_entries_created_at on public.feedback_entries(created_at desc);

create or replace function public.set_feedback_entries_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists feedback_entries_updated_at on public.feedback_entries;
create trigger feedback_entries_updated_at
  before update on public.feedback_entries
  for each row execute function public.set_feedback_entries_updated_at();

alter table public.feedback_entries enable row level security;

drop policy if exists "Anyone can submit feedback" on public.feedback_entries;
drop policy if exists "Public can read approved feedback" on public.feedback_entries;
drop policy if exists "Admins can manage feedback" on public.feedback_entries;

create policy "Anyone can submit feedback" on public.feedback_entries
  for insert
  with check (true);

create policy "Public can read approved feedback" on public.feedback_entries
  for select
  using (status = 'approved');

create policy "Admins can manage feedback" on public.feedback_entries
  for all
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

grant select, insert on public.feedback_entries to authenticated, anon;
