alter table public.profiles
add column if not exists weak_areas text;

alter table public.profiles
add column if not exists next_focus text;

alter table public.profiles
add column if not exists follow_up_date date;
