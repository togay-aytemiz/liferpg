# Recent Behavior Context And Daily Settlement Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make quest generation smarter by feeding the LLM recent user behavior, and make nightly HP/streak penalties reliable even when the background cron is missing or late.

**Architecture:** Add one shared recent-behavior context builder for quest-generation functions and one shared daily-settlement helper for nightly rotation/penalty logic. Keep daily rotation cheap by continuing to rotate from the current pool, but make pool generation aware of the last 7 app days. Add a user-scoped authenticated settlement fallback so the first app open after reset can safely settle the previous day once.

**Tech Stack:** React, TypeScript, Supabase Edge Functions, SQL migration, shared TS helpers

---

### Task 1: Persist daily settlement state

**Files:**
- Create: `supabase/migrations/016_add_last_daily_settlement_day.sql`
- Modify: `src/lib/database.types.ts`

**Steps:**
1. Add a nullable `last_daily_settlement_day` column to `profiles`.
2. Mirror the new field in frontend DB types.

### Task 2: Build recent behavior prompt context

**Files:**
- Create: `supabase/functions/_shared/recentQuestBehavior.ts`
- Modify: `supabase/functions/generate-quests/index.ts`
- Modify: `supabase/functions/regenerate-quests/index.ts`
- Modify: `supabase/functions/skip-quest/index.ts`

**Steps:**
1. Summarize the last 7 app days of completions and skipped quests with reasons.
2. Include recent generated daily titles to discourage repetition.
3. Inject that summary into all LLM-driven quest generation paths.

### Task 3: Centralize daily settlement logic

**Files:**
- Create: `supabase/functions/_shared/dailySettlement.ts`
- Create: `supabase/functions/settle-daily/index.ts`
- Modify: `supabase/functions/daily-cron/index.ts`
- Modify: `supabase/config.toml`

**Steps:**
1. Extract one shared per-user settlement routine.
2. Make it idempotent per app day using `last_daily_settlement_day`.
3. Reuse it from both `daily-cron` and a new authenticated `settle-daily` function.

### Task 4: Trigger settlement from the app shell

**Files:**
- Modify: `src/lib/api.ts`
- Modify: `src/lib/habitEvents.ts`
- Modify: `src/App.tsx`

**Steps:**
1. Add a frontend API call for `settle-daily`.
2. Invalidate relevant caches and emit a runtime-refresh event when settlement changes state.
3. Trigger settlement on authenticated app entry and when the tab becomes visible again.

### Task 5: Verify, document, and deploy

**Files:**
- Modify: `docs/ROADMAP.md`
- Modify: `docs/PRD.md`
- Modify: `docs/RELEASE.md`

**Steps:**
1. Run `npm run build`.
2. Deploy `generate-quests`, `regenerate-quests`, `skip-quest`, `daily-cron`, and `settle-daily`.
3. Update product/docs to capture the recent-behavior prompt memory and the authenticated daily-settlement fallback.
