# AI Weekly Focus Continuity Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make blank/system-chosen focus mode continue the previous AI weekly focus by default and only evolve or replace it when the user's recent behavior justifies a smarter shift.

**Architecture:** Reuse the existing `ai_weekly_focus` profile fields instead of adding new schema. Extend the shared auto-focus prompt helper so generation/regeneration sees the prior AI focus plus its age, and tighten the prompt contract to treat that value as a long-term arc. Update Settings copy so players understand that blank focus keeps the AI in control across later weekly cycles.

**Tech Stack:** Supabase Edge Functions, TypeScript, OpenAI prompt orchestration, React settings UI

---

### Task 1: Feed prior AI weekly focus back into auto-focus prompts

**Files:**
- Modify: `/Users/togay/Desktop/lifeRPG/supabase/functions/_shared/autoFocus.ts`
- Modify: `/Users/togay/Desktop/lifeRPG/supabase/functions/generate-quests/index.ts`
- Modify: `/Users/togay/Desktop/lifeRPG/supabase/functions/regenerate-quests/index.ts`

**Steps:**
1. Expand the shared auto-focus helper profile shape to include the saved `ai_weekly_focus` and timestamp.
2. Build prompt context that tells the model to continue the previous focus when it still fits.
3. Allow the model to evolve the focus inside the same theme when the player appears ready for the next chapter.
4. Only allow replacement when behavior, dislikes, or routine clearly make the old focus a poor fit.
5. Pass those fields through both onboarding generation and Settings regeneration profile reads.

### Task 2: Clarify continuity in Settings

**Files:**
- Modify: `/Users/togay/Desktop/lifeRPG/src/pages/Settings.tsx`

**Steps:**
1. Update blank-focus copy so the user understands AI focus is not single-use.
2. Clarify in the read-only summary that the saved AI weekly focus stays active until the player sets a manual focus or the system meaningfully evolves it.

### Task 3: Document and verify

**Files:**
- Modify: `/Users/togay/Desktop/lifeRPG/docs/ROADMAP.md`
- Modify: `/Users/togay/Desktop/lifeRPG/docs/PRD.md`
- Modify: `/Users/togay/Desktop/lifeRPG/docs/RELEASE.md`

**Steps:**
1. Document that blank focus now behaves like a persistent AI-owned long-term arc, not a weekly randomizer.
2. Run `npm run build`.
3. Deploy `generate-quests` and `regenerate-quests`.
