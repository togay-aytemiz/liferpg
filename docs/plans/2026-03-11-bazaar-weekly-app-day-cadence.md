# Bazaar Weekly App-Day Cadence Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make personalized Bazaar offers rotate on the same `03:00` app-day boundary as dailies, but only every 7 app days.

**Architecture:** Keep one weekly offer batch per player, but derive its expiry from the app-day key instead of a raw `now + 7 days` timestamp. Frontend cache filtering and countdown presentation should use the same cadence, so cached offers disappear exactly when the backend considers them stale and the Bazaar can generate the next weekly set on open.

**Tech Stack:** React, TypeScript, Supabase Edge Functions, localStorage cache

---

### Task 1: Shared weekly-offer cadence helpers

**Files:**
- Create: `src/lib/shopCycle.ts`
- Modify: `src/lib/shopOfferCache.ts`

**Steps:**
1. Add a frontend helper that computes the canonical personalized-offer expiry from `created_at` using the `03:00` app-day boundary plus 7 app days.
2. Update persisted-offer cache reads/writes to filter by that canonical cadence instead of trusting the stored `expires_at` blindly.
3. Normalize cached offer expiry values to the canonical boundary for UI countdown use.

### Task 2: Bazaar screen refresh behavior

**Files:**
- Modify: `src/pages/Shop.tsx`

**Steps:**
1. Use the new cadence helper to compute the shared weekly countdown.
2. Treat offers as expired when the canonical weekly boundary passes, not only when the stored row timestamp does.
3. Clear stale offer cache and refetch/generate the next batch when the Bazaar opens after expiry, while guarding against duplicate refresh requests.

### Task 3: Backend cadence enforcement

**Files:**
- Modify: `supabase/functions/generate-shop/index.ts`

**Steps:**
1. Replace `now + 7 days` expiry calculation with a `03:00` app-day-aligned weekly expiry.
2. Treat preexisting offers as stale once their canonical weekly cadence ends, even if older rows still have a mismatched `expires_at`.
3. Normalize surviving active offers to the canonical expiry so future reads stay consistent.

### Task 4: Verify and document

**Files:**
- Modify: `docs/ROADMAP.md`
- Modify: `docs/PRD.md`
- Modify: `docs/RELEASE.md`

**Steps:**
1. Document the 7-app-day / `03:00` personalized-offer cadence.
2. Run `npm run build`.
3. Deploy `generate-shop`.
