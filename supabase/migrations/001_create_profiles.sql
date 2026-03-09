-- Migration: 001_create_profiles
-- Description: Create the user profiles table with RPG character attributes
-- Depends on: Supabase Auth (auth.users)

-- Enable UUID extension if not already enabled
create extension if not exists "uuid-ossp";

-- ============================================================
-- PROFILES TABLE
-- Stores the user's RPG character data. One row per auth user.
-- ============================================================
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  
  -- Identity
  username text unique,
  avatar_url text,
  
  -- Life Rhythm (onboarding text)
  life_rhythm text,
  
  -- RPG Progression
  level integer not null default 1,
  xp integer not null default 0,
  gold integer not null default 0,
  
  -- Character Stats (0–100 scale)
  stat_strength integer not null default 0,
  stat_knowledge integer not null default 0,
  stat_wealth integer not null default 0,
  stat_adventure integer not null default 0,
  stat_social integer not null default 0,
  
  -- Timestamps
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Index for username lookups
create index idx_profiles_username on public.profiles(username);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
alter table public.profiles enable row level security;

-- Users can read their own profile
create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

-- Users can update their own profile
create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Users can insert their own profile (on signup)
create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

-- ============================================================
-- AUTO-CREATE PROFILE ON SIGNUP (Trigger)
-- ============================================================
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id)
  values (new.id);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- AUTO-UPDATE updated_at (Trigger)
-- ============================================================
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger on_profiles_updated
  before update on public.profiles
  for each row execute function public.handle_updated_at();

-- ============================================================
-- LEVEL THRESHOLDS (Reference Table)
-- Used to determine what XP is needed for each level.
-- ============================================================
create table public.level_thresholds (
  level integer primary key,
  xp_required integer not null
);

insert into public.level_thresholds (level, xp_required) values
  (1, 0),
  (2, 100),
  (3, 250),
  (4, 500),
  (5, 900),
  (6, 1400),
  (7, 2100),
  (8, 3000),
  (9, 4200),
  (10, 5700),
  (11, 7500),
  (12, 9800),
  (13, 12600),
  (14, 16000),
  (15, 20000);

-- Level thresholds are public read-only
alter table public.level_thresholds enable row level security;

create policy "Level thresholds are readable by all"
  on public.level_thresholds for select
  using (true);
