create table if not exists public.matches (
  id uuid primary key default gen_random_uuid(),
  idea_id uuid references public.ideas(id) on delete cascade not null,
  builder_id uuid references public.profiles(id) on delete cascade not null,
  status text not null default 'pending',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.matches enable row level security;

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_matches_updated_at on public.matches;
create trigger set_matches_updated_at
  before update on public.matches
  for each row
  execute function public.set_updated_at();

create policy "Matches are viewable by participants" on public.matches
  for select
  using (
    auth.uid() = builder_id
    or exists (
      select 1 from public.ideas
      where ideas.id = matches.idea_id
        and ideas.user_id = auth.uid()
    )
  );

create policy "Matches are insertable by idea owner" on public.matches
  for insert
  with check (
    exists (
      select 1 from public.ideas
      where ideas.id = matches.idea_id
        and ideas.user_id = auth.uid()
    )
  );

create policy "Matches are updatable by idea owner" on public.matches
  for update
  using (
    exists (
      select 1 from public.ideas
      where ideas.id = matches.idea_id
        and ideas.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.ideas
      where ideas.id = matches.idea_id
        and ideas.user_id = auth.uid()
    )
  );

alter publication supabase_realtime add table public.matches;
