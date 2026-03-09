-- Migration: 003_create_achievements
-- Description: Create achievements definitions and user unlock tracking
-- Depends on: 001_create_profiles

-- ============================================================
-- ACHIEVEMENT RARITY ENUM
-- ============================================================
create type public.achievement_rarity as enum ('common', 'uncommon', 'rare', 'epic', 'legendary');

-- ============================================================
-- ACHIEVEMENTS TABLE
-- Defines all possible achievements in the system.
-- ============================================================
create table public.achievements (
  id uuid primary key default gen_random_uuid(),
  
  -- Achievement Info
  title text not null,
  description text not null,
  icon text, -- emoji or icon key
  
  -- Rarity & Visual
  rarity public.achievement_rarity not null default 'common',
  
  -- Unlock Condition (stored as a JSON rule)
  -- Examples:
  --   {"type": "quest_count", "value": 1}       → First Quest Completed
  --   {"type": "streak_days", "value": 7}        → 7 Day Streak
  --   {"type": "quest_count", "value": 50}       → 50 Quests Completed
  --   {"type": "level_reached", "value": 10}     → Level 10 Reached
  --   {"type": "boss_defeated", "value": 1}      → First Boss Defeated
  unlock_condition jsonb not null default '{}',
  
  -- Timestamps
  created_at timestamptz not null default now()
);

-- ============================================================
-- ROW LEVEL SECURITY (Achievements are globally readable)
-- ============================================================
alter table public.achievements enable row level security;

create policy "Achievements are readable by all authenticated users"
  on public.achievements for select
  using (auth.role() = 'authenticated');

-- ============================================================
-- SEED DEFAULT ACHIEVEMENTS
-- ============================================================
insert into public.achievements (title, description, icon, rarity, unlock_condition) values
  ('First Quest',       'Complete your first quest.',              '⚔️', 'common',    '{"type": "quest_count", "value": 1}'),
  ('Getting Started',   'Complete 5 quests.',                      '🗡️', 'common',    '{"type": "quest_count", "value": 5}'),
  ('Quest Veteran',     'Complete 50 quests.',                     '🛡️', 'rare',      '{"type": "quest_count", "value": 50}'),
  ('Quest Master',      'Complete 200 quests.',                    '👑', 'epic',      '{"type": "quest_count", "value": 200}'),
  ('On a Roll',         'Maintain a 3-day streak.',                '🔥', 'common',    '{"type": "streak_days", "value": 3}'),
  ('Week Warrior',      'Maintain a 7-day streak.',                '💪', 'uncommon',  '{"type": "streak_days", "value": 7}'),
  ('Unstoppable',       'Maintain a 30-day streak.',               '⚡', 'rare',      '{"type": "streak_days", "value": 30}'),
  ('Iron Will',         'Maintain a 100-day streak.',              '🏆', 'legendary', '{"type": "streak_days", "value": 100}'),
  ('Level 5',           'Reach Level 5.',                          '⭐', 'common',    '{"type": "level_reached", "value": 5}'),
  ('Level 10',          'Reach Level 10.',                         '🌟', 'uncommon',  '{"type": "level_reached", "value": 10}'),
  ('Level 15',          'Reach Level 15.',                         '💎', 'epic',      '{"type": "level_reached", "value": 15}'),
  ('Boss Slayer',       'Defeat your first Boss Quest.',           '💀', 'uncommon',  '{"type": "boss_defeated", "value": 1}'),
  ('Boss Hunter',       'Defeat 10 Boss Quests.',                  '🐉', 'rare',      '{"type": "boss_defeated", "value": 10}');

-- ============================================================
-- USER_ACHIEVEMENTS TABLE
-- Tracks which achievements a user has unlocked.
-- ============================================================
create table public.user_achievements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  achievement_id uuid not null references public.achievements(id) on delete cascade,
  
  -- When was it unlocked?
  unlocked_at timestamptz not null default now(),
  
  -- Prevent duplicate unlocks
  unique (user_id, achievement_id)
);

-- Indexes
create index idx_user_achievements_user on public.user_achievements(user_id);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
alter table public.user_achievements enable row level security;

create policy "Users can view own achievements"
  on public.user_achievements for select
  using (auth.uid() = user_id);

create policy "Users can insert own achievements"
  on public.user_achievements for insert
  with check (auth.uid() = user_id);
