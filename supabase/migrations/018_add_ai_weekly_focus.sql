alter table public.profiles
  add column if not exists ai_weekly_focus text,
  add column if not exists ai_weekly_focus_generated_at timestamptz;
