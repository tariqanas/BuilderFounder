-- Ensure onboarding fields can remain unset until user provides them.
alter table public.user_settings
  alter column primary_stack drop not null;

-- Ensure exactly one settings row per user.
do $$
declare
  v_user_id_attnum smallint;
  v_has_single_col_unique boolean;
begin
  select a.attnum
    into v_user_id_attnum
  from pg_attribute a
  where a.attrelid = 'public.user_settings'::regclass
    and a.attname = 'user_id'
    and a.attisdropped = false;

  select exists (
    select 1
    from pg_constraint c
    where c.conrelid = 'public.user_settings'::regclass
      and c.contype in ('p', 'u')
      and c.conkey = array[v_user_id_attnum]
  )
  into v_has_single_col_unique;

  if not v_has_single_col_unique then
    alter table public.user_settings
      add constraint user_settings_user_id_unique unique (user_id);
  end if;
end
$$;

create or replace function public.handle_new_user_settings()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_settings (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_settings_created on auth.users;
create trigger on_auth_user_settings_created
after insert on auth.users
for each row execute procedure public.handle_new_user_settings();

-- Backfill settings rows for existing auth users.
insert into public.user_settings (user_id)
select u.id
from auth.users u
left join public.user_settings s on s.user_id = u.id
where s.user_id is null
on conflict (user_id) do nothing;

-- Keep RLS and per-user access policies in place.
alter table public.user_settings enable row level security;

drop policy if exists "settings_own_all" on public.user_settings;
drop policy if exists "settings_own_select" on public.user_settings;
drop policy if exists "settings_own_insert" on public.user_settings;
drop policy if exists "settings_own_update" on public.user_settings;

create policy "settings_own_select"
on public.user_settings
for select
using (auth.uid() = user_id);

create policy "settings_own_insert"
on public.user_settings
for insert
with check (auth.uid() = user_id);

create policy "settings_own_update"
on public.user_settings
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
