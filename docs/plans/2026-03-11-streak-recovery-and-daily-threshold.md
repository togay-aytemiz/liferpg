# Streak Recovery And Daily Threshold Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Recover app-entry streak continuity across the 03:00 boundary and align the daily-rule threshold math/copy with the intended 80% floor behavior.

**Architecture:** Keep the streak model app-day based, but add a narrow recovery path for users who already had `last_daily_settlement_day` written before streak check-ins were persisted. Reuse the same shared daily-rules helper on both frontend copy and backend settlement so the rule is defined once.

**Tech Stack:** React, TypeScript, Supabase Edge Functions, shared app-day utilities, Tailwind UI.

---

### Task 1: Recover legacy app-entry streak continuity

**Files:**
- Modify: `src/lib/streaks.ts`
- Modify: `supabase/functions/settle-daily/index.ts`
- Modify: `supabase/functions/complete-quest/index.ts`

**Steps:**
1. Extend the shared streak helper to accept a narrow legacy fallback day source.
2. Use the fallback only when the streak row does not yet prove an app-day check-in.
3. Feed profile settlement metadata into `settle-daily` and `complete-quest` so both paths apply the same recovery rule.
4. Keep the rule one-way and conservative so it repairs affected users without inflating normal streaks.

### Task 2: Align the 80% threshold math and copy

**Files:**
- Modify: `src/lib/dailyRules.ts`
- Modify: `src/components/DailyProgressCard.tsx`
- Modify: `supabase/functions/_shared/dailySettlement.ts`

**Steps:**
1. Change the required-completions helper to use floor-based 80% with a minimum of 1 active objective.
2. Ensure the modal threshold label comes from the same helper.
3. Keep backend settlement on the same shared helper so overnight penalties match the UI.

### Task 3: Verify and document

**Files:**
- Modify: `docs/ROADMAP.md`
- Modify: `docs/PRD.md`
- Modify: `docs/RELEASE.md`

**Steps:**
1. Update roadmap/PRD/release notes with the repaired app-entry streak behavior and floor-based 80% rule.
2. Run `npm run build`.
3. Deploy affected edge functions.
