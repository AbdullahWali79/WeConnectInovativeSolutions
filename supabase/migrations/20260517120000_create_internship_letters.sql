create table if not exists public.internship_letters (
  id uuid primary key default gen_random_uuid(),

  student_name text not null,
  father_name text not null,
  gender text not null check (gender in ('Male', 'Female')),
  student_id text not null,

  internship_role text not null,
  joining_date date not null,
  completion_date date not null,

  attendance_marks integer not null default 5 check (attendance_marks between 0 and 5),
  technical_marks integer not null default 20 check (technical_marks between 0 and 20),
  total_marks integer not null default 25 check (total_marks between 0 and 25),

  letter_date date not null default current_date,

  hr_manager_name text,
  ceo_name text,

  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists internship_letters_student_id_idx
  on public.internship_letters(student_id);

create index if not exists internship_letters_created_at_idx
  on public.internship_letters(created_at desc);

alter table public.internship_letters enable row level security;

drop policy if exists "Admins can manage internship letters" on public.internship_letters;
create policy "Admins can manage internship letters" on public.internship_letters
  for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

create or replace function public.set_internship_letters_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists internship_letters_updated_at on public.internship_letters;
create trigger internship_letters_updated_at
  before update on public.internship_letters
  for each row execute function public.set_internship_letters_updated_at();
