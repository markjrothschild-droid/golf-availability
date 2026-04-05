-- Run this in: Supabase Dashboard > SQL Editor
-- Tracks which overlap notifications have already been sent (to avoid duplicates)

create table public.overlap_notifications (
  id uuid default gen_random_uuid() primary key,
  week_start date not null unique,
  overlap_hash text not null,
  notified_at timestamptz default now()
);

-- Allow the edge function (service role) to read/write, but no client access needed
alter table public.overlap_notifications enable row level security;
