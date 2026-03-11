-- Migration: 016_add_last_daily_settlement_day
-- Description: Track whether the current app day has already been settled for each profile.

alter table public.profiles
  add column if not exists last_daily_settlement_day text;

