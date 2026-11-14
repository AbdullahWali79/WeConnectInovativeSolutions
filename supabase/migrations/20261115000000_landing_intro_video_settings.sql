-- Migration to support customizable intro video on the public landing page with admin controls

create table if not exists public.landing_video_settings (
  id boolean primary key default true check (id),
  is_enabled boolean not null default true,
  video_url text not null default 'https://drive.google.com/file/d/1HsJoWqo2Fd-EBlRwAHP5iFgWYrk-vV2o/view?usp=sharing',
  badge_text text not null default 'Company Intro Video',
  title text not null default 'See How We Build & Automate Digital Solutions',
  description text default 'Watch our quick introductory walkthrough of what WeConnect Innovative Solutions does, how we build custom software, and how we automate workflows for businesses worldwide.',
  button_label text default 'Watch Intro Video',
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);

insert into public.landing_video_settings (
  id,
  is_enabled,
  video_url,
  badge_text,
  title,
  description,
  button_label
)
values (
  true,
  true,
  'https://drive.google.com/file/d/1HsJoWqo2Fd-EBlRwAHP5iFgWYrk-vV2o/view?usp=sharing',
  'Company Intro Video',
  'See How We Build & Automate Digital Solutions',
  'Watch our quick introductory walkthrough of what WeConnect Innovative Solutions does, how we build custom software, and how we automate workflows for businesses worldwide.',
  'Watch Intro Video'
)
on conflict (id) do nothing;

alter table public.landing_video_settings enable row level security;

-- Public can read landing video settings
drop policy if exists "Public can read landing video settings" on public.landing_video_settings;
create policy "Public can read landing video settings"
  on public.landing_video_settings for select
  using (true);

-- Admins can manage landing video settings
drop policy if exists "Admins can update landing video settings" on public.landing_video_settings;
create policy "Admins can update landing video settings"
  on public.landing_video_settings for all
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));
