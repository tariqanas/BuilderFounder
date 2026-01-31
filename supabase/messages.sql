create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  match_id uuid references public.matches(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  content text not null,
  created_at timestamptz default now()
);

alter table public.messages enable row level security;

create policy "Messages are viewable by match participants" on public.messages
  for select
  using (
    exists (
      select 1
      from public.matches
      join public.ideas on ideas.id = matches.idea_id
      where matches.id = messages.match_id
        and (matches.builder_id = auth.uid() or ideas.user_id = auth.uid())
    )
  );

create policy "Messages are insertable by match participants" on public.messages
  for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1
      from public.matches
      join public.ideas on ideas.id = matches.idea_id
      where matches.id = messages.match_id
        and (matches.builder_id = auth.uid() or ideas.user_id = auth.uid())
    )
  );

alter publication supabase_realtime add table public.messages;
