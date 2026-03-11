alter table public.quests
  add column if not exists unlock_daily_required integer not null default 0,
  add column if not exists unlock_side_required integer not null default 0,
  add column if not exists unlock_rule_mode text not null default 'all';

alter table public.quests
  drop constraint if exists quests_unlock_rule_mode_check;

alter table public.quests
  add constraint quests_unlock_rule_mode_check
  check (unlock_rule_mode in ('any', 'all'));

with active_counts as (
  select
    q.user_id,
    count(*) filter (where q.quest_type = 'daily' and q.is_active = true) as active_daily_count,
    count(*) filter (where q.quest_type = 'side' and q.is_active = true) as active_side_count
  from public.quests q
  where q.user_id is not null
  group by q.user_id
)
update public.quests boss
set
  unlock_daily_required = case
    when boss.quest_type <> 'boss' then 0
    when coalesce(boss.chain_step, 1) > 1 then 0
    when boss.difficulty = 'epic' and coalesce(active_counts.active_daily_count, 0) > 0 then least(active_counts.active_daily_count, 4)
    when boss.difficulty <> 'epic' and coalesce(active_counts.active_daily_count, 0) > 0 then least(active_counts.active_daily_count, 3)
    else 0
  end,
  unlock_side_required = case
    when boss.quest_type <> 'boss' then 0
    when coalesce(boss.chain_step, 1) > 1 then 0
    when coalesce(active_counts.active_side_count, 0) > 0 then 1
    else 0
  end,
  unlock_rule_mode = case
    when boss.quest_type <> 'boss' then 'all'
    when coalesce(boss.chain_step, 1) > 1 then 'all'
    when boss.difficulty = 'epic' then 'all'
    when coalesce(active_counts.active_side_count, 0) > 0 then 'any'
    else 'all'
  end
from active_counts
where boss.user_id = active_counts.user_id
  and boss.quest_type = 'boss';
