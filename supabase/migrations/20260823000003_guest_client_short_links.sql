alter table public.public_client_hunt_forms
  add column if not exists short_code text unique;

create index if not exists public_client_hunt_forms_short_code_idx
  on public.public_client_hunt_forms (short_code)
  where short_code is not null;

