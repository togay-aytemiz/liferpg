# Daily Reroll Quota Cap Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Reduce daily reroll allowance to 2 per app day and make the UI reflect that quota instead of exposing raw reserve size.

**Architecture:** Keep the existing reserve-based reroll pool, but add an app-day quota layer on top. Backend enforces the daily quota using `quest_feedback` rows for `feedback_type = 'reroll'`; frontend computes and displays remaining reroll rights as `min(quota remaining, reserve remaining)` while still surfacing reserve exhaustion clearly.

**Tech Stack:** React, TypeScript, Supabase Edge Functions, Postgres

---

### Task 1: Add a shared daily reroll quota constant

**Files:**
- Modify: `/Users/togay/Desktop/lifeRPG/src/lib/questRuntime.ts`
- Modify: `/Users/togay/Desktop/lifeRPG/supabase/functions/skip-quest/index.ts`

**Steps:**
1. Define a single `MAX_DAILY_REROLLS = 2` constant in frontend runtime and backend reroll flow.
2. Replace the old implicit reserve-only interpretation with quota-aware logic.

### Task 2: Enforce the limit on the server

**Files:**
- Modify: `/Users/togay/Desktop/lifeRPG/supabase/functions/skip-quest/index.ts`

**Steps:**
1. Query today's reroll feedback count for the authenticated user.
2. Reject reroll requests with HTTP 429 once 2 rerolls were used in the current app day.
3. Keep reserve checks intact so zero alternates still returns a reserve-exhausted message.

### Task 3: Make frontend counts quota-aware

**Files:**
- Modify: `/Users/togay/Desktop/lifeRPG/src/lib/questRuntime.ts`
- Modify: `/Users/togay/Desktop/lifeRPG/src/components/QuestCard.tsx`
- Modify: `/Users/togay/Desktop/lifeRPG/src/components/RerollReasonModal.tsx`

**Steps:**
1. Read today's reroll feedback count from `quest_feedback`.
2. Compute `remainingDailyRerolls` as the capped daily rights left, not raw reserve size.
3. Update helper copy so the menu/modal says `2 rerolls per day` semantics and distinguishes quota exhaustion from reserve exhaustion.

### Task 4: Verify and document

**Files:**
- Modify: `/Users/togay/Desktop/lifeRPG/docs/ROADMAP.md`
- Modify: `/Users/togay/Desktop/lifeRPG/docs/PRD.md`
- Modify: `/Users/togay/Desktop/lifeRPG/docs/RELEASE.md`

**Steps:**
1. Run `npm run build`.
2. Update roadmap, PRD tech decisions, and release notes.
3. If backend code changed, deploy the affected function(s).
