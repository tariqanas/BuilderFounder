alter table public.user_settings
  add column if not exists notifications_enabled boolean not null default true;
