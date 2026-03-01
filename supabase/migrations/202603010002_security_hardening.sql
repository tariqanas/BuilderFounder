alter table public.cv_files add constraint cv_files_user_id_unique unique (user_id);

alter table public.profiles enable row level security;
alter table public.subscriptions enable row level security;
alter table public.user_settings enable row level security;
alter table public.cv_files enable row level security;
alter table public.missions enable row level security;

drop policy if exists "profiles_own_all" on public.profiles;
drop policy if exists "subscriptions_own_all" on public.subscriptions;
drop policy if exists "settings_own_all" on public.user_settings;
drop policy if exists "cv_files_own_all" on public.cv_files;
drop policy if exists "missions_own_select" on public.missions;

create policy "profiles_own_select" on public.profiles for select using (auth.uid() = user_id);
create policy "profiles_own_insert" on public.profiles for insert with check (auth.uid() = user_id);
create policy "profiles_own_update" on public.profiles for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "subscriptions_own_select" on public.subscriptions for select using (auth.uid() = user_id);
create policy "subscriptions_own_insert" on public.subscriptions for insert with check (auth.uid() = user_id);
create policy "subscriptions_own_update" on public.subscriptions for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "settings_own_select" on public.user_settings for select using (auth.uid() = user_id);
create policy "settings_own_insert" on public.user_settings for insert with check (auth.uid() = user_id);
create policy "settings_own_update" on public.user_settings for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "cv_files_own_select" on public.cv_files for select using (auth.uid() = user_id);
create policy "cv_files_own_insert" on public.cv_files for insert with check (auth.uid() = user_id);
create policy "cv_files_own_update" on public.cv_files for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "missions_own_select" on public.missions for select using (auth.uid() = user_id);
