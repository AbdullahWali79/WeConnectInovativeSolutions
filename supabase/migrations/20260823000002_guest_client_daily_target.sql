alter table public.public_client_hunt_forms
  add column if not exists daily_target integer not null default 3 check (daily_target > 0 and daily_target <= 100);

