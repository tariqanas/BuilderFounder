alter table public.user_settings
  alter column countries set default '{}',
  alter column radar_active set default false;

alter table public.user_settings
  drop column if exists notify_email;

alter table public.user_settings
  add column if not exists notify_email boolean not null default true,
  add column if not exists notify_whatsapp boolean not null default false,
  add column if not exists whatsapp_number text,
  add column if not exists notify_sms boolean not null default false,
  add column if not exists sms_number text;

alter table public.user_settings
  add constraint user_settings_whatsapp_number_e164
  check (whatsapp_number is null or whatsapp_number ~ '^\+[1-9][0-9]{7,14}$');

alter table public.user_settings
  add constraint user_settings_sms_number_e164
  check (sms_number is null or sms_number ~ '^\+[1-9][0-9]{7,14}$');

alter table public.user_settings
  add constraint user_settings_whatsapp_enabled_requires_number
  check ((not notify_whatsapp) or whatsapp_number is not null);

alter table public.user_settings
  add constraint user_settings_sms_enabled_requires_number
  check ((not notify_sms) or sms_number is not null);

create table if not exists public.offers_raw (
  id uuid primary key default gen_random_uuid(),
  source text not null,
  title text not null,
  company text not null,
  country text,
  remote text,
  day_rate numeric,
  url text not null,
  description text,
  posted_at timestamptz,
  hash text not null,
  created_at timestamptz not null default now()
);

create unique index if not exists offers_raw_hash_unique_idx on public.offers_raw (hash);
create index if not exists offers_raw_created_at_idx on public.offers_raw (created_at desc);
create index if not exists offers_raw_posted_at_idx on public.offers_raw (posted_at desc);
create index if not exists offers_raw_url_idx on public.offers_raw (url);

create table if not exists public.user_offer_scores (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  offer_hash text not null,
  mission_id uuid references public.missions(id) on delete set null,
  score numeric not null,
  decision text not null,
  reasons text not null,
  missing text,
  subject text not null,
  pitch text not null,
  created_at timestamptz not null default now(),
  unique (user_id, offer_hash)
);

create index if not exists user_offer_scores_user_id_idx on public.user_offer_scores (user_id, created_at desc);

create table if not exists public.notification_queue (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  mission_id uuid not null references public.missions(id) on delete cascade,
  channel text not null check (channel in ('email', 'whatsapp', 'sms')),
  "to" text not null,
  payload jsonb not null,
  status text not null default 'pending' check (status in ('pending', 'sent', 'failed')),
  attempts integer not null default 0,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists notification_queue_status_idx on public.notification_queue (status, created_at asc);
create index if not exists notification_queue_user_idx on public.notification_queue (user_id, created_at desc);

create unique index if not exists missions_user_url_week_unique_idx
on public.missions (user_id, url, date_trunc('week', created_at));

create trigger notification_queue_updated_at
before update on public.notification_queue
for each row execute function public.touch_updated_at();

alter table public.offers_raw enable row level security;
alter table public.notification_queue enable row level security;
alter table public.user_offer_scores enable row level security;

drop policy if exists offers_raw_no_user_access on public.offers_raw;
create policy offers_raw_no_user_access on public.offers_raw
for all using (false) with check (false);

drop policy if exists notification_queue_no_user_access on public.notification_queue;
create policy notification_queue_no_user_access on public.notification_queue
for all using (false) with check (false);

drop policy if exists user_offer_scores_no_user_access on public.user_offer_scores;
create policy user_offer_scores_no_user_access on public.user_offer_scores
for all using (false) with check (false);
