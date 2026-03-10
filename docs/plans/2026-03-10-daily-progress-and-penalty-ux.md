# Daily Progress And Penalty UX Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Unify the Home and Quests daily-progress card, restyle the daily reset countdown into a three-line centered block, and make the daily penalty rule clearer while raising the completion threshold to 80%.

**Architecture:** Extract a reusable `DailyProgressCard` component that owns the progress summary, reset countdown, and penalty helper modal. Move the daily success threshold into a small shared utility so both the frontend helper copy and `daily-cron` use the same rule.

**Tech Stack:** React, TypeScript, Tailwind CSS, Supabase Edge Functions, Vite

---

### Task 1: Centralize the daily success rule

**Files:**
- Create: `src/lib/dailyRules.ts`
- Modify: `supabase/functions/daily-cron/index.ts`

**Step 1: Create the shared rule helper**

Add:

```ts
export const DAILY_SUCCESS_THRESHOLD = 0.8;
export const DAILY_SUCCESS_THRESHOLD_PERCENT = Math.round(DAILY_SUCCESS_THRESHOLD * 100);

export function getRequiredDailyCompletions(activeCount: number): number {
  if (activeCount <= 0) return 0;
  return Math.ceil(activeCount * DAILY_SUCCESS_THRESHOLD);
}
```

**Step 2: Use it in `daily-cron`**

Replace the local threshold constant/helper so the overnight penalty logic uses the same 80% rule that the UI explains.

### Task 2: Extract the shared daily-progress card

**Files:**
- Create: `src/components/DailyProgressCard.tsx`
- Modify: `src/components/DailyResetCountdown.tsx`
- Modify: `src/pages/Dashboard.tsx`
- Modify: `src/pages/Quests.tsx`

**Step 1: Build the shared card**

The card should render:
- title
- `completed / total`
- small text button for the daily rule
- `DailyResetCountdown`

**Step 2: Add the helper modal**

Use a compact mobile modal/bottom-sheet style that explains:
- at least 80% of active dailies clears the day
- missing that threshold can cost HP overnight
- streak freezes still protect the player

**Step 3: Reuse the component in Home and Quests**

Both pages should call the same component instead of duplicating markup.

### Task 3: Restyle the countdown and simplify Quests

**Files:**
- Modify: `src/components/DailyResetCountdown.tsx`
- Modify: `src/pages/Quests.tsx`

**Step 1: Restyle the countdown**

Render exactly three stacked rows:
- `New dailies in`
- countdown string
- reset helper line

Keep the countdown wrapper vertically centered inside the progress card.

**Step 2: Remove redundant quest helper text**

Delete the extra descriptive line under the tab switcher in Quests so the screen stays tighter.

### Task 4: Update docs and verify

**Files:**
- Modify: `docs/ROADMAP.md`
- Modify: `docs/PRD.md`
- Modify: `docs/RELEASE.md`

**Step 1: Update docs**

Document:
- shared daily-progress card
- three-line countdown layout
- 80% daily-clear threshold
- helper modal/button for penalty rules

**Step 2: Run verification**

Run: `npm run build`
Expected: production build succeeds.
