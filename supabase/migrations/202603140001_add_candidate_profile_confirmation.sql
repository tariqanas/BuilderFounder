alter table public.candidate_profiles
  add column if not exists profile_confirmed boolean not null default true;

-- Existing candidate profiles were already active users before this review step existed.
update public.candidate_profiles
set profile_confirmed = true
where profile_confirmed is distinct from true;
