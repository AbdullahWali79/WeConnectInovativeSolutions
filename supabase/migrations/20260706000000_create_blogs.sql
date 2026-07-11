create table if not exists public.blogs (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text unique not null,
  target_keyword text,
  excerpt text,
  content text not null,
  cover_image_url text,
  tags text[],
  seo_title text,
  seo_description text,
  display_order integer default 1,
  published boolean default false,
  featured boolean default false,
  published_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_blogs_slug on public.blogs(slug);
create index if not exists idx_blogs_published on public.blogs(published);
create index if not exists idx_blogs_featured on public.blogs(featured);
create index if not exists idx_blogs_published_at on public.blogs(published_at desc);
create index if not exists idx_blogs_display_order on public.blogs(display_order);

create or replace function public.set_blogs_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists blogs_updated_at on public.blogs;
create trigger blogs_updated_at
  before update on public.blogs
  for each row execute function public.set_blogs_updated_at();

alter table public.blogs enable row level security;

drop policy if exists "Public can read published blogs" on public.blogs;
drop policy if exists "Admins can manage blogs" on public.blogs;

create policy "Public can read published blogs" on public.blogs
  for select
  using (published = true or public.is_admin(auth.uid()));

create policy "Admins can manage blogs" on public.blogs
  for all
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

grant select on public.blogs to anon, authenticated;
grant insert, update, delete on public.blogs to authenticated;
