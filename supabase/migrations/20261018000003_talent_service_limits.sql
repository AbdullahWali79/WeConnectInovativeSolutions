alter table public.talent_profiles
  add column if not exists service_limit integer not null default 1;

alter table public.talent_profiles
  drop constraint if exists talent_profiles_service_limit_check;

alter table public.talent_profiles
  add constraint talent_profiles_service_limit_check check (service_limit between 1 and 4);

update public.talent_profiles
set service_limit = 1
where service_limit is null or service_limit < 1 or service_limit > 4;
