-- Migration: 006_add_skip_reason
-- Description: Add skip_reason column to user_quests to track why a quest was skipped.

alter table public.user_quests add column skip_reason text;
