alter table public.simple_certificates
  add column if not exists digital_stamp_opacity numeric(4,3) not null default 0.15
  check (digital_stamp_opacity between 0 and 1);
