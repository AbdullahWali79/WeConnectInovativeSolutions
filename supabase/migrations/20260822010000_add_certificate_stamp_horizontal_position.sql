alter table public.simple_certificates
  add column if not exists digital_stamp_offset_x integer not null default 40
  check (digital_stamp_offset_x between -240 and 240);
