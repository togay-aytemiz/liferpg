# LLM Backbone Hardening Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make LifeRPG's LLM-driven flows idempotent, cost-aware, observable, and resilient so onboarding and regeneration cannot silently burn tokens or leave the UI hanging.

**Architecture:** Keep the current browser -> Supabase Edge Function -> OpenAI architecture, but harden it in layers: client single-flight, server-side reuse/idempotency, prompt-call observability, and explicit regeneration semantics. Do not introduce background jobs or polling unless synchronous generation still proves unreliable after these controls are in place.

**Tech Stack:** React, TypeScript, Supabase Edge Functions (Deno), Supabase Postgres, OpenAI Chat Completions API.

---

### Task 1: Baseline the LLM call surface

**Files:**
- Modify: `docs/plans/2026-03-10-llm-backbone-hardening.md`
- Inspect: `supabase/functions/_shared/openai.ts`
- Inspect: `supabase/functions/generate-quests/index.ts`
- Inspect: `supabase/functions/regenerate-quests/index.ts`
- Inspect: `supabase/functions/generate-rewards/index.ts`
- Inspect: `supabase/functions/generate-shop/index.ts`
- Inspect: `supabase/functions/create-custom-quest/index.ts`
- Inspect: `supabase/functions/skip-quest/index.ts`

**Step 1: Enumerate every OpenAI entrypoint**

List which functions call `callOpenAI`, what user action triggers them, and whether duplicate calls are currently possible.

**Step 2: Record expected dedupe policy per endpoint**

Document which endpoints should reuse results (`generate-quests`, `generate-rewards`, `generate-shop`) and which should always generate fresh results (`create-custom-quest`, `skip-quest`, `regenerate-quests`).

**Step 3: Commit planning snapshot**

```bash
git add docs/plans/2026-03-10-llm-backbone-hardening.md
git commit -m "docs: outline llm backbone hardening plan"
```

### Task 2: Add durable server-side idempotency metadata

**Files:**
- Create: `supabase/migrations/016_add_llm_generation_metadata.sql`
- Modify: `src/lib/database.types.ts`
- Modify: `supabase/functions/generate-quests/index.ts`
- Modify: `supabase/functions/generate-rewards/index.ts`

**Step 1: Write the migration**

Add minimal metadata columns to support replay-safe reuse without guessing from timestamps alone:
- `profiles.last_quest_generation_fingerprint text`
- `profiles.last_quest_generation_at timestamptz`
- `profiles.last_reward_generation_fingerprint text`
- `profiles.last_reward_generation_at timestamptz`

**Step 2: Run migration locally or review SQL for safety**

Expected: additive schema only, no destructive changes.

**Step 3: Update TypeScript database types**

Expose the new profile fields in `src/lib/database.types.ts`.

**Step 4: Switch quest/reward reuse logic to fingerprint checks**

Compute a stable fingerprint from the effective prompt inputs and store it after successful generation. Reuse only when:
- fingerprint matches current inputs
- generation timestamp is recent enough
- expected batch shape exists

**Step 5: Verify with build**

Run: `npm run build`
Expected: PASS

### Task 3: Add prompt-call observability

**Files:**
- Modify: `supabase/functions/_shared/openai.ts`
- Modify: `supabase/functions/generate-quests/index.ts`
- Modify: `supabase/functions/generate-rewards/index.ts`
- Modify: `supabase/functions/generate-shop/index.ts`
- Modify: `supabase/functions/create-custom-quest/index.ts`
- Modify: `supabase/functions/skip-quest/index.ts`
- Modify: `supabase/functions/regenerate-quests/index.ts`

**Step 1: Add a request label to `callOpenAI`**

Extend the helper to accept metadata such as:
- `operation`
- `userId`
- `fingerprint`
- `allowRetry`

**Step 2: Log latency and retry count**

At minimum, emit structured `console.log` lines containing:
- operation
- model
- latency_ms
- attempts
- success/failure
- whether result was reused or newly generated

**Step 3: Pass operation labels from each function**

Use values like:
- `generate_quests`
- `regenerate_quests`
- `generate_rewards`
- `generate_shop`
- `create_custom_quest`
- `skip_quest_regeneration`

**Step 4: Verify no signature regressions**

Run: `npm run build`
Expected: PASS

### Task 4: Reduce unnecessary synchronous generation on onboarding

**Files:**
- Modify: `src/pages/LoadingQuests.tsx`
- Modify: `src/lib/api.ts`
- Modify: `supabase/functions/generate-rewards/index.ts`

**Step 1: Keep onboarding quest generation synchronous**

Do not move quests to polling yet. The user cannot proceed without quests.

**Step 2: Make reward generation strictly optional on first onboarding**

If the product tolerates it, defer rewards until dashboard entry or first level-up. If not, keep the current call but ensure it only reuses existing rewards unless forced.

**Step 3: Gate the UI on quest completion only**

Ensure the dashboard navigation does not wait on any secondary LLM call that can be safely deferred.

**Step 4: Verify manually**

Expected: onboarding reaches dashboard as soon as quests exist, with no second blocking LLM call.

### Task 5: Define when polling/background jobs become justified

**Files:**
- Modify: `docs/plans/2026-03-10-llm-backbone-hardening.md`
- Modify: `docs/PRD.md`

**Step 1: Add decision criteria**

Document that polling/async jobs should only be introduced if one or more of these become true:
- quest generation still exceeds acceptable wait time after dedupe/reuse
- client disconnects frequently lose generation state
- synchronous edge timeouts become common in production

**Step 2: Document the recommended future async shape**

If needed later:
- create `llm_jobs` table
- enqueue from client
- edge worker processes once
- client polls job status

**Step 3: Do not implement async jobs now**

This is a deliberate defer, not a missing implementation.

### Task 6: Final verification and rollout

**Files:**
- Modify: `docs/ROADMAP.md`
- Modify: `docs/PRD.md`
- Modify: `docs/RELEASE.md`

**Step 1: Run build**

Run: `npm run build`
Expected: PASS

**Step 2: Deploy touched functions**

Run only for changed functions, for example:

```bash
supabase functions deploy generate-quests --project-ref wjiuwuzhoqtnqenboigy --no-verify-jwt
supabase functions deploy generate-rewards --project-ref wjiuwuzhoqtnqenboigy --no-verify-jwt
```

**Step 3: Update docs**

Record the final hardening decisions in roadmap, PRD tech decisions, and release notes.

**Step 4: Commit**

```bash
git add docs/ROADMAP.md docs/PRD.md docs/RELEASE.md docs/plans/2026-03-10-llm-backbone-hardening.md src supabase
git commit -m "fix(phase-4): harden llm generation idempotency and cost controls"
```
