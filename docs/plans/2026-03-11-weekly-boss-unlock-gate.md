# Weekly Boss Unlock Gate Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make the weekly boss stay locked until the player clears enough daily and/or side quests, and show the remaining unlock requirements directly in the weekly boss UI.

**Architecture:** Add explicit unlock requirement fields to quests so the rule is persisted instead of inferred from presentation. Use a shared helper to assign boss unlock requirements during generation/custom forging and to evaluate current progress consistently in both frontend runtime and the `complete-quest` Edge Function. Keep the first active boss visible in the quest flow, but render it as locked with remaining conditions until its gate is satisfied.

**Tech Stack:** Supabase Postgres migrations, Supabase Edge Functions, TypeScript shared helpers, React quest UI

---

### Task 1: Persist boss unlock requirements

**Files:**
- Create: `/Users/togay/Desktop/lifeRPG/supabase/migrations/019_add_boss_unlock_requirements.sql`
- Modify: `/Users/togay/Desktop/lifeRPG/src/lib/database.types.ts`

**Steps:**
1. Add `unlock_daily_required`, `unlock_side_required`, and `unlock_rule_mode` to `quests`.
2. Extend generated frontend types so quest rows carry those fields.

### Task 2: Centralize unlock rule logic

**Files:**
- Create: `/Users/togay/Desktop/lifeRPG/src/lib/bossUnlock.ts`

**Steps:**
1. Add deterministic requirement assignment for weekly bosses based on difficulty and available quest pool size.
2. Add progress evaluation helpers that return unlocked state plus remaining daily/side counts.
3. Add user-facing copy helpers for locked/remaining boss text.

### Task 3: Write requirements during quest creation

**Files:**
- Modify: `/Users/togay/Desktop/lifeRPG/supabase/functions/generate-quests/index.ts`
- Modify: `/Users/togay/Desktop/lifeRPG/supabase/functions/regenerate-quests/index.ts`
- Modify: `/Users/togay/Desktop/lifeRPG/supabase/functions/create-custom-quest/index.ts`

**Steps:**
1. Assign unlock requirements to the current weekly boss during AI generation/regeneration.
2. Keep future chain chapters at zero requirements for now so current progression semantics do not break.
3. Give standalone custom boss quests the same deterministic gating rule.

### Task 4: Enforce boss locking and expose progress

**Files:**
- Modify: `/Users/togay/Desktop/lifeRPG/supabase/functions/complete-quest/index.ts`
- Modify: `/Users/togay/Desktop/lifeRPG/src/lib/questRuntime.ts`
- Modify: `/Users/togay/Desktop/lifeRPG/src/components/QuestCard.tsx`
- Modify: `/Users/togay/Desktop/lifeRPG/src/pages/Quests.tsx`

**Steps:**
1. Block boss completion server-side until its unlock gate is satisfied.
2. Compute current daily/side completion progress for active boss quests in the shared runtime snapshot.
3. Render locked boss state, unlock rule text, and remaining requirements in the weekly quest card.
4. Disable boss completion tap until the gate opens.

### Task 5: Verify, document, and deploy

**Files:**
- Modify: `/Users/togay/Desktop/lifeRPG/docs/ROADMAP.md`
- Modify: `/Users/togay/Desktop/lifeRPG/docs/PRD.md`
- Modify: `/Users/togay/Desktop/lifeRPG/docs/RELEASE.md`

**Steps:**
1. Run `npm run build`.
2. Run `supabase db push --linked`.
3. Deploy changed functions.
4. Document that weekly bosses now unlock through prerequisite quest progress and surface remaining conditions in the UI.
