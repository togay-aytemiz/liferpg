-- Migration: 015_quest_chains
-- Description: Add chain support to quests table for multi-step connected quests

-- chain_id groups quests in the same chain (NULL = standalone quest)
ALTER TABLE public.quests
  ADD COLUMN chain_id uuid DEFAULT NULL;

-- chain_step is the order within the chain (1 = first, 2 = second, etc.)
ALTER TABLE public.quests
  ADD COLUMN chain_step integer DEFAULT NULL;

-- chain_total is the total number of steps in the chain
ALTER TABLE public.quests
  ADD COLUMN chain_total integer DEFAULT NULL;

-- Index for efficient chain grouping queries
CREATE INDEX idx_quests_chain_id ON public.quests(chain_id) WHERE chain_id IS NOT NULL;
