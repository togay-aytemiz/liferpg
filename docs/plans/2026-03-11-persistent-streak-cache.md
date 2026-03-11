# Persistent Streak Cache Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Prevent unnecessary streak reloads on full browser refresh without making high-churn gameplay data stale.

**Architecture:** Extend the shared view cache with a narrow persistent-storage path only for dashboard streak keys. Keep quest, habit, and other mutable runtime payloads in memory-only cache so gameplay state still revalidates aggressively after reload.

**Tech Stack:** React, TypeScript, localStorage, existing shared view cache helpers.

---

### Task 1: Add persistent streak cache support

**Files:**
- Modify: `src/lib/viewCache.ts`

**Steps:**
1. Add a persistent cache prefix and a guard for browser storage availability.
2. Limit persistent cache eligibility to `dashboard-streak:*` keys only.
3. Read from persistent storage on cold cache miss.
4. Write persistent entries on normal cache writes.
5. Clear persistent entries on invalidation.

### Task 2: Verify dashboard uses the shared path

**Files:**
- Inspect: `src/pages/Dashboard.tsx`

**Steps:**
1. Confirm streak reads already go through `readCachedOrLoadValue`.
2. Avoid touching Dashboard if the shared cache change is enough.

### Task 3: Verify and document

**Files:**
- Modify: `docs/ROADMAP.md`
- Modify: `docs/PRD.md`
- Modify: `docs/RELEASE.md`

**Steps:**
1. Document that only streak is persisted across refresh.
2. Run `npm run build`.
