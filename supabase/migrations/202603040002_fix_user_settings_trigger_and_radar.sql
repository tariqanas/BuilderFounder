-- Recreate user_settings auto-create trigger on auth.users with current Postgres syntax.
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
for each row
execute function public.handle_new_user_settings();

alter table auth.users enable trigger on_auth_user_settings_created;

-- Backfill rows in case trigger was missing or disabled previously.
insert into public.user_settings (user_id)
select u.id
from auth.users u
left join public.user_settings s on s.user_id = u.id
where s.user_id is null
on conflict (user_id) do nothing;
