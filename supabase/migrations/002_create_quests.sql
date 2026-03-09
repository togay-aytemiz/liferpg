-- Migration: 002_create_quests
-- Description: Create quest definitions and user quest tracking tables
-- Depends on: 001_create_profiles

-- ============================================================
-- QUEST TYPES ENUM
-- ============================================================
create type public.quest_type as enum ('daily', 'side', 'boss');

-- ============================================================
-- QUEST DIFFICULTY ENUM
-- ============================================================
create type public.quest_difficulty as enum ('easy', 'medium', 'hard', 'epic');

-- ============================================================
-- STAT CATEGORY ENUM
-- ============================================================
create type public.stat_category as enum ('strength', 'knowledge', 'wealth', 'adventure', 'social');

-- ============================================================
-- QUESTS TABLE
-- Template definitions for quests (shared + user-generated).
-- ============================================================
create table public.quests (
  id uuid primary key default uuid_generate_v4(),
  
  -- Ownership: null = system quest, uuid = user-created quest
  user_id uuid references public.profiles(id) on delete cascade,
  
  -- Quest Details
  title text not null,
  description text,
  quest_type public.quest_type not null default 'daily',
  difficulty public.quest_difficulty not null default 'medium',
  
  -- Rewards
  xp_reward integer not null default 15,
  gold_reward integer not null default 0,
  
  -- Which stat does this quest improve?
  stat_affected public.stat_category,
  stat_points integer not null default 1,
  
  -- Scheduling: for daily quests, which days of week (0=Sun, 6=Sat)
  -- null means every day
  schedule_days integer[],
  
  -- Is this quest currently active/visible?
  is_active boolean not null default true,
  
  -- AI-generated flag (came from Life Rhythm analysis)
  is_ai_generated boolean not null default false,
  
  -- Timestamps
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Indexes
create index idx_quests_user_id on public.quests(user_id);
create index idx_quests_type on public.quests(quest_type);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
alter table public.quests enable row level security;

-- Users can see system quests (user_id IS NULL) and their own quests
create policy "Users can view own and system quests"
  on public.quests for select
  using (user_id is null or auth.uid() = user_id);

-- Users can insert their own quests
create policy "Users can create own quests"
  on public.quests for insert
  with check (auth.uid() = user_id);

-- Users can update their own quests
create policy "Users can update own quests"
  on public.quests for update
  using (auth.uid() = user_id);

-- Users can delete their own quests
create policy "Users can delete own quests"
  on public.quests for delete
  using (auth.uid() = user_id);

-- Auto-update timestamp
create trigger on_quests_updated
  before update on public.quests
  for each row execute function public.handle_updated_at();

-- ============================================================
-- USER_QUESTS TABLE
-- Tracks a user's daily progress on each quest (completions).
-- One row per user per quest per day.
-- ============================================================
create table public.user_quests (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  quest_id uuid not null references public.quests(id) on delete cascade,
  
  -- The calendar date this record is for
  quest_date date not null default current_date,
  
  -- Completion
  is_completed boolean not null default false,
  completed_at timestamptz,
  
  -- XP actually awarded (may differ due to streak bonuses)
  xp_awarded integer not null default 0,
  gold_awarded integer not null default 0,
  
  -- Timestamps
  created_at timestamptz not null default now(),
  
  -- One entry per user per quest per day
  unique (user_id, quest_id, quest_date)
);

-- Indexes
create index idx_user_quests_user_date on public.user_quests(user_id, quest_date);
create index idx_user_quests_completed on public.user_quests(user_id, is_completed);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
alter table public.user_quests enable row level security;

create policy "Users can view own quest progress"
  on public.user_quests for select
  using (auth.uid() = user_id);

create policy "Users can insert own quest progress"
  on public.user_quests for insert
  with check (auth.uid() = user_id);

create policy "Users can update own quest progress"
  on public.user_quests for update
  using (auth.uid() = user_id);
