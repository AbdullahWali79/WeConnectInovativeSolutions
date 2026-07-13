-- Shared scenarios target every client-hunting specialization. Leads themselves
-- remain restricted to a concrete specialization by their separate constraint.
alter table public.client_hunt_scenarios
  drop constraint if exists client_hunt_scenarios_specialization_check;

alter table public.client_hunt_scenarios
  add constraint client_hunt_scenarios_specialization_check
  check (
    specialization in (
      'all',
      'web_development',
      'app_development',
      'seo',
      'gmb',
      'social_media_marketing',
      'automation',
      'ecommerce',
      'other'
    )
  );
