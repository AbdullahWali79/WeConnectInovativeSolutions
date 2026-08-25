alter table public.simple_certificates
  add column if not exists punctuality_percentage integer not null default 100 check (punctuality_percentage between 0 and 100),
  add column if not exists task_completion_percentage integer not null default 100 check (task_completion_percentage between 0 and 100),
  add column if not exists project_involvement_percentage integer not null default 100 check (project_involvement_percentage between 0 and 100);

alter table public.simple_certificates drop constraint if exists simple_certificates_template_style_check;
alter table public.simple_certificates add constraint simple_certificates_template_style_check
  check (template_style in ('modern', 'classic', 'executive', 'minimal', 'geometric', 'prestige'));
