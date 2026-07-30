create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  category text not null,
  icon text not null default 'design_services',
  short_description text not null,
  description text not null,
  highlights text[] not null default '{}',
  cta_label text not null default 'Discuss your project',
  cta_link text not null default '/contact',
  featured boolean not null default false,
  status text not null default 'active' check (status in ('active', 'inactive')),
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists services_status_order_idx on public.services (status, display_order, created_at);
alter table public.services enable row level security;

drop policy if exists "Public can read active services" on public.services;
drop policy if exists "Admins can manage services" on public.services;

create policy "Public can read active services" on public.services
  for select using (status = 'active' or public.is_admin(auth.uid()));

create policy "Admins can manage services" on public.services
  for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

grant select on public.services to anon, authenticated;
grant insert, update, delete on public.services to authenticated;

insert into public.services (title, slug, category, icon, short_description, description, highlights, featured, display_order)
values
  ('Custom Web Development', 'custom-web-development', 'Engineering', 'language', 'Fast, secure websites and web applications built around your business.', 'From conversion-focused company websites to advanced portals and dashboards, we design and develop responsive digital experiences using modern, scalable technology.', array['Business websites','Web applications & portals','Performance and security'], true, 1),
  ('WordPress & E-commerce', 'wordpress-ecommerce', 'Commerce', 'shopping_cart', 'Professional WordPress stores and content platforms that are easy to manage.', 'Launch or modernize your online business with tailored WordPress, WooCommerce, product catalog, payment and order-management solutions.', array['WordPress development','WooCommerce stores','Maintenance & optimization'], true, 2),
  ('Mobile App Development', 'mobile-app-development', 'Engineering', 'smartphone', 'Cross-platform mobile products designed for real users and business growth.', 'We create polished Flutter applications with reliable API integrations, intuitive journeys and maintainable code for Android and iOS.', array['Flutter apps','API integration','App UI & release support'], true, 3),
  ('AI Automation & Assistants', 'ai-automation-assistants', 'Artificial Intelligence', 'auto_awesome', 'Practical AI workflows that reduce repetitive work and improve response time.', 'We build custom AI assistants, document workflows, content systems and operational automations aligned with your team and data.', array['Custom AI assistants','Workflow automation','LLM integration'], true, 4),
  ('Digital Marketing & Growth', 'digital-marketing-growth', 'Marketing', 'campaign', 'Connected campaigns across search, social media and local business channels.', 'Our growth services combine content planning, social media, SEO, Google Business Profile and measurable campaign execution.', array['Social media marketing','SEO & local visibility','Campaign strategy'], false, 5),
  ('UI/UX & Product Design', 'ui-ux-product-design', 'Design', 'draw', 'Clear, accessible interfaces that make complex products feel simple.', 'We turn ideas and requirements into user flows, wireframes, high-fidelity interfaces and reusable design systems ready for development.', array['UX research & flows','Interface design','Design systems'], false, 6),
  ('Research & Data Consultancy', 'research-data-consultancy', 'Consultancy', 'science', 'Structured research support, analysis and evidence-led reporting.', 'Our team supports academic and business research with methodology guidance, data analysis, visualization and professional reporting.', array['Research planning','Data analysis','Reports & visualization'], false, 7),
  ('Corporate Training Solutions', 'corporate-training-solutions', 'Learning', 'school', 'Job-relevant technology and digital skills training for teams.', 'Drawing from our active course catalog, we build practical training programs in web development, AI, WordPress, marketing and professional digital skills.', array['Custom learning tracks','Hands-on projects','Progress reporting'], false, 8)
on conflict (slug) do nothing;
