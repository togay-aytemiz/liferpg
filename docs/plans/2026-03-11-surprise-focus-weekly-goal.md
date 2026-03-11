# Surprise Focus Weekly Goal Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make blank/surprise focus mode generate a stronger AI weekly focus arc, persist that focus on the profile, and show it in Settings while keeping likes/dislikes/preferences in the LLM context.

**Architecture:** Keep the current quest-generation flow and recent-behavior memory, but add a server-side auto-focus helper that detects blank/surprise focus mode and provides stronger prompt guidance from the player's level and weakest stats. Extend the OpenAI quest schema with `weekly_focus`, persist the chosen value on the profile, reuse it in Settings, and rebalance the visible active daily slice so auto-focus weeks are not dominated by soft chores.

**Tech Stack:** Supabase Edge Functions, TypeScript, OpenAI prompt orchestration, shared quest-pool helpers

---

### Task 1: Add a shared surprise-focus helper

**Files:**
- Create: `/Users/togay/Desktop/lifeRPG/supabase/functions/_shared/surpriseFocus.ts`

**Steps:**
1. Detect whether `focus_areas` means blank/surprise/fate mode.
2. Build prompt-ready auto-focus guidance from level and weakest stats.
3. Return helper guidance without needing a second LLM call.

### Task 2: Inject hidden weekly goal into onboarding generation

**Files:**
- Modify: `/Users/togay/Desktop/lifeRPG/supabase/functions/generate-quests/index.ts`

**Steps:**
1. Expand profile reads to include level and stat lanes.
2. Extend the OpenAI response schema with `weekly_focus`.
3. Build auto-focus context when `focus_areas` is blank/surprise mode.
4. Tighten the system/user prompts so auto-focus mode must create a stronger weekly arc and at least two meaningful stretch dailies when feasible.
5. Persist the chosen `weekly_focus` on the profile and rebalance the visible active daily slice so the first active dailies are not all soft if the generated pool already contains stronger alternatives.

### Task 3: Mirror the same behavior in regeneration

**Files:**
- Modify: `/Users/togay/Desktop/lifeRPG/supabase/functions/regenerate-quests/index.ts`

**Steps:**
1. Expand profile reads to include level and stat lanes.
2. Reuse the shared auto-focus helper.
3. Apply the same prompt tightening, `weekly_focus` persistence, and active-daily rebalance rules so Settings regeneration behaves exactly like onboarding generation.

### Task 4: Persist and display AI weekly focus

**Files:**
- Create: `/Users/togay/Desktop/lifeRPG/supabase/migrations/018_add_ai_weekly_focus.sql`
- Modify: `/Users/togay/Desktop/lifeRPG/src/lib/database.types.ts`
- Modify: `/Users/togay/Desktop/lifeRPG/src/pages/Settings.tsx`

**Steps:**
1. Add `ai_weekly_focus` and timestamp fields to `profiles`.
2. Extend generated TS types.
3. Show the AI-selected weekly focus in the Settings quest-setup summary and clarify that leaving focus blank lets lifeRPG choose.

### Task 5: Verify, document, and deploy

**Files:**
- Modify: `/Users/togay/Desktop/lifeRPG/docs/ROADMAP.md`
- Modify: `/Users/togay/Desktop/lifeRPG/docs/PRD.md`
- Modify: `/Users/togay/Desktop/lifeRPG/docs/RELEASE.md`

**Steps:**
1. Run `npm run build`.
2. Push the profile migration.
3. Deploy `generate-quests` and `regenerate-quests`.
4. Document that likes/dislikes/focus already feed prompt context, and that blank/surprise focus mode now produces and stores an AI weekly focus plus stronger visible dailies.
