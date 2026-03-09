-- Migration: 012_add_habit_frequency
-- Description: Adds a frequency column to the habits table to support daily, weekly, and monthly habits.

-- Add frequency column with a check constraint for valid values
ALTER TABLE public.habits
ADD COLUMN frequency text NOT NULL DEFAULT 'daily'
CHECK (frequency IN ('daily', 'weekly', 'monthly'));

-- Add an index for querying habits by frequency
CREATE INDEX habits_frequency_idx ON public.habits(frequency);
