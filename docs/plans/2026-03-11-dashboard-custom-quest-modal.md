# Dashboard Custom Quest Modal Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Open the custom quest forge modal directly from Home's Today's Dailies section and add the forged quest into the current day flow without redirecting to Quests.

**Architecture:** Extract the existing Quests-only forge modal into a shared component. Reuse the same creation flow in Dashboard, defaulting the Home entry point to a `daily` quest so the forged quest appears in the current daily list immediately after creation. Keep API behavior unchanged unless the server already blocks active daily insertion.

**Tech Stack:** React + TypeScript, shared frontend modal component, existing Supabase Edge Function for custom quest creation.

---

### Task 1: Verify the current custom-quest backend behavior

**Files:**
- Inspect: `supabase/functions/create-custom-quest/index.ts`

**Steps:**
- Confirm whether custom daily quests are inserted as active.
- If not, adjust the function so Home-forged daily quests enter today's active flow immediately.

### Task 2: Extract a shared forge modal

**Files:**
- Create: `src/components/CustomQuestModal.tsx`
- Modify: `src/pages/Quests.tsx`
- Modify: `src/pages/Dashboard.tsx`

**Steps:**
- Move modal UI and submit state out of `Quests.tsx`.
- Make it configurable by default quest type and completion callback.
- Reuse it from both Quests and Dashboard.

### Task 3: Wire Home's plus action to the shared modal

**Files:**
- Modify: `src/pages/Dashboard.tsx`

**Steps:**
- Replace navigation to `/quests` with opening the forge modal in place.
- Default Home entry to `daily` so the new quest belongs to today's dailies.
- Refresh/inject the result so the card appears immediately in the Home daily list.

### Task 4: Update docs and verify

**Files:**
- Modify: `docs/ROADMAP.md`
- Modify: `docs/PRD.md`
- Modify: `docs/RELEASE.md`

**Steps:**
- Document the new Home forge behavior.
- Run `npm run build`.
- Deploy backend only if `create-custom-quest` changes.
