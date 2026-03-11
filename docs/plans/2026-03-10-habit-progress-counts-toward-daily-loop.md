# Habit Progress Counts Toward Daily Loop Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make completed daily habits count toward the same daily progress and overnight success rule as daily quests.

**Architecture:** Extend the shared quest runtime snapshot so Dashboard and Quests read one combined daily-objective model. Treat active good daily habits as daily objectives, count each habit at most once per day, and mirror the same rule inside `daily-cron` so UI and overnight penalties stay consistent.

**Tech Stack:** React, TypeScript, Supabase JS, Supabase Edge Functions, PostgreSQL habit logs

---

### Task 1: Define the combined daily-objective rule

**Files:**
- Modify: `src/lib/dailyRules.ts`
- Modify: `src/lib/gameplay.ts`

**Step 1: Write the shared rule**
- Keep the existing 80% threshold.
- Add a small helper for combined daily objective progress that accepts quest completions and logged habit ids.
- Count only active `daily` + `is_good` habits.
- Count each habit at most once per day.

**Step 2: Keep naming honest**
- Rename UI-facing progress semantics from “daily quests” to “daily objectives” where needed.

**Step 3: Verify locally in code paths**
- Ensure Dashboard and Quests can consume the same `{ completed, total }` shape without duplicated logic.

### Task 2: Extend the shared runtime snapshot

**Files:**
- Modify: `src/lib/questRuntime.ts`
- Modify: `src/lib/api.ts`
- Modify: `src/lib/habitEvents.ts`

**Step 1: Fetch habit data with quest runtime**
- Add active daily good habits to the runtime snapshot.
- Add today’s distinct logged daily habit ids to the runtime snapshot.

**Step 2: Invalidate correctly**
- Invalidate quest runtime cache when a habit is logged.
- Emit a habit-logged UI event so the current screen can refresh without a full reload.

**Step 3: Verify no duplicate counting**
- Deduplicate habit logs by `habit_id` before writing the snapshot.

### Task 3: Update Dashboard and Quests progress UI

**Files:**
- Modify: `src/pages/Dashboard.tsx`
- Modify: `src/pages/Quests.tsx`
- Modify: `src/components/DailyProgressCard.tsx`

**Step 1: Switch both pages to the same combined progress source**
- Read the shared daily-objective progress from the runtime snapshot.
- Use the same card props on both pages.

**Step 2: Update copy**
- Change labels/help text from quest-only wording to daily-objective wording.
- Explain that good daily habits count toward the 80% threshold.

**Step 3: Verify live update behavior**
- Logging a daily good habit on Home should update progress immediately.
- Navigating to Quests should show the same number without extra drift.

### Task 4: Align nightly penalty logic

**Files:**
- Modify: `supabase/functions/daily-cron/index.ts`

**Step 1: Count the same objective pool server-side**
- Fetch active daily quests.
- Fetch active good daily habits.
- Fetch yesterday’s distinct logged habit ids.

**Step 2: Apply the same threshold**
- Total objectives = active daily quests + active daily good habits.
- Completed objectives = completed daily quests + distinct logged daily good habits.
- Only unfinished objectives beyond the 80% threshold should trigger HP loss.

**Step 3: Preserve existing protections**
- Keep streak freeze behavior unchanged.
- Keep daily quest rotation and boss normalization unchanged.

### Task 5: Update docs and verify

**Files:**
- Modify: `docs/ROADMAP.md`
- Modify: `docs/PRD.md`
- Modify: `docs/RELEASE.md`

**Step 1: Document the rule**
- Record that daily good habits count toward the daily objective loop.

**Step 2: Verify**
- Run: `npm run build`
- If `daily-cron` changes, deploy that function.

**Step 3: Commit**
- Suggested commit: `fix(phase-4): count daily habit completions toward the daily objective loop`
