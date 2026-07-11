do $$
declare
  web_id uuid;
  ai_id uuid;
  marketing_id uuid;
  uiux_id uuid;
  app_id uuid;
begin
  insert into public.course_categories (name, description)
  select 'Web Development', 'Frontend, backend, WordPress, and production web engineering.'
  where not exists (select 1 from public.course_categories where lower(name) = lower('Web Development'));

  insert into public.course_categories (name, description)
  select 'AI Automation', 'Automation systems, chatbot workflows, and AI-powered business operations.'
  where not exists (select 1 from public.course_categories where lower(name) = lower('AI Automation'));

  insert into public.course_categories (name, description)
  select 'Digital Marketing', 'Campaign strategy, analytics, and growth workflows.'
  where not exists (select 1 from public.course_categories where lower(name) = lower('Digital Marketing'));

  insert into public.course_categories (name, description)
  select 'UI/UX Design', 'Product design, prototyping, and AI-assisted design systems.'
  where not exists (select 1 from public.course_categories where lower(name) = lower('UI/UX Design'));

  insert into public.course_categories (name, description)
  select 'App Development', 'Mobile app development and deployment workflows.'
  where not exists (select 1 from public.course_categories where lower(name) = lower('App Development'));

  select id into web_id from public.course_categories where name = 'Web Development' limit 1;
  select id into ai_id from public.course_categories where name = 'AI Automation' limit 1;
  select id into marketing_id from public.course_categories where name = 'Digital Marketing' limit 1;
  select id into uiux_id from public.course_categories where name = 'UI/UX Design' limit 1;
  select id into app_id from public.course_categories where name = 'App Development' limit 1;

  insert into public.courses (category_id, title, description, duration, level, status)
  select web_id, 'WordPress Development', 'Build responsive WordPress websites, customize themes, and deploy client-ready projects.', '8 weeks', 'Beginner to Intermediate', 'active'
  where not exists (select 1 from public.courses where lower(title) = lower('WordPress Development'));

  insert into public.courses (category_id, title, description, duration, level, status)
  select ai_id, 'AI Automation with n8n', 'Design AI automation workflows using n8n, APIs, triggers, and business integrations.', '6 weeks', 'Intermediate', 'active'
  where not exists (select 1 from public.courses where lower(title) = lower('AI Automation with n8n'));

  insert into public.courses (category_id, title, description, duration, level, status)
  select ai_id, 'Botpress Chatbot Development', 'Create production chatbot flows, knowledge bases, and customer support automations.', '5 weeks', 'Beginner to Intermediate', 'active'
  where not exists (select 1 from public.courses where lower(title) = lower('Botpress Chatbot Development'));

  insert into public.courses (category_id, title, description, duration, level, status)
  select marketing_id, 'Social Media Marketing', 'Plan content, launch campaigns, and measure performance across social channels.', '4 weeks', 'Beginner', 'active'
  where not exists (select 1 from public.courses where lower(title) = lower('Social Media Marketing'));

  insert into public.courses (category_id, title, description, duration, level, status)
  select uiux_id, 'UI/UX with AI Tools', 'Design user flows, wireframes, prototypes, and visual systems with modern AI tooling.', '6 weeks', 'Beginner to Intermediate', 'active'
  where not exists (select 1 from public.courses where lower(title) = lower('UI/UX with AI Tools'));

  insert into public.courses (category_id, title, description, duration, level, status)
  select app_id, 'Flutter App Development', 'Build cross-platform mobile apps with Flutter, Firebase/Supabase, and deployment basics.', '10 weeks', 'Intermediate', 'active'
  where not exists (select 1 from public.courses where lower(title) = lower('Flutter App Development'));
end $$;
