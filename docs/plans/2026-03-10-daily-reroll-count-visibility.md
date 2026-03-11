# Daily Reroll Count Visibility Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Show the remaining daily reroll count inside the quest action menu and explain clearly when no more rerolls are available from the current pool.

**Architecture:** Extend the shared quest runtime snapshot with a derived `remainingDailyRerolls` value based on the current hidden daily pool, then pass that value into shared quest cards on Dashboard and Quests. Keep the text aligned with current behavior: this is a pool-based daily reroll availability, not the side/boss refresh quota.

**Tech Stack:** React, TypeScript, Supabase JS

---

### Task 1: Add remaining daily-reroll count to the shared runtime

**Files:**
- Modify: `src/lib/questRuntime.ts`

**Step 1: Mirror the current server reroll pool logic**
- Query the latest AI daily batch.
- Count inactive, incomplete alternatives available from the current pool.

**Step 2: Save it in the shared snapshot**
- Expose `remainingDailyRerolls` beside existing quest runtime fields.

### Task 2: Surface the count in shared quest cards

**Files:**
- Modify: `src/components/QuestCard.tsx`
- Modify: `src/pages/Dashboard.tsx`
- Modify: `src/pages/Quests.tsx`

**Step 1: Pass the count into daily quest cards**
- Dashboard and Quests should both use the same prop.

**Step 2: Make the menu text explicit**
- Show the remaining count under `Reroll Daily`.
- If no alternates remain, disable the action and say that today’s pool has no rerolls left.

**Step 3: Refresh after reroll**
- Force-refresh quest runtime after a successful reroll so the count stays accurate.

### Task 3: Update docs and verify

**Files:**
- Modify: `docs/ROADMAP.md`
- Modify: `docs/PRD.md`
- Modify: `docs/RELEASE.md`

**Step 1: Document the menu behavior**
- Record that daily reroll availability is visible inside the action menu.

**Step 2: Verify**
- Run: `npm run build`

**Step 3: Commit**
- Suggested commit: `fix(phase-4): surface remaining daily rerolls inside quest actions`
