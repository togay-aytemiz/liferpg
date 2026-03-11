# Daily Pool Dedup And Variety Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Eliminate duplicate visible daily quests and make the rotating daily pool feel more varied from day to day without increasing LLM call volume.

**Architecture:** Harden the system at three layers. First, tighten LLM prompts and post-LLM sanitization so generated daily pools are internally diverse. Second, make nightly rotation choose a unique, novelty-aware active set from the latest daily pool instead of a naive sequential slice. Third, keep a small frontend safeguard that deduplicates visible dailies by normalized title so legacy dirty data cannot leak a broken UX.

**Tech Stack:** Supabase Edge Functions (Deno), React + TypeScript frontend, shared TypeScript gameplay utilities.

---

### Task 1: Add shared daily-pool normalization utilities

**Files:**
- Create: `src/lib/dailyPool.ts`
- Modify: `supabase/functions/generate-quests/index.ts`
- Modify: `supabase/functions/regenerate-quests/index.ts`
- Modify: `supabase/functions/daily-cron/index.ts`
- Modify: `supabase/functions/skip-quest/index.ts`
- Modify: `src/lib/questRuntime.ts`

**Step 1: Write the helper API**
- Add a title/description normalization helper.
- Add `dedupeDailyPool()` to remove near-duplicate daily quests by normalized title stem.
- Add `pickNovelDailySet()` to choose a unique visible set while avoiding yesterday's same titles when alternatives exist.

**Step 2: Keep the implementation minimal**
- Normalize casing, punctuation, whitespace, common filler verbs, and small numeric variations.
- Prefer preserving original order for stable UX.
- Avoid embeddings or extra OpenAI calls.

**Step 3: Verify imports compile**
Run: `npm run build`
Expected: build passes with the new shared helper imported by edge functions.

### Task 2: Make generated daily pools internally diverse

**Files:**
- Modify: `supabase/functions/generate-quests/index.ts`
- Modify: `supabase/functions/regenerate-quests/index.ts`

**Step 1: Tighten the system prompt**
- Explicitly forbid duplicate or near-duplicate daily quests in the same pool.
- Require the daily pool to cover multiple life areas/stats when the user's profile allows it.
- Require at least one learning/knowledge-flavored daily when it does not conflict with dislikes and the routine leaves room for it.

**Step 2: Sanitize after validation**
- Run validated `daily_quests` through `dedupeDailyPool()` before slicing to the pool limit.
- Keep the best unique subset in original order instead of storing the raw duplicate-heavy pool.

**Step 3: Keep LLM cost flat**
- Do not add a second OpenAI pass.
- Reuse the single existing generation response.

### Task 3: Fix nightly daily rotation so it avoids duplicates and obvious repeats

**Files:**
- Modify: `supabase/functions/daily-cron/index.ts`

**Step 1: Read yesterday's active daily set**
- Fetch yesterday's active daily titles from the latest pool or current active set before reset.

**Step 2: Choose the next visible set with novelty**
- Replace naive sequential `buildRotatedDailyIds()` selection with helper-driven selection.
- Keep the active count small (3-5), unique by normalized title, and prefer titles not shown yesterday.

**Step 3: Normalize legacy dirty data**
- If the latest pool already contains duplicates, only activate one representative title.
- This should repair old users without requiring manual regenerate.

### Task 4: Add frontend last-line defense for visible dailies

**Files:**
- Modify: `src/lib/gameplay.ts`

**Step 1: Dedupe visible daily list**
- Apply the same normalized-title logic before slicing visible daily quests.
- Keep this as a safeguard only; server remains the primary fix.

**Step 2: Preserve current progress behavior**
- Do not change the visible-count rule.
- Do not change daily objective calculations except that duplicates no longer inflate totals.

### Task 5: Update docs and verify

**Files:**
- Modify: `docs/ROADMAP.md`
- Modify: `docs/PRD.md`
- Modify: `docs/RELEASE.md`

**Step 1: Document the behavior change**
- Note duplicate-daily prevention.
- Note more varied daily pool generation and novelty-aware nightly rotation.

**Step 2: Verify**
Run: `npm run build`
Expected: PASS

**Step 3: Deploy changed edge functions**
- Deploy `generate-quests`
- Deploy `regenerate-quests`
- Deploy `skip-quest`
- Deploy `daily-cron`

**Step 4: Commit**
```bash
git add docs/ROADMAP.md docs/PRD.md docs/RELEASE.md docs/plans/2026-03-11-daily-pool-dedup-and-variety.md src/lib/dailyPool.ts src/lib/gameplay.ts src/lib/questRuntime.ts supabase/functions/generate-quests/index.ts supabase/functions/regenerate-quests/index.ts supabase/functions/skip-quest/index.ts supabase/functions/daily-cron/index.ts
git commit -m "fix(phase-4): dedupe rotating daily pools and improve daily variety"
```
