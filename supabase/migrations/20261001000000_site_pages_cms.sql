-- Published content and drafts are separate so anonymous visitors cannot read drafts.
create table public.site_page_settings (
  id text primary key,
  label text not null,
  menu_visible boolean not null default true,
  active boolean not null default true,
  sort_order integer not null default 0,
  updated_at timestamptz not null default now()
);
create table public.site_page_drafts (
  path text primary key,
  document jsonb not null default '{"elements":{},"blocks":[]}'::jsonb,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);
create table public.site_page_content (
  path text primary key,
  document jsonb not null default '{"elements":{},"blocks":[]}'::jsonb,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);
alter table public.site_page_settings enable row level security;
alter table public.site_page_drafts enable row level security;
alter table public.site_page_content enable row level security;
create policy "Read menu settings" on public.site_page_settings for select using (true);
create policy "Read published pages" on public.site_page_content for select using (true);
create policy "Admins manage page settings" on public.site_page_settings for all to authenticated
  using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));
create policy "Admins manage drafts" on public.site_page_drafts for all to authenticated
  using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));
create policy "Admins manage published pages" on public.site_page_content for all to authenticated
  using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));
grant select on public.site_page_settings, public.site_page_content to anon, authenticated;
grant select, insert, update, delete on public.site_page_settings, public.site_page_content, public.site_page_drafts to authenticated;
revoke all on public.site_page_drafts from anon;
