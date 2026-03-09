-- Migration: 009_add_is_custom_to_quests
-- Description: Add is_custom flag to quests to differentiate user-created quests from daily generated ones

alter table public.quests
  add column is_custom boolean not null default false;
