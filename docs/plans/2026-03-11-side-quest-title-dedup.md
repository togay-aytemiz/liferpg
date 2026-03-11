# Side Quest Title Dedup Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Prevent duplicate side quests from being generated or displayed at the same time.

**Architecture:** Reuse the shared title-normalization helper already introduced for daily pools. Apply it once on the backend before persisting generated side quests, and once in the Quests screen as a last-line safeguard for legacy dirty data.

**Tech Stack:** Supabase Edge Functions (Deno), React + TypeScript frontend.

---

### Task 1: Deduplicate generated side quests

**Files:**
- Modify: `src/lib/dailyPool.ts`
- Modify: `supabase/functions/generate-quests/index.ts`
- Modify: `supabase/functions/regenerate-quests/index.ts`

**Steps:**
- Expose a generic title-based quest dedupe helper.
- Apply it to side quests before slicing to the side-quest limit.
- Tighten prompts so side quests must be distinct from each other.

### Task 2: Hide legacy duplicate side quests in the UI

**Files:**
- Modify: `src/pages/Quests.tsx`

**Steps:**
- Deduplicate the active side-quest list before rendering.
- Preserve existing action handlers and ordering.

### Task 3: Verify and document

**Files:**
- Modify: `docs/ROADMAP.md`
- Modify: `docs/PRD.md`
- Modify: `docs/RELEASE.md`

**Steps:**
- Document side-quest title dedup in product behavior and release notes.
- Run `npm run build`.
- Deploy `generate-quests` and `regenerate-quests`.
