alter table public.software_houses
  add column if not exists digital_stamp_url text,
  add column if not exists digital_stamp_size integer not null default 80 check (digital_stamp_size between 32 and 180);

alter table public.simple_certificates
  add column if not exists digital_stamp_url text,
  add column if not exists digital_stamp_size integer not null default 80 check (digital_stamp_size between 32 and 180);
