-- ============================================
-- Golf Availability App - Database Schema
-- Run this in: Supabase Dashboard > SQL Editor
-- ============================================

-- 1. Profiles table (linked to Supabase auth)
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text not null,
  display_name text not null,
  created_at timestamptz default now()
);

-- 2. Availability table (one row per user per week)
create table public.availability (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  week_start date not null,
  slots jsonb default '{}' not null,
  updated_at timestamptz default now(),
  unique(user_id, week_start)
);

-- 3. Row Level Security (RLS)
alter table public.profiles enable row level security;
alter table public.availability enable row level security;

-- Everyone can read all profiles (it's just 4 friends)
create policy "Profiles are viewable by all authenticated users"
  on public.profiles for select
  to authenticated
  using (true);

-- Everyone can read all availability
create policy "Availability is viewable by all authenticated users"
  on public.availability for select
  to authenticated
  using (true);

-- Users can insert their own availability
create policy "Users can insert their own availability"
  on public.availability for insert
  to authenticated
  with check (auth.uid() = user_id);

-- Users can update their own availability
create policy "Users can update their own availability"
  on public.availability for update
  to authenticated
  using (auth.uid() = user_id);

-- 4. Enable realtime on availability table
alter publication supabase_realtime add table public.availability;

-- 5. Auto-create profile when a new user signs up
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, display_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
