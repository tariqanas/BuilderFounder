create table if not exists public.system_state (
  key text primary key,
  value text,
  updated_at timestamptz not null default now()
);

create trigger system_state_updated_at
before update on public.system_state
for each row execute function public.touch_updated_at();

alter table public.system_state enable row level security;

drop policy if exists system_state_no_user_access on public.system_state;
create policy system_state_no_user_access on public.system_state
for all using (false) with check (false);

create unique index if not exists missions_user_url_unique_idx
on public.missions (user_id, url);

create unique index if not exists notification_queue_user_mission_channel_unique_idx
on public.notification_queue (user_id, mission_id, channel);
