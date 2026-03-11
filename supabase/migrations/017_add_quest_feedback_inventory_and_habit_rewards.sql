-- Migration: 017_add_quest_feedback_inventory_and_habit_rewards
-- Description: Adds quest feedback memory, persistent inventory, and reward fields for habits.

alter table public.habits
  add column if not exists xp_reward integer not null default 5,
  add column if not exists gold_reward integer not null default 2,
  add column if not exists stat_points integer not null default 1;

create table if not exists public.quest_feedback (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  quest_id uuid references public.quests(id) on delete set null,
  quest_title text not null,
  quest_type text not null check (quest_type in ('daily', 'side', 'boss')),
  feedback_type text not null check (feedback_type in ('reroll', 'skip', 'regenerate')),
  reason_bucket text not null,
  reason_detail text,
  app_day_key text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.quest_feedback enable row level security;

create policy "Users can view own quest feedback"
  on public.quest_feedback for select
  using (auth.uid() = user_id);

create policy "Users can insert own quest feedback"
  on public.quest_feedback for insert
  with check (auth.uid() = user_id);

create index if not exists quest_feedback_user_id_created_at_idx
  on public.quest_feedback(user_id, created_at desc);

create index if not exists quest_feedback_user_id_app_day_idx
  on public.quest_feedback(user_id, app_day_key);

create unique index if not exists quest_feedback_unique_daily_feedback_idx
  on public.quest_feedback(user_id, quest_id, feedback_type, app_day_key);

create table if not exists public.inventory_items (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  source_type text not null check (source_type in ('static', 'dynamic')),
  source_item_id uuid references public.shop_items(id) on delete set null,
  item_key text,
  title text not null,
  description text,
  category text,
  quantity integer not null default 1 check (quantity > 0),
  is_consumable boolean not null default true,
  is_redeemed boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  redeemed_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.inventory_items enable row level security;

create policy "Users can view own inventory"
  on public.inventory_items for select
  using (auth.uid() = user_id);

create policy "Users can insert own inventory"
  on public.inventory_items for insert
  with check (auth.uid() = user_id);

create policy "Users can update own inventory"
  on public.inventory_items for update
  using (auth.uid() = user_id);

create policy "Users can delete own inventory"
  on public.inventory_items for delete
  using (auth.uid() = user_id);

create index if not exists inventory_items_user_id_created_at_idx
  on public.inventory_items(user_id, created_at desc);

create unique index if not exists inventory_items_static_stack_idx
  on public.inventory_items(user_id, item_key)
  where source_type = 'static' and is_redeemed = false;

create or replace function log_habit(
  p_habit_id uuid
) returns json
language plpgsql
security definer
as $$
declare
  v_user_id uuid;
  v_is_good boolean;
  v_stat_affected text;
  v_habit_xp integer;
  v_habit_gold integer;
  v_habit_stat_points integer;
  v_current_hp integer;
  v_max_hp integer;
  v_current_gold integer;
  v_current_xp integer;
  v_stat_value integer;
  v_new_hp integer;
  v_new_gold integer;
  v_new_xp integer;
  v_new_stat_value integer;
  v_died boolean := false;
  v_result json;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  select is_good, stat_affected, xp_reward, gold_reward, stat_points
    into v_is_good, v_stat_affected, v_habit_xp, v_habit_gold, v_habit_stat_points
  from public.habits
  where id = p_habit_id and user_id = v_user_id and is_active = true;

  if not found then
    raise exception 'Habit not found or inactive';
  end if;

  insert into public.habit_logs (user_id, habit_id)
  values (v_user_id, p_habit_id);

  select hp, max_hp, gold, xp into v_current_hp, v_max_hp, v_current_gold, v_current_xp
  from public.profiles
  where id = v_user_id;

  execute format('select stat_%I from public.profiles where id = $1', v_stat_affected)
  using v_user_id
  into v_stat_value;

  if v_is_good then
    v_new_hp := least(v_current_hp + 1, v_max_hp);
    v_new_gold := v_current_gold + greatest(v_habit_gold, 0);
    v_new_xp := v_current_xp + greatest(v_habit_xp, 0);
    v_new_stat_value := v_stat_value + greatest(v_habit_stat_points, 0);
  else
    v_new_hp := v_current_hp - 5;
    v_new_gold := greatest(v_current_gold - 2, 0);
    v_new_xp := v_current_xp;
    v_new_stat_value := greatest(v_stat_value - 1, 0);

    if v_new_hp <= 0 then
      v_new_hp := v_max_hp;
      v_new_gold := v_new_gold / 2;
      v_died := true;

      update public.streaks
      set current_streak = 0,
          xp_multiplier = 1.0,
          last_active_date = null
      where user_id = v_user_id;
    end if;
  end if;

  execute format('update public.profiles set hp = $1, gold = $2, xp = $3, stat_%I = $4 where id = $5', v_stat_affected)
  using v_new_hp, v_new_gold, v_new_xp, v_new_stat_value, v_user_id;

  v_result := json_build_object(
    'success', true,
    'is_good', v_is_good,
    'hp', v_new_hp,
    'gold', v_new_gold,
    'xp', v_new_xp,
    'died', v_died,
    'stat_affected', v_stat_affected,
    'new_stat_value', v_new_stat_value,
    'xp_awarded', case when v_is_good then greatest(v_habit_xp, 0) else 0 end,
    'gold_awarded', case when v_is_good then greatest(v_habit_gold, 0) else 0 end,
    'stat_points_awarded', case when v_is_good then greatest(v_habit_stat_points, 0) else -1 end
  );

  return v_result;
end;
$$;
