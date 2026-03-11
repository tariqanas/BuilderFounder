create table if not exists public.candidate_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  cv_file_id uuid references public.cv_files(id) on delete set null,
  parser_version text not null,
  profile_json jsonb not null,
  normalized_text text not null,
  profile_summary text,
  completeness_score integer not null default 0 check (completeness_score >= 0 and completeness_score <= 100),
  confidence_score integer not null default 0 check (confidence_score >= 0 and confidence_score <= 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id)
);

create index if not exists candidate_profiles_user_id_idx on public.candidate_profiles (user_id);
create index if not exists candidate_profiles_cv_file_id_idx on public.candidate_profiles (cv_file_id);

create trigger candidate_profiles_updated_at
before update on public.candidate_profiles
for each row execute function public.touch_updated_at();

alter table public.candidate_profiles enable row level security;

drop policy if exists "candidate_profiles_own_select" on public.candidate_profiles;
drop policy if exists "candidate_profiles_own_insert" on public.candidate_profiles;
drop policy if exists "candidate_profiles_own_update" on public.candidate_profiles;

create policy "candidate_profiles_own_select" on public.candidate_profiles
for select using (auth.uid() = user_id);

create policy "candidate_profiles_own_insert" on public.candidate_profiles
for insert with check (auth.uid() = user_id);

create policy "candidate_profiles_own_update" on public.candidate_profiles
for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
