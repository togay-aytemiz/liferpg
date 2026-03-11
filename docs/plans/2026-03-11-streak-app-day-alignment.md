# Streak App-Day Alignment Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make streaks and daily progression use the lifeRPG app day (`03:00 -> 03:00`) instead of raw UTC calendar dates.

**Architecture:** Introduce one shared app-day helper in `src/lib` and reuse it across frontend runtime code and Supabase Edge Functions. Store and compare `quest_date` and `last_active_date` using the same app-day key so streaks, rerolls, skips, and daily progress stay coherent.

**Tech Stack:** React, TypeScript, Supabase Edge Functions, shared TS utilities

---

### Task 1: Add a shared app-day helper

**Files:**
- Create: `src/lib/appDay.ts`
- Modify: `src/lib/gameplay.ts`

**Steps:**
1. Add app-day helpers for `03:00` reset, current app-day key, previous/next day keys, UTC query window, and reset countdown anchor.
2. Rewire `gameplay.ts` countdown helpers to use the shared app-day helper instead of local/UTC ad hoc math.
3. Keep the helper dependency-free so it can be imported by both browser code and Deno edge functions.

### Task 2: Align backend streak and daily write paths

**Files:**
- Modify: `supabase/functions/complete-quest/index.ts`
- Modify: `supabase/functions/skip-quest/index.ts`
- Modify: `supabase/functions/daily-cron/index.ts`

**Steps:**
1. Replace raw `toISOString().split("T")[0]` usage with the shared app-day key.
2. Make streak progression compare against the previous app-day key, not “yesterday UTC”.
3. Make nightly cron read yesterday’s app-day window and app-day key consistently for penalties, streak protection, and daily rotation seed.

### Task 3: Align frontend daily reads

**Files:**
- Modify: `src/lib/questRuntime.ts`
- Modify: `src/components/Habits.tsx`

**Steps:**
1. Replace UTC day windows and date keys with the shared app-day helper.
2. Ensure daily completions, reroll counts, and logged daily habits all reflect the same `03:00 -> 03:00` day as the backend.

### Task 4: Verify, document, and deploy

**Files:**
- Modify: `docs/ROADMAP.md`
- Modify: `docs/PRD.md`
- Modify: `docs/RELEASE.md`

**Steps:**
1. Run `npm run build`.
2. Deploy updated edge functions that changed app-day logic.
3. Update roadmap, PRD, and release notes with the new streak/day-boundary decision.
