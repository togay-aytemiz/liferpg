# Reroll Feedback And Inventory Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make daily rerolls collect structured feedback for future LLM generation, turn Bazaar purchases into persistent inventory items, fix reroll availability visibility, and polish Character stat visuals.

**Architecture:** Add a dedicated quest feedback table so reroll reasons are stored without polluting completion/skip records, and feed recent reroll memory into generation prompts. Move shop purchases to an inventory ledger so buying and consuming are separate actions, with reusable static items and redeemable personalized offers. Keep UI changes thin by reusing shared components and invalidating existing caches after mutations.

**Tech Stack:** React, TypeScript, Supabase Edge Functions, Postgres migrations/RPC, existing shared cache/runtime helpers.

---

### Task 1: Add persistent reroll feedback and inventory schema

**Files:**
- Create: `/Users/togay/Desktop/lifeRPG/supabase/migrations/017_add_quest_feedback_and_inventory.sql`
- Modify: `/Users/togay/Desktop/lifeRPG/src/lib/database.types.ts`

**Steps:**
1. Add a `quest_feedback` table with `user_id`, `quest_id`, `quest_title`, `quest_type`, `feedback_type`, `reason_bucket`, `reason_detail`, `app_day_key`, `created_at`, plus RLS and helpful indexes.
2. Add a `inventory_items` table with `user_id`, `source_type`, `source_item_id`, `item_key`, `title`, `description`, `category`, `quantity`, `metadata`, `is_consumable`, `is_redeemed`, `redeemed_at`, `created_at`, plus RLS and indexes.
3. Update TypeScript DB types for both tables.

### Task 2: Make reroll flow store structured reasons and use them in prompts

**Files:**
- Modify: `/Users/togay/Desktop/lifeRPG/supabase/functions/skip-quest/index.ts`
- Modify: `/Users/togay/Desktop/lifeRPG/supabase/functions/_shared/recentQuestBehavior.ts`
- Modify: `/Users/togay/Desktop/lifeRPG/src/lib/api.ts`
- Modify: `/Users/togay/Desktop/lifeRPG/src/components/QuestCard.tsx`
- Modify: `/Users/togay/Desktop/lifeRPG/src/pages/Dashboard.tsx`
- Modify: `/Users/togay/Desktop/lifeRPG/src/pages/Quests.tsx`

**Steps:**
1. Accept reroll reason payload (`reason_bucket`, optional `reason_detail`) in the reroll path.
2. Insert reroll feedback rows before replacement selection.
3. Extend recent behavior context to summarize recent reroll reasons and disliked patterns.
4. Add a reroll reason picker modal with predefined buckets and optional custom text.
5. Ensure reroll availability text reflects real reserve state and explains when there is no reserve left.

### Task 3: Move Bazaar purchases to inventory and add item usage

**Files:**
- Modify: `/Users/togay/Desktop/lifeRPG/supabase/functions/buy-item/index.ts`
- Create: `/Users/togay/Desktop/lifeRPG/supabase/functions/use-inventory-item/index.ts`
- Modify: `/Users/togay/Desktop/lifeRPG/supabase/config.toml`
- Modify: `/Users/togay/Desktop/lifeRPG/src/lib/api.ts`
- Modify: `/Users/togay/Desktop/lifeRPG/src/pages/Shop.tsx`
- Modify: `/Users/togay/Desktop/lifeRPG/src/lib/viewCache.ts`

**Steps:**
1. Change static purchases so they add/increment inventory quantity instead of applying immediately.
2. Change dynamic purchases so bought offers become inventory entries and can be redeemed later.
3. Add a `use-inventory-item` edge function that applies static item effects or marks dynamic offers redeemed.
4. Extend Shop UI with an Inventory section, quantity badges, and `Use` / `Redeem` actions.
5. Invalidate shop/runtime caches after buy/use.

### Task 4: Polish character stats visuals

**Files:**
- Modify: `/Users/togay/Desktop/lifeRPG/src/pages/Achievements.tsx`

**Steps:**
1. Map each stat to a fitting icon and color.
2. Render icon + label as one row language, keeping current bars intact.
3. Keep contrast consistent with the rest of the app.

### Task 5: Verify, deploy, document

**Files:**
- Modify: `/Users/togay/Desktop/lifeRPG/docs/ROADMAP.md`
- Modify: `/Users/togay/Desktop/lifeRPG/docs/PRD.md`
- Modify: `/Users/togay/Desktop/lifeRPG/docs/RELEASE.md`

**Steps:**
1. Run `npm run build`.
2. Run `supabase db push --linked`.
3. Deploy changed functions.
4. Update roadmap, PRD, and release notes.
