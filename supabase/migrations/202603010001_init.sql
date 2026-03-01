create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.subscriptions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  status text not null default 'incomplete',
  current_period_end timestamptz,
  updated_at timestamptz not null default now()
);

create table if not exists public.user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  primary_stack text not null,
  secondary_stack text,
  min_day_rate integer,
  remote_preference text,
  countries text[] default '{}',
  notify_email text,
  radar_active boolean not null default false,
  updated_at timestamptz not null default now()
);

create table if not exists public.cv_files (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  storage_path text not null,
  extracted_text text,
  created_at timestamptz not null default now()
);

create table if not exists public.missions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source text not null,
  title text not null,
  company text not null,
  country text,
  remote text,
  day_rate numeric,
  url text not null,
  score numeric,
  reasons text,
  pitch text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.subscriptions enable row level security;
alter table public.user_settings enable row level security;
alter table public.cv_files enable row level security;
alter table public.missions enable row level security;

create policy "profiles_own_all" on public.profiles
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "subscriptions_own_all" on public.subscriptions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "settings_own_all" on public.user_settings
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "cv_files_own_all" on public.cv_files
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "missions_own_select" on public.missions
  for select using (auth.uid() = user_id);

create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (user_id, email)
  values (new.id, new.email)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

create or replace trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger subscriptions_updated_at
before update on public.subscriptions
for each row execute function public.touch_updated_at();

create trigger user_settings_updated_at
before update on public.user_settings
for each row execute function public.touch_updated_at();

insert into storage.buckets (id, name, public)
values ('cv', 'cv', false)
on conflict (id) do nothing;

create policy "cv_bucket_upload_own"
on storage.objects
for insert
with check (bucket_id = 'cv' and auth.uid()::text = (storage.foldername(name))[2]);

create policy "cv_bucket_select_own"
on storage.objects
for select
using (bucket_id = 'cv' and auth.uid()::text = (storage.foldername(name))[2]);

create policy "cv_bucket_update_own"
on storage.objects
for update
using (bucket_id = 'cv' and auth.uid()::text = (storage.foldername(name))[2]);

create policy "cv_bucket_delete_own"
on storage.objects
for delete
using (bucket_id = 'cv' and auth.uid()::text = (storage.foldername(name))[2]);
