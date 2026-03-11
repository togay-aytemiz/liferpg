# Habit Card Completion Clarity Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make habit cards communicate today's completion state clearly and align their layout with quest cards.

**Architecture:** Keep the change frontend-only. Track today's habit logs in the Habits list, pass that state into the shared habit card, and restyle the card to mirror quest-card hierarchy: checkbox action, title, subtitle, then reward/meta row.

**Tech Stack:** React, TypeScript, Supabase JS, Tailwind CSS

---

### Task 1: Add today-log state to Habits

**Files:**
- Modify: `src/components/Habits.tsx`
- Modify: `src/lib/viewCache.ts`

**Step 1: Load today's logged habit ids**
- Fetch distinct `habit_id` values for the current UTC day.
- Cache them alongside the habit list.

**Step 2: Update local state after actions**
- Mark a habit as logged today immediately after success.
- Remove deleted habit ids from local state.

### Task 2: Redesign HabitCard

**Files:**
- Modify: `src/components/HabitCard.tsx`
- Create: `src/lib/habitGameplay.ts`

**Step 1: Match quest-card hierarchy**
- Use an empty checkbox before completion and a filled state after today's log.
- Put helper copy under the title.

**Step 2: Surface rewards clearly**
- Show the fixed habit reward/penalty chip first.
- Keep stat + frequency on the meta row.

**Step 3: Make completion obvious**
- Add a clearer completed/tracked-today visual treatment.
- Disable duplicate taps for the rest of the current day.

### Task 3: Update docs and verify

**Files:**
- Modify: `docs/ROADMAP.md`
- Modify: `docs/PRD.md`
- Modify: `docs/RELEASE.md`

**Step 1: Document the card behavior**
- Record that habit cards now show today's logged state and visible rewards.

**Step 2: Verify**
- Run: `npm run build`

**Step 3: Commit**
- Suggested commit: `style(phase-4): align habit cards with quest completion hierarchy`
