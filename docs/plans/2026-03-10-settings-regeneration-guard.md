# Settings Regeneration Guard Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make quest regeneration from Settings intentional, non-destructive, and clearly separate from passive profile viewing.

**Architecture:** Treat quest-generation inputs as a gated edit flow rather than always-live form fields. The UI should only allow regeneration when those inputs actually changed, and the server/client flow should regenerate quests without touching progression state such as XP, level, gold, streaks, stats, or achievements.

**Tech Stack:** React, TypeScript, Supabase JS, Supabase Edge Functions

---

### Task 1: Gate quest-input editing

**Files:**
- Modify: `src/pages/Settings.tsx`

**Steps:**
1. Add an explicit edit button for the life-rhythm/likes/dislikes/focus block.
2. Show a read-only summary until the user enters edit mode.
3. Add cancel behavior that resets local edits back to the saved profile snapshot.

### Task 2: Add dirty-state regenerate rules

**Files:**
- Modify: `src/pages/Settings.tsx`

**Steps:**
1. Compare normalized local quest-input values against the saved profile.
2. Disable regenerate when the form is unchanged or invalid.
3. Update button copy so the action is clearly `Regenerate Quests`, not rewards.

### Task 3: Preserve progression explicitly

**Files:**
- Modify: `src/pages/Settings.tsx`
- Verify: `supabase/functions/regenerate-quests/index.ts`

**Steps:**
1. Remove forced reward regeneration from the Settings flow.
2. Keep quest regeneration limited to quest-pool refresh and profile preference updates.
3. Surface user-facing copy that progression remains intact.

### Task 4: Verify and document

**Files:**
- Modify: `docs/ROADMAP.md`
- Modify: `docs/PRD.md`
- Modify: `docs/RELEASE.md`

**Steps:**
1. Run `npm run build`.
2. Update product docs and release notes.
