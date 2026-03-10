# Tab Cache And Quest Refresh UX Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Reduce unnecessary Supabase reads during protected-tab navigation and move non-daily refresh-count messaging out of the Quests progress card into the quest action menu.

**Architecture:** Add a lightweight in-memory client cache with explicit invalidation instead of introducing a larger data-fetching framework. Share one cached quest-runtime snapshot between Dashboard and Quests, then cache slower-changing page payloads for Habits, Bazaar, and Awards so route remounts stop re-fetching immediately.

**Tech Stack:** React, TypeScript, Supabase JS, module-level memory cache utilities.

---

### Task 1: Add a tiny shared view cache

**Files:**
- Create: `src/lib/viewCache.ts`
- Create: `src/lib/questRuntime.ts`

**Steps:**
1. Add a small module-level cache with TTL support plus exact-key and prefix invalidation helpers.
2. Add quest-runtime fetch helpers that return active quests, today completion ids, boss completion ids, and remaining non-daily refresh count.
3. Make quest-runtime helpers reuse the shared cache unless `force` is requested.

### Task 2: Stop duplicate reads across Dashboard and Quests

**Files:**
- Modify: `src/pages/Dashboard.tsx`
- Modify: `src/pages/Quests.tsx`
- Modify: `src/lib/api.ts`

**Steps:**
1. Swap Dashboard and Quests to the shared quest-runtime helper instead of raw page-local Supabase reads.
2. Cache dashboard-only streak reads separately.
3. Invalidate quest-related caches after complete/reroll/regenerate/custom-quest mutations so fresh data is pulled only when the user actually changed something.
4. Remove the refresh-count sentence from the Today’s Progress card while keeping the count in quest `... more` actions and regenerate modal context.

### Task 3: Cache other protected tab payloads

**Files:**
- Modify: `src/components/Habits.tsx`
- Modify: `src/pages/Shop.tsx`
- Modify: `src/pages/Achievements.tsx`

**Steps:**
1. Read from cache first on mount, then skip Supabase fetches while the cache is fresh.
2. Update or invalidate each page cache after local mutations such as habit create/delete and shop purchases/generation.
3. Keep cache TTLs short enough to avoid stale-feeling UI but long enough to prevent fetch spam during tab hopping.

### Task 4: Verify and document

**Files:**
- Modify: `docs/ROADMAP.md`
- Modify: `docs/PRD.md`
- Modify: `docs/RELEASE.md`

**Steps:**
1. Build the app with `npm run build`.
2. Document the new protected-tab cache strategy and the moved refresh-count UX.
3. Summarize any remaining risks, especially around short-lived in-memory caching.
