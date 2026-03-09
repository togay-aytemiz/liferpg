-- Migration: 014_expand_achievements
-- Description: Add more achievements for infinite progression + new categories

-- New achievements for higher levels (infinite progression)
insert into public.achievements (title, description, icon, rarity, unlock_condition) values
  ('Level 25',            'Reach Level 25. A true veteran.',                    '🔮', 'rare',      '{"type": "level_reached", "value": 25}'),
  ('Level 50',            'Reach Level 50. Half-century hero!',                 '🏅', 'epic',      '{"type": "level_reached", "value": 50}'),
  ('Level 100',           'Reach Level 100. Living legend.',                    '👑', 'legendary', '{"type": "level_reached", "value": 100}'),

  -- More quest milestones
  ('Century Slayer',      'Complete 100 quests.',                               '💯', 'rare',      '{"type": "quest_count", "value": 100}'),
  ('500 Club',            'Complete 500 quests. Relentless!',                   '⚔️', 'epic',      '{"type": "quest_count", "value": 500}'),
  ('Thousand Blade',      'Complete 1000 quests. Unstoppable force.',           '🗡️', 'legendary', '{"type": "quest_count", "value": 1000}'),

  -- More streak milestones
  ('Fortnight Focus',     'Maintain a 14-day streak.',                          '🎯', 'uncommon',  '{"type": "streak_days", "value": 14}'),
  ('Seasonal Champion',   'Maintain a 90-day streak.',                          '🌊', 'epic',      '{"type": "streak_days", "value": 90}'),
  ('Year of Discipline',  'Maintain a 365-day streak.',                         '🌟', 'legendary', '{"type": "streak_days", "value": 365}'),

  -- Boss quest milestones
  ('Dragon Slayer',       'Defeat 25 Boss Quests.',                             '🐲', 'epic',      '{"type": "boss_defeated", "value": 25}'),
  ('Boss Overlord',       'Defeat 50 Boss Quests.',                             '👹', 'legendary', '{"type": "boss_defeated", "value": 50}'),

  -- Habit milestones (new condition type)
  ('Habit Starter',       'Create your first habit.',                           '🌱', 'common',    '{"type": "habit_count", "value": 1}'),
  ('Habit Builder',       'Create 5 habits.',                                   '🌿', 'uncommon',  '{"type": "habit_count", "value": 5}'),
  ('Habit Machine',       'Create 10 habits. Your routine is solid!',           '🌳', 'rare',      '{"type": "habit_count", "value": 10}'),

  -- Gold milestones (new condition type)
  ('First Gold',          'Accumulate 100 gold.',                               '🪙', 'common',    '{"type": "gold_reached", "value": 100}'),
  ('Golden Pile',         'Accumulate 1,000 gold.',                             '💰', 'uncommon',  '{"type": "gold_reached", "value": 1000}'),
  ('Treasure Hoard',      'Accumulate 10,000 gold.',                            '🏦', 'rare',      '{"type": "gold_reached", "value": 10000}'),
  ('Dragon''s Fortune',   'Accumulate 100,000 gold.',                           '💎', 'legendary', '{"type": "gold_reached", "value": 100000}'),

  -- Shop purchase milestones (new condition type)
  ('First Purchase',      'Buy your first item from the shop.',                 '🛒', 'common',    '{"type": "shop_purchase", "value": 1}'),
  ('Shopaholic',          'Buy 10 items from the shop.',                        '🎁', 'uncommon',  '{"type": "shop_purchase", "value": 10}');
