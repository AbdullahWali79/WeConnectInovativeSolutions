alter table public.profiles
  add column if not exists admin_status text;

update public.profiles
set admin_status = case
  when status = 'rejected' then 'inactive'
  else 'approved'
end
where role = 'student'
  and admin_status is null;

alter table public.profiles
  alter column admin_status set default 'approved';

do $$
begin
  alter table public.profiles drop constraint if exists profiles_admin_status_check;
exception
  when undefined_object then null;
end $$;

alter table public.profiles
  add constraint profiles_admin_status_check
  check (admin_status in ('approved', 'active', 'completed', 'inactive'));
