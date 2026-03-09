-- Migration: 007_add_profile_preferences
-- Description: Add preferences columns to profiles for better personalized quests.

alter table public.profiles
  add column likes text,
  add column dislikes text,
  add column focus_areas text;
