# Bazaar Offer Stability And Dedup Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Keep weekly Bazaar offers stable across tab visits and prevent duplicate dynamic offers from appearing at the same time.

**Architecture:** Persist active Bazaar offers on the client for the full offer lifetime instead of re-querying/generating them on each entry, and harden the Edge Function so it reuses existing active offers before calling the LLM. Deduplication happens on the server by enforcing one active offer per category in the current set, with duplicate active rows cleaned up before the response is returned.

**Tech Stack:** React, TypeScript, Supabase JS, localStorage, Supabase Edge Functions (Deno).

---

### Task 1: Add persisted Bazaar-offer cache

**Files:**
- Create: `src/lib/shopOfferCache.ts`
- Modify: `src/pages/Shop.tsx`

**Steps:**
1. Add localStorage-backed helpers to read, write, and clear active dynamic offers by user.
2. Filter expired or purchased offers out of the persisted cache and collapse duplicate categories during reads.
3. Make the Bazaar page hydrate from persisted offers first and avoid DB reads/generation while weekly offers are still valid.

### Task 2: Reuse active offers server-side

**Files:**
- Modify: `supabase/functions/generate-shop/index.ts`

**Steps:**
1. After expired-offer cleanup, load active unpurchased offers for the user.
2. Keep only one offer per category and delete duplicate active rows.
3. If active offers remain, return them directly without calling OpenAI.
4. Only call the LLM when no active offers survive cleanup.

### Task 3: Prevent duplicate offer themes in new generations

**Files:**
- Modify: `supabase/functions/generate-shop/index.ts`

**Steps:**
1. Strengthen the shop-generation prompt to require four different categories.
2. Deduplicate AI output by category before inserting rows.
3. Prefer fewer unique rows over inserting duplicate-category rows.

### Task 4: Verify, deploy, and document

**Files:**
- Modify: `docs/ROADMAP.md`
- Modify: `docs/PRD.md`
- Modify: `docs/RELEASE.md`

**Steps:**
1. Run `npm run build`.
2. Deploy `generate-shop`.
3. Document the persisted weekly-offer cache and duplicate-offer cleanup rules.
