create table if not exists public.course_topics (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  day_number integer not null check (day_number between 1 and 365),
  title text not null,
  english_video text,
  urdu_video text,
  practice_project text,
  created_at timestamptz not null default now(),
  unique (course_id, day_number)
);

-- Some older production databases still have a legacy course audit trigger that
-- queries a removed "environment" relation. Skip user triggers only while the
-- curriculum's category and course records are seeded.
set local session_replication_role = replica;

insert into public.course_categories (name, description)
select 'Web Development', 'Frontend, backend, database, API, and deployment courses.'
where not exists (
  select 1 from public.course_categories where lower(name) = lower('Web Development')
);

insert into public.courses (category_id, title, description, duration, level, status)
select
  category.id,
  'Advance Web Development',
  'A practical 30-day Supabase, React, Express, and Node.js course with daily learning resources and projects.',
  '30 Days',
  'Advanced',
  'active'
from public.course_categories category
where lower(category.name) = lower('Web Development')
  and not exists (
    select 1 from public.courses where lower(title) = lower('Advance Web Development')
  )
limit 1;

set local session_replication_role = origin;

insert into public.course_topics (
  course_id,
  day_number,
  title,
  english_video,
  urdu_video,
  practice_project
)
select course_row.id, topic.day_number, topic.title, topic.english_video, topic.urdu_video, topic.practice_project
from public.courses course_row
cross join (
  values
    (1, 'Node.js Setup', '"Node.js Crash Course" - Web Dev Simplified', '"Node js Tutorial for Beginners in Hindi" - CodeWithHarry', 'Create a basic Express server returning "Hello World" on port 3000.'),
    (2, 'Express Routing', '"Express.js REST API" - Traversy Media', '"Express JS Tutorial in Hindi" - CodeWithHarry', 'Build CRUD APIs for a Book Store.'),
    (3, 'Middleware and CORS', '"Express Middleware" - The Net Ninja', '"Express Middleware in Hindi" - CodeWithHarry', 'Create a custom logger middleware that prints the request method and time.'),
    (4, 'Supabase and SQL', '"Supabase in 100 Seconds" - Fireship', '"Supabase Tutorial in Hindi" - Thapa Technical', 'Create a users table and insert five dummy records.'),
    (5, 'RLS and Relations', '"Supabase RLS Policies" - Supabase Official', '"Supabase RLS in Hindi" - Hitesh Choudhary', 'Create posts linked to users and an RLS policy that allows users to manage only their own posts.'),
    (6, 'Supabase Auth', '"Supabase Authentication" - Code with Antonio', '"Supabase Auth in Hindi" - Thapa Technical', 'Build sign-up and login endpoints in Express using Supabase Auth.'),
    (7, 'JWT and Auth API', '"Supabase Auth with Node" - Ben Awad', 'Use captions or search: Supabase Auth Node Hindi Urdu', 'Create /register and /login endpoints that return a valid JWT.'),
    (8, 'React Vite Setup', '"React Vite Setup" - Codevolution', '"React Vite in Hindi" - CodeWithHarry', 'Create a React application with reusable Header, Main, and Footer components.'),
    (9, 'useState and useEffect', '"React useState and useEffect" - The Net Ninja', '"useState useEffect in Hindi" - CodeWithHarry', 'Build a counter and fetch records from JSONPlaceholder.'),
    (10, 'React Router', '"React Router Tutorial" - Laith Harb', '"React Router in Hindi" - Thapa Technical', 'Create three pages with a protected Dashboard route.'),
    (11, 'Zustand or Context', '"Zustand Tutorial" - Jack Herrington', '"React Context API in Hindi" - CodeWithHarry', 'Build a shopping cart with shared application state.'),
    (12, 'React and Supabase', '"React Supabase Tutorial" - Fireship', '"React Supabase in Hindi" - Thapa Technical', 'Fetch users from Supabase and display them in a responsive table.'),
    (13, 'Realtime Subscriptions', '"Supabase Realtime" - Supabase Official', 'Search: Supabase Realtime Hindi Urdu', 'Build a live chat that updates without refreshing the page.'),
    (14, 'Realtime Dashboard', '"Supabase Realtime Dashboard" - Chris Hay', 'Use subtitles or translated captions', 'Build a live order dashboard that reacts to database changes.'),
    (15, 'Service Role Key', '"Supabase Service Role Key" - Coding with Dawid', 'Use translated captions', 'Create a secure /admin/users server endpoint using the service role key.'),
    (16, 'Storage and Uploads', '"Supabase Storage Upload" - Coding with Dawid', '"Supabase Storage in Hindi" - Thapa Technical', 'Build a profile image upload API and show the uploaded image in React.'),
    (17, 'Zod Validation', '"Zod Validation Tutorial" - Web Dev Simplified', 'Search: Zod Validation Hindi Urdu', 'Create reusable validateUser middleware for Express.'),
    (18, 'Edge Functions', '"Supabase Edge Functions" - Fireship', 'Use English video with translated captions', 'Create an edge function that sends an email after a database insert.'),
    (19, 'JWT Middleware', '"JWT Authentication Node.js" - Web Dev Simplified', '"JWT Authentication in Hindi" - CodeWithHarry', 'Create Express authMiddleware and protect private routes.'),
    (20, 'Environment Variables', '"Node Environment Variables" - Traversy Media', '".env file in Node.js Hindi" - CodeWithHarry', 'Move all application secrets into environment variables and validate missing values.'),
    (21, 'File Sharing App', '"Node.js File Upload" - Web Dev Simplified', 'Use translated captions', 'Build a file-sharing application with upload and download links.'),
    (22, 'React Performance', '"React Performance Optimization" - Jack Herrington', '"React Performance in Hindi" - CodeWithHarry', 'Optimize rendering for a list containing more than 1,000 records.'),
    (23, 'Advanced SQL', '"Supabase Advanced SQL" - Supabase Official', 'Use translated captions', 'Write a JOIN query for Orders and Customers and add full-text search.'),
    (24, 'Stripe Payments', '"Stripe Checkout Node.js" - Web Dev Simplified', '"Stripe Payment in Hindi" - CodeWithHarry', 'Build a secure Stripe Checkout route and success/cancel flow.'),
    (25, 'Deployment', '"Deploy React and Node" - Fireship / Traversy Media', '"React Node Deployment Hindi" - CodeWithHarry', 'Deploy React to Vercel and Express to Render, then verify production environment variables.'),
    (26, 'Testing with Vitest', '"Vitest Tutorial" - Jack Herrington', 'Use translated captions', 'Write unit tests for one React component and one API handler.'),
    (27, 'Error Logging', '"Node.js Error Handling" - Traversy Media', '"Node Error Handling Hindi" - CodeWithHarry', 'Add a global error handler and structured Winston logging.'),
    (28, 'Capstone - Database Design', '"React DnD Kanban" and "RealWorld App"', 'Use English resources with translated captions', 'Design Boards, Lists, Tasks, and Users tables with relationships and RLS rules.'),
    (29, 'Capstone - Build', '"React Beautiful DnD Tutorial"', 'Use English resource with translated captions', 'Build a Kanban board with drag and drop and an Express API.'),
    (30, 'Capstone - Polish', '"Build and Ship a SaaS" - Fireship', 'Use English resource with translated captions', 'Finish attachments, realtime updates, RLS, validation, responsive UI, and push the complete project to GitHub.')
) as topic(day_number, title, english_video, urdu_video, practice_project)
where lower(course_row.title) = lower('Advance Web Development')
on conflict (course_id, day_number) do update set
  title = excluded.title,
  english_video = excluded.english_video,
  urdu_video = excluded.urdu_video,
  practice_project = excluded.practice_project;

alter table public.course_topics enable row level security;

drop policy if exists "Authenticated users can read course topics" on public.course_topics;
create policy "Authenticated users can read course topics"
on public.course_topics for select
to authenticated
using (true);

drop policy if exists "Admins manage course topics" on public.course_topics;
create policy "Admins manage course topics"
on public.course_topics for all
to authenticated
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

grant select on public.course_topics to authenticated;
grant all on public.course_topics to service_role;
