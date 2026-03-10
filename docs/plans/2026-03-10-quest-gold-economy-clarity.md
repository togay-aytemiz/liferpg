# Quest Gold Economy Clarity Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make the gold economy understandable and functional by ensuring quests visibly award gold, existing stale quests still pay gold on completion, and the spend loop clearly points into the Bazaar.

**Architecture:** Create one shared quest-gold helper in `src/lib` that both the frontend and Supabase Edge Functions can import. Use that helper to populate new quest rows, backfill reward logic for older zero-gold quests at completion time, and surface the reward values in quest cards and completion toasts so players understand how coins are earned and spent.

**Tech Stack:** React, TypeScript, Supabase Edge Functions, Vite

---

### Task 1: Centralize quest gold rules

**Files:**
- Create: `src/lib/questEconomy.ts`
- Modify: `supabase/functions/generate-quests/index.ts`
- Modify: `supabase/functions/regenerate-quests/index.ts`
- Modify: `supabase/functions/skip-quest/index.ts`
- Modify: `supabase/functions/complete-quest/index.ts`

**Step 1: Create a shared helper**

Add one function that returns a gold value based on quest type and difficulty, while preserving any existing positive `gold_reward`.

**Step 2: Use it when generating quests**

Replace hardcoded `gold_reward: 0/5/...` values in quest-generation flows.

**Step 3: Use it at completion time**

If an older quest row still has `0` gold, compute a fallback reward so current users are not stuck with a dead currency loop.

### Task 2: Surface the economy in the UI

**Files:**
- Modify: `src/components/QuestCard.tsx`
- Modify: `src/pages/Dashboard.tsx`
- Modify: `src/pages/Quests.tsx`
- Modify: `src/pages/Shop.tsx`

**Step 1: Show gold on quest cards**

Quest cards should show both XP and gold rewards.

**Step 2: Improve completion feedback**

Completion toasts should mention gold as well as XP.

**Step 3: Clarify spending**

Add a small helper line in the hero/Bazaar surfaces so players see the loop: earn gold from quests, spend it in Bazaar.

### Task 3: Update docs, verify, and deploy

**Files:**
- Modify: `docs/ROADMAP.md`
- Modify: `docs/PRD.md`
- Modify: `docs/RELEASE.md`

**Step 1: Document the economy loop**

Record that quests now visibly reward gold and that Bazaar spending is tied to quest earnings.

**Step 2: Run verification**

Run: `npm run build`
Expected: build succeeds.

**Step 3: Deploy affected edge functions**

If Supabase CLI is available, deploy:
- `complete-quest`
- `generate-quests`
- `regenerate-quests`
- `skip-quest`
