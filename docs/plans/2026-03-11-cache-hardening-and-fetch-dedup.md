# Cache Hardening And Fetch Dedup Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Eliminate redundant protected-app fetches when nothing changed, especially repeated auth validation calls, duplicated quest/habit reads during tab switches, and repeated settlement checks on visibility changes.

**Architecture:** Attack the fetch churn at the actual sources instead of just increasing TTL. First, stop frontend edge-call auth helpers from making network `auth.getUser()` checks on every request and rely on local session state plus refresh-on-expiry. Second, extend the existing view cache with in-flight promise deduplication so StrictMode remounts and concurrent tab loaders share one request. Third, move habits into a shared runtime snapshot so Dashboard progress and the Habits list stop asking for the same tables separately. Finally, throttle `settle-daily` per app day so visibility changes do not keep re-hitting the function.

**Tech Stack:** React, TypeScript, Supabase JS, Supabase Edge Functions

---

### Task 1: Remove redundant auth validation fetches

**Files:**
- Modify: `/Users/togay/Desktop/lifeRPG/src/lib/api.ts`

**Steps:**
1. Replace `supabase.auth.getUser(accessToken)` pre-validation calls with a local-session-first helper based on `getSession()`.
2. Refresh only when the access token is missing or near expiry.
3. Keep the existing retry-on-401 edge invoke fallback so server auth remains authoritative.

### Task 2: Add in-flight cache deduplication

**Files:**
- Modify: `/Users/togay/Desktop/lifeRPG/src/lib/viewCache.ts`
- Modify: `/Users/togay/Desktop/lifeRPG/src/lib/questRuntime.ts`

**Steps:**
1. Add a keyed in-flight promise registry to the shared view cache.
2. Expose a helper that returns cached data or reuses an in-flight loader promise.
3. Use it in quest-runtime reads so StrictMode and rapid tab remounts do not duplicate the same Supabase queries.

### Task 3: Share one habit snapshot across Dashboard and Habits

**Files:**
- Create: `/Users/togay/Desktop/lifeRPG/src/lib/habitSnapshot.ts`
- Modify: `/Users/togay/Desktop/lifeRPG/src/lib/questRuntime.ts`
- Modify: `/Users/togay/Desktop/lifeRPG/src/components/Habits.tsx`

**Steps:**
1. Build one cached snapshot loader that returns active habits plus today’s logged habit ids.
2. Make `questRuntime` consume that snapshot instead of querying `habits` and `habit_logs` on its own.
3. Make the `Habits` component consume the same snapshot and update/invalidate it on create/log/delete.

### Task 4: Throttle settlement checks and streak reads

**Files:**
- Modify: `/Users/togay/Desktop/lifeRPG/src/lib/api.ts`
- Modify: `/Users/togay/Desktop/lifeRPG/src/pages/Dashboard.tsx`

**Steps:**
1. Cache the result of `settleDailyIfNeeded` per user/app-day for a short TTL so visibility changes do not keep calling it.
2. Load Dashboard streak through the same cache dedupe helper instead of issuing its own uncached Supabase read on every remount.

### Task 5: Verify and document

**Files:**
- Modify: `/Users/togay/Desktop/lifeRPG/docs/ROADMAP.md`
- Modify: `/Users/togay/Desktop/lifeRPG/docs/PRD.md`
- Modify: `/Users/togay/Desktop/lifeRPG/docs/RELEASE.md`

**Steps:**
1. Run `npm run build`.
2. Update roadmap, PRD tech decisions, and release notes.
3. Summarize which repeated fetch classes were removed and which ones are intentionally still dynamic.
