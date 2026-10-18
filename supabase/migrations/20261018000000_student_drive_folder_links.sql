alter table public.profiles
  add column if not exists social_media_drive_folder_url text;

comment on column public.profiles.social_media_drive_folder_url is
  'Admin-assigned Google Drive folder where this student stores social media/video work.';
