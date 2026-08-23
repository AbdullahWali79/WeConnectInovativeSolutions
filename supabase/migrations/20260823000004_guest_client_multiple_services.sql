alter table public.public_client_hunt_submissions
  add column if not exists services_required text[];

update public.public_client_hunt_submissions
set services_required = array[service_required]
where services_required is null or cardinality(services_required) = 0;

alter table public.public_client_hunt_submissions
  alter column services_required set default '{}'::text[];

create index if not exists public_client_hunt_submissions_services_idx
  on public.public_client_hunt_submissions using gin (services_required);
