alter table public.course_student_menu_controls
  add column if not exists sort_order integer not null default 0;
grant select, insert, update, delete on public.course_student_menu_controls to authenticated;
notify pgrst, 'reload schema';
