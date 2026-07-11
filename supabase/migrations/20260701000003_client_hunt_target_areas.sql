alter table public.client_hunt_leads
  add column if not exists target_areas text[] not null default array[]::text[];

update public.client_hunt_leads
set target_areas = case
  when coalesce(cardinality(target_areas), 0) > 0 then target_areas
  else array[specialization]
end;

create or replace function public.client_hunt_normalize_specializations(input_values text[])
returns text[]
language sql
immutable
as $$
  select coalesce(
    array(
      select distinct value
      from unnest(coalesce(input_values, array[]::text[])) as value
      where value in (
        'web_development',
        'app_development',
        'seo',
        'gmb',
        'social_media_marketing',
        'automation',
        'ecommerce',
        'other'
      )
    ),
    array[]::text[]
  );
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
  target_why_this_client text default null,
  target_target_areas text[] default null
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
  resolved_target_areas text[] := public.client_hunt_normalize_specializations(coalesce(target_target_areas, array[]::text[]));
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

  if coalesce(cardinality(resolved_target_areas), 0) = 0 then
    resolved_target_areas := array[target_specialization];
  end if;

  insert into public.client_hunt_leads (
    student_id,
    scenario_id,
    specialization,
    target_areas,
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
    resolved_target_areas,
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

grant execute on function public.submit_client_hunt_lead(uuid, text, text, text, text, text, text, text, text, text, text, text, text, text[]) to authenticated;
