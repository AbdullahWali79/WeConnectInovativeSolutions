-- AI News table for keeping the project active and displaying news on landing page
create table if not exists public.ai_news (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  summary text,
  url text not null,
  image_url text,
  source text,
  published_at timestamptz,
  created_at timestamptz default now()
);

-- Index for performance
create index if not exists ai_news_created_at_idx on public.ai_news (created_at desc);

-- RLS: Public can read
alter table public.ai_news enable row level security;

drop policy if exists "Public can read AI news" on public.ai_news;
create policy "Public can read AI news" on public.ai_news
  for select using (true);

-- For simplicity in the "keep alive" flow, we allow all to insert/delete if the app logic is handled correctly.
-- In production, you'd restrict this to service_role or admin.
drop policy if exists "Management of news" on public.ai_news;
create policy "Management of news" on public.ai_news
  for all using (true) with check (true);

grant select on public.ai_news to anon, authenticated;
grant all on public.ai_news to authenticated, service_role;
