create table if not exists public.ideas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  title text not null,
  niche_problem text not null,
  traction text,
  what_i_bring text not null,
  what_i_seek text not null,
  tags text[],
  status text default 'active',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.ideas enable row level security;

create policy "Ideas are viewable by anyone" on public.ideas
  for select
  using (true);

create policy "Ideas are insertable by owner" on public.ideas
  for insert
  with check (auth.uid() = user_id);

create policy "Ideas are updatable by owner" on public.ideas
  for update
  using (auth.uid() = user_id);
