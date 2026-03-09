-- Migration: 011_add_log_habit_rpc
-- Description: Adds a Postgres RPC function to safely log a habit and update user stats in a single transaction.

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
  -- 1. Get user_id from auth context
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  -- 2. Get habit details and verify ownership
  select is_good, stat_affected into v_is_good, v_stat_affected
  from public.habits
  where id = p_habit_id and user_id = v_user_id and is_active = true;

  if not found then
    raise exception 'Habit not found or inactive';
  end if;

  -- 3. Insert into habit_logs
  insert into public.habit_logs (user_id, habit_id)
  values (v_user_id, p_habit_id);

  -- 4. Get current user profile stats
  select hp, max_hp, gold, xp into v_current_hp, v_max_hp, v_current_gold, v_current_xp
  from public.profiles
  where id = v_user_id;

  -- Dynamic stat column name
  execute format('select stat_%I from public.profiles where id = $1', v_stat_affected)
  using v_user_id
  into v_stat_value;

  -- 5. Calculate new values based on good/bad habit
  if v_is_good then
    -- Good habit: +1 HP (up to max), +5 XP, +1 Stat
    v_new_hp := least(v_current_hp + 1, v_max_hp);
    v_new_gold := v_current_gold;
    v_new_xp := v_current_xp + 5;
    v_new_stat_value := v_stat_value + 1;
  else
    -- Bad habit: -5 HP, -2 Gold, -1 Stat (min 0)
    v_new_hp := v_current_hp - 5;
    v_new_gold := greatest(v_current_gold - 2, 0);
    v_new_xp := v_current_xp;
    v_new_stat_value := greatest(v_stat_value - 1, 0);

    -- Check for death
    if v_new_hp <= 0 then
      v_new_hp := v_max_hp;
      v_new_gold := v_new_gold / 2;
      v_died := true;

      -- Reset streak on death
      update public.streaks
      set current_streak = 0
      where user_id = v_user_id;
    end if;
  end if;

  -- 6. Update profile
  execute format('update public.profiles set hp = $1, gold = $2, xp = $3, stat_%I = $4 where id = $5', v_stat_affected)
  using v_new_hp, v_new_gold, v_new_xp, v_new_stat_value, v_user_id;

  -- 7. Return summary
  v_result := json_build_object(
    'success', true,
    'is_good', v_is_good,
    'hp', v_new_hp,
    'gold', v_new_gold,
    'xp', v_new_xp,
    'died', v_died,
    'stat_affected', v_stat_affected,
    'new_stat_value', v_new_stat_value
  );

  return v_result;
end;
$$;
