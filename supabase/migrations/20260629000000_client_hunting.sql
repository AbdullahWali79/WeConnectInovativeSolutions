alter table public.profiles
  add column if not exists client_hunting_specialization text;

alter table public.profiles
  add column if not exists client_hunting_daily_target int;

update public.profiles
set client_hunting_daily_target = coalesce(client_hunting_daily_target, 3)
where role = 'student'
  and client_hunting_daily_target is null;

alter table public.profiles
  alter column client_hunting_daily_target set default 3;

create table if not exists public.client_hunt_scenarios (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  specialization text not null check (specialization in ('web_development', 'app_development', 'seo', 'gmb', 'social_media_marketing', 'automation', 'ecommerce', 'other')),
  target_count int not null default 3 check (target_count > 0),
  instructions text,
  scenario_date date not null default current_date,
  is_active boolean not null default true,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.client_hunt_leads (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  scenario_id uuid references public.client_hunt_scenarios(id) on delete set null,
  specialization text not null check (specialization in ('web_development', 'app_development', 'seo', 'gmb', 'social_media_marketing', 'automation', 'ecommerce', 'other')),
  client_name text not null,
  business_name text not null,
  website_url text,
  gmb_url text,
  facebook_page_url text,
  address text,
  phone_number text,
  whatsapp_number text,
  email text,
  note text,
  why_this_client text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'duplicate')),
  reviewer_notes text,
  duplicate_of_id uuid references public.client_hunt_leads(id) on delete set null,
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  submitted_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists client_hunt_scenarios_active_idx
  on public.client_hunt_scenarios (is_active, scenario_date desc, created_at desc);

create index if not exists client_hunt_scenarios_specialization_idx
  on public.client_hunt_scenarios (specialization, scenario_date desc, created_at desc);

create index if not exists client_hunt_leads_student_idx
  on public.client_hunt_leads (student_id, submitted_at desc);

create index if not exists client_hunt_leads_status_idx
  on public.client_hunt_leads (status, submitted_at desc);

create index if not exists client_hunt_leads_specialization_idx
  on public.client_hunt_leads (specialization, submitted_at desc);

create index if not exists client_hunt_leads_email_idx
  on public.client_hunt_leads (lower(email))
  where email is not null;

create index if not exists client_hunt_leads_phone_idx
  on public.client_hunt_leads (regexp_replace(coalesce(phone_number, ''), '[^0-9]+', '', 'g'))
  where phone_number is not null;

create index if not exists client_hunt_leads_whatsapp_idx
  on public.client_hunt_leads (regexp_replace(coalesce(whatsapp_number, ''), '[^0-9]+', '', 'g'))
  where whatsapp_number is not null;

create index if not exists client_hunt_leads_business_idx
  on public.client_hunt_leads (lower(business_name));

create or replace function public.client_hunt_normalize_text(input_value text)
returns text
language sql
immutable
as $$
  select nullif(lower(btrim(regexp_replace(coalesce(input_value, ''), '\s+', ' ', 'g'))), '');
$$;

create or replace function public.client_hunt_normalize_phone(input_value text)
returns text
language sql
immutable
as $$
  select nullif(regexp_replace(coalesce(input_value, ''), '[^0-9]+', '', 'g'), '');
$$;

create or replace function public.client_hunt_normalize_website(input_value text)
returns text
language plpgsql
immutable
as $$
declare
  resolved text := public.client_hunt_normalize_text(input_value);
begin
  if resolved is null then
    return null;
  end if;

  resolved := regexp_replace(resolved, '^https?://', '', 'i');
  resolved := regexp_replace(resolved, '^www\.', '', 'i');
  resolved := split_part(resolved, '/', 1);
  resolved := split_part(resolved, '?', 1);
  resolved := split_part(resolved, '#', 1);

  return nullif(resolved, '');
end;
$$;

