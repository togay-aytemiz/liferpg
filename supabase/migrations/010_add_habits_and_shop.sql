-- Migration: 010_add_habits_and_shop
-- Description: Creates habits, habit_logs tables and adds streak_freezes to profiles

-- 1. Add streak_freezes to profiles
alter table public.profiles
  add column streak_freezes integer not null default 0;

-- 2. Habits table
create table public.habits (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  title text not null,
  is_good boolean not null default true,
  stat_affected text not null, -- strength, knowledge, wealth, adventure, social
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  is_active boolean not null default true
);

-- RLS for habits
alter table public.habits enable row level security;

create policy "Users can view own habits"
  on public.habits for select
  using (auth.uid() = user_id);

create policy "Users can insert own habits"
  on public.habits for insert
  with check (auth.uid() = user_id);

create policy "Users can update own habits"
  on public.habits for update
  using (auth.uid() = user_id);

-- 3. Habit Logs table (for tracking metrics over time)
create table public.habit_logs (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  habit_id uuid references public.habits(id) on delete cascade not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS for habit_logs
alter table public.habit_logs enable row level security;

create policy "Users can view own habit logs"
  on public.habit_logs for select
  using (auth.uid() = user_id);

create policy "Users can insert own habit logs"
  on public.habit_logs for insert
  with check (auth.uid() = user_id);

-- Optional: index for performance on habit_logs
create index habit_logs_user_id_idx on public.habit_logs(user_id);
create index habit_logs_habit_id_idx on public.habit_logs(habit_id);
create index habit_logs_created_at_idx on public.habit_logs(created_at);
