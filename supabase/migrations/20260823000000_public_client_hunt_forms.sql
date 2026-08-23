create table if not exists public.public_client_hunt_forms (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  description text,
  is_active boolean not null default true,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.public_client_hunt_keywords (
  id uuid primary key default gen_random_uuid(),
  form_id uuid not null references public.public_client_hunt_forms(id) on delete cascade,
  keyword text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (form_id, keyword)
);

create table if not exists public.public_client_hunt_submissions (
  id uuid primary key default gen_random_uuid(),
  form_id uuid not null references public.public_client_hunt_forms(id) on delete cascade,
  keyword_id uuid references public.public_client_hunt_keywords(id) on delete set null,
  keyword_snapshot text not null,
  submitter_name text not null,
  submitter_phone text not null,
  client_name text,
  website_url text not null,
  service_required text not null check (service_required in ('website_development','chatbot','mobile_app','social_media_marketing','seo','ecommerce','automation','other')),
  notes text,
  submitted_at timestamptz not null default now()
);

create index if not exists public_client_hunt_submissions_form_idx on public.public_client_hunt_submissions (form_id, submitted_at desc);
create index if not exists public_client_hunt_submissions_name_idx on public.public_client_hunt_submissions (lower(submitter_name));
create index if not exists public_client_hunt_submissions_service_idx on public.public_client_hunt_submissions (service_required, submitted_at desc);
create index if not exists public_client_hunt_submissions_keyword_idx on public.public_client_hunt_submissions (keyword_id, submitted_at desc);

alter table public.public_client_hunt_forms enable row level security;
alter table public.public_client_hunt_keywords enable row level security;
alter table public.public_client_hunt_submissions enable row level security;

-- Public reads are limited to active form configuration. Submissions are made
-- through a validated server action using the service role.
create policy "Public can read active client hunt forms" on public.public_client_hunt_forms
  for select using (is_active = true);
create policy "Public can read active client hunt keywords" on public.public_client_hunt_keywords
  for select using (is_active = true and exists (
    select 1 from public.public_client_hunt_forms f where f.id = form_id and f.is_active = true
  ));

grant select on public.public_client_hunt_forms, public.public_client_hunt_keywords to anon, authenticated;