create or replace function public.check_client_hunt_duplicate(
  target_student_id uuid,
  target_client_name text default null,
  target_business_name text default null,
  target_website_url text default null,
  target_gmb_url text default null,
  target_facebook_page_url text default null,
  target_address text default null,
  target_phone_number text default null,
  target_whatsapp_number text default null,
  target_email text default null
)
returns table (
  is_duplicate boolean,
  match_type text,
  match_value text,
  matched_lead_id uuid
)
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_email text := public.client_hunt_normalize_text(target_email);
  normalized_phone text := public.client_hunt_normalize_phone(target_phone_number);
  normalized_whatsapp text := public.client_hunt_normalize_phone(target_whatsapp_number);
  normalized_website text := public.client_hunt_normalize_website(target_website_url);
  normalized_gmb text := public.client_hunt_normalize_text(target_gmb_url);
  normalized_facebook text := public.client_hunt_normalize_text(target_facebook_page_url);
  normalized_business_name text := public.client_hunt_normalize_text(target_business_name);
  normalized_address text := public.client_hunt_normalize_text(target_address);
begin
  return query
  with matches as (
    select 1 as priority, 'email'::text as match_type, coalesce(email, '') as match_value, id as matched_lead_id
    from public.client_hunt_leads
    where normalized_email is not null
      and public.client_hunt_normalize_text(email) = normalized_email
    union all
    select 2, 'phone', coalesce(phone_number, ''), id
    from public.client_hunt_leads
    where normalized_phone is not null
      and public.client_hunt_normalize_phone(phone_number) = normalized_phone
    union all
    select 3, 'whatsapp', coalesce(whatsapp_number, ''), id
    from public.client_hunt_leads
    where normalized_whatsapp is not null
      and public.client_hunt_normalize_phone(whatsapp_number) = normalized_whatsapp
    union all
    select 4, 'website', coalesce(website_url, ''), id
    from public.client_hunt_leads
    where normalized_website is not null
      and public.client_hunt_normalize_website(website_url) = normalized_website
    union all
    select 5, 'gmb', coalesce(gmb_url, ''), id
    from public.client_hunt_leads
    where normalized_gmb is not null
      and public.client_hunt_normalize_text(gmb_url) = normalized_gmb
    union all
    select 6, 'facebook', coalesce(facebook_page_url, ''), id
    from public.client_hunt_leads
    where normalized_facebook is not null
      and public.client_hunt_normalize_text(facebook_page_url) = normalized_facebook
    union all
    select 7, 'business_name', coalesce(business_name, ''), id
    from public.client_hunt_leads
    where normalized_business_name is not null
      and public.client_hunt_normalize_text(business_name) = normalized_business_name
    union all
    select 8, 'address', coalesce(address, ''), id
    from public.client_hunt_leads
    where normalized_address is not null
      and public.client_hunt_normalize_text(address) = normalized_address
    union all
    select 9, 'client_name', coalesce(client_name, ''), id
    from public.client_hunt_leads
    where target_client_name is not null
      and public.client_hunt_normalize_text(client_name) = public.client_hunt_normalize_text(target_client_name)
  )
  select true, m.match_type, m.match_value, m.matched_lead_id
  from matches m
  order by priority
  limit 1;

  if not found then
    return query select false, null::text, null::text, null::uuid;
  end if;
end;
$$;

