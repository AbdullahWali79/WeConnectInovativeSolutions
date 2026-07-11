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
