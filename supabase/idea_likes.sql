create table if not exists public.idea_likes (
  id uuid primary key default gen_random_uuid(),
  idea_id uuid references public.ideas(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  created_at timestamptz default now(),
  unique (idea_id, user_id)
);

alter table public.idea_likes enable row level security;

create policy "Idea likes are viewable by anyone" on public.idea_likes
  for select
  using (true);

create policy "Idea likes are insertable by owner" on public.idea_likes
  for insert
  with check (auth.uid() = user_id);

alter publication supabase_realtime add table public.idea_likes;
