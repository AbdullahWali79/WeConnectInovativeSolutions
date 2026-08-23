alter table public.public_client_hunt_submissions
  add column if not exists client_gmb_url text,
  add column if not exists client_phone text,
  add column if not exists client_has_whatsapp boolean;

