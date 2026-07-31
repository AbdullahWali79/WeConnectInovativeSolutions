insert into public.services (title, slug, category, icon, short_description, description, highlights, featured, display_order)
values
  ('Custom Desktop Applications', 'custom-desktop-applications', 'Engineering', 'desktop_windows', 'Robust desktop applications and software updates built with Python and Electron.', 'We build powerful custom desktop software for Windows, macOS, and Linux using Python and Electron. We also provide maintenance, bug fixes, and feature updates for your existing applications.', array['Python & Electron Apps','Cross-platform support','App maintenance & updates'], false, 9)
on conflict (slug) do update set
  title = excluded.title,
  category = excluded.category,
  icon = excluded.icon,
  short_description = excluded.short_description,
  description = excluded.description,
  highlights = excluded.highlights,
  featured = excluded.featured,
  display_order = excluded.display_order;
