create table if not exists public.mission_matches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  mission_id uuid not null references public.missions(id) on delete cascade,
  score numeric not null,
  reasons text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, mission_id)
);

create index if not exists mission_matches_user_id_idx on public.mission_matches (user_id, created_at desc);
create index if not exists mission_matches_mission_id_idx on public.mission_matches (mission_id);

alter table public.mission_matches enable row level security;

drop policy if exists mission_matches_own_select on public.mission_matches;
create policy mission_matches_own_select on public.mission_matches
for select using (auth.uid() = user_id);

drop policy if exists mission_matches_no_user_write on public.mission_matches;
create policy mission_matches_no_user_write on public.mission_matches
for all using (false) with check (false);

create trigger mission_matches_updated_at
before update on public.mission_matches
for each row execute function public.touch_updated_at();
