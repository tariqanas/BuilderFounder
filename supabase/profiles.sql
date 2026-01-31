create table if not exists public.profiles (
  id uuid primary key references auth.users on delete cascade,
  username text unique,
  bio text,
  role text check (role in ('idea_person', 'builder')),
  niches_tags text[],
  stack_tags text[],
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.profiles enable row level security;

create policy "Profiles are viewable by anyone" on public.profiles
  for select
  using (true);

create policy "Profiles are insertable by owner" on public.profiles
  for insert
  with check (auth.uid() = id);

create policy "Profiles are updatable by owner" on public.profiles
  for update
  using (auth.uid() = id);
