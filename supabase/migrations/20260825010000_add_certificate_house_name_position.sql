alter table public.simple_certificates
  add column if not exists software_house_name_position_x integer not null default 9 check (software_house_name_position_x between 2 and 80),
  add column if not exists software_house_name_position_y integer not null default 9 check (software_house_name_position_y between 2 and 80);
