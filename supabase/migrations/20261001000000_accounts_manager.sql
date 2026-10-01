create table if not exists public.am_sellers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  platform text,
  phone text,
  whatsapp text,
  email text,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.am_clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text,
  whatsapp text,
  email text,
  company text,
  notes text,
  labels text,
  created_at timestamptz not null default now()
);

create table if not exists public.am_accounts (
  id uuid primary key default gen_random_uuid(),
  tool_name text not null,
  label text,
  link text,
  seller_id uuid references public.am_sellers(id) on delete set null,
  buy_price numeric not null default 0,
  buy_date date,
  purchase_notes text,
  login_email text,
  login_password text,
  linked_mail text,
  linked_mail_password text,
  plan_type text,
  extra_notes text,
  share_type text not null default 'shared',
  status text not null default 'active',
  total_slots integer not null default 1,
  start_date date,
  end_date date,
  created_at timestamptz not null default now()
);

create table if not exists public.am_assignments (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.am_accounts(id) on delete cascade,
  client_id uuid not null references public.am_clients(id) on delete cascade,
  assigned_date date not null default current_date,
  payment_status text not null default 'pending',
  pending_amount numeric not null default 0,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.am_bank_accounts (
  id uuid primary key default gen_random_uuid(),
  bank_name text not null,
  account_number text not null,
  account_title text not null,
  details text,
  created_at timestamptz not null default now()
);

-- Enable RLS
alter table public.am_sellers enable row level security;
alter table public.am_clients enable row level security;
alter table public.am_accounts enable row level security;
alter table public.am_assignments enable row level security;
alter table public.am_bank_accounts enable row level security;

-- Policies for Admins only
create policy "Admins can manage am_sellers" on public.am_sellers for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));
create policy "Admins can manage am_clients" on public.am_clients for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));
create policy "Admins can manage am_accounts" on public.am_accounts for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));
create policy "Admins can manage am_assignments" on public.am_assignments for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));
create policy "Admins can manage am_bank_accounts" on public.am_bank_accounts for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));