create or replace function public.submit_client_hunt_lead(
  target_scenario_id uuid,
  target_specialization text,
  target_client_name text,
  target_business_name text,
  target_website_url text default null,
  target_gmb_url text default null,
  target_facebook_page_url text default null,
  target_address text default null,
  target_phone_number text default null,
  target_whatsapp_number text default null,
  target_email text default null,
  target_note text default null,
  target_why_this_client text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  current_profile public.profiles%rowtype;
  duplicate_record record;
  inserted_id uuid;
begin
  select * into current_profile
  from public.profiles
  where id = auth.uid();

  if current_profile.id is null then
    raise exception 'Login required';
  end if;

  if current_profile.role not in ('student', 'admin') or current_profile.status <> 'approved' then
    raise exception 'Approved student access required';
  end if;

  if target_scenario_id is not null then
    perform 1
    from public.client_hunt_scenarios
    where id = target_scenario_id;

    if not found then
      raise exception 'Scenario not found';
    end if;
  end if;

  select * into duplicate_record
  from public.check_client_hunt_duplicate(
    auth.uid(),
    target_client_name,
    target_business_name,
    target_website_url,
    target_gmb_url,
    target_facebook_page_url,
    target_address,
    target_phone_number,
    target_whatsapp_number,
    target_email
  );

  if coalesce(duplicate_record.is_duplicate, false) then
    raise exception 'Duplicate lead detected by %: %', duplicate_record.match_type, duplicate_record.match_value;
  end if;

  insert into public.client_hunt_leads (
    student_id,
    scenario_id,
    specialization,
    client_name,
    business_name,
    website_url,
    gmb_url,
    facebook_page_url,
    address,
    phone_number,
    whatsapp_number,
    email,
    note,
    why_this_client,
    status,
    submitted_at,
    created_at,
    updated_at
  ) values (
    auth.uid(),
    target_scenario_id,
    target_specialization,
    target_client_name,
    target_business_name,
    nullif(btrim(target_website_url), ''),
    nullif(btrim(target_gmb_url), ''),
    nullif(btrim(target_facebook_page_url), ''),
    nullif(btrim(target_address), ''),
    nullif(btrim(target_phone_number), ''),
    nullif(btrim(target_whatsapp_number), ''),
    nullif(btrim(target_email), ''),
    nullif(btrim(target_note), ''),
    nullif(btrim(target_why_this_client), ''),
    'pending',
    now(),
    now(),
    now()
  )
  returning id into inserted_id;

  return inserted_id;
end;
$$;

create or replace function public.approve_client_hunt_lead(target_lead_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'Only approved admins can approve client hunt leads';
  end if;

  update public.client_hunt_leads
  set status = 'approved',
      reviewed_by = auth.uid(),
      reviewed_at = now(),
      updated_at = now()
  where id = target_lead_id;

  if not found then
    raise exception 'Lead not found';
  end if;
end;
$$;

create or replace function public.reject_client_hunt_lead(target_lead_id uuid, reviewer_notes text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'Only approved admins can reject client hunt leads';
  end if;

  update public.client_hunt_leads
  set status = 'rejected',
      reviewer_notes = nullif(btrim(reviewer_notes), ''),
      reviewed_by = auth.uid(),
      reviewed_at = now(),
      updated_at = now()
  where id = target_lead_id;

  if not found then
    raise exception 'Lead not found';
  end if;
end;
$$;

alter table public.client_hunt_scenarios enable row level security;
alter table public.client_hunt_leads enable row level security;

drop policy if exists "Client hunt scenarios are visible to approved users" on public.client_hunt_scenarios;
drop policy if exists "Admins can manage client hunt scenarios" on public.client_hunt_scenarios;
drop policy if exists "Students can read own client hunt leads" on public.client_hunt_leads;
drop policy if exists "Students can insert own client hunt leads" on public.client_hunt_leads;
drop policy if exists "Admins can manage client hunt leads" on public.client_hunt_leads;

create policy "Client hunt scenarios are visible to approved users" on public.client_hunt_scenarios
  for select using (is_active = true or public.is_admin(auth.uid()));

create policy "Admins can manage client hunt scenarios" on public.client_hunt_scenarios
  for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

create policy "Students can read own client hunt leads" on public.client_hunt_leads
  for select using (student_id = auth.uid() or public.is_admin(auth.uid()));

create policy "Students can insert own client hunt leads" on public.client_hunt_leads
  for insert with check (student_id = auth.uid() and status = 'pending');

create policy "Admins can manage client hunt leads" on public.client_hunt_leads
  for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

grant select, insert, update, delete on public.client_hunt_scenarios to authenticated;
grant select, insert, update, delete on public.client_hunt_leads to authenticated;
grant execute on function public.check_client_hunt_duplicate(uuid, text, text, text, text, text, text, text, text, text) to authenticated;
grant execute on function public.submit_client_hunt_lead(uuid, text, text, text, text, text, text, text, text, text, text, text, text) to authenticated;
grant execute on function public.approve_client_hunt_lead(uuid) to authenticated;
grant execute on function public.reject_client_hunt_lead(uuid, text) to authenticated;
