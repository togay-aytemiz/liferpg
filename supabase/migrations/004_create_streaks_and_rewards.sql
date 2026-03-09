-- Migration: 004_create_streaks
-- Description: Create streak tracking table
-- Depends on: 001_create_profiles

-- ============================================================
-- STREAKS TABLE
-- Tracks daily consistency streaks per user.
-- One row per user, updated daily.
-- ============================================================
create table public.streaks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  
  -- Current active streak
  current_streak integer not null default 0,
  
  -- Longest streak ever achieved
  longest_streak integer not null default 0,
  
  -- Last date the user completed at least one quest
  last_active_date date,
  
  -- XP multiplier based on streak (calculated)
  -- 3 days = 1.05x, 7 days = 1.10x, 30 days = 1.25x
  xp_multiplier numeric(4,2) not null default 1.00,
  
  -- Timestamps
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  
  -- One streak record per user
  unique (user_id)
);

-- Index
create index idx_streaks_user on public.streaks(user_id);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
alter table public.streaks enable row level security;

create policy "Users can view own streak"
  on public.streaks for select
  using (auth.uid() = user_id);

create policy "Users can insert own streak"
  on public.streaks for insert
  with check (auth.uid() = user_id);

create policy "Users can update own streak"
  on public.streaks for update
  using (auth.uid() = user_id);

-- Auto-update timestamp
create trigger on_streaks_updated
  before update on public.streaks
  for each row execute function public.handle_updated_at();

-- ============================================================
-- REWARDS TABLE (User-defined real-life rewards)
-- ============================================================
create table public.rewards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  
  -- Reward Info
  title text not null,
  description text,
  
  -- At what level does this unlock?
  unlock_level integer not null default 1,
  
  -- Has the user redeemed it?
  is_redeemed boolean not null default false,
  redeemed_at timestamptz,
  
  -- Timestamps
  created_at timestamptz not null default now()
);

-- Index
create index idx_rewards_user on public.rewards(user_id);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
alter table public.rewards enable row level security;

create policy "Users can view own rewards"
  on public.rewards for select
  using (auth.uid() = user_id);

create policy "Users can insert own rewards"
  on public.rewards for insert
  with check (auth.uid() = user_id);

create policy "Users can update own rewards"
  on public.rewards for update
  using (auth.uid() = user_id);

create policy "Users can delete own rewards"
  on public.rewards for delete
  using (auth.uid() = user_id);
