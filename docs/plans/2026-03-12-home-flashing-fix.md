# Home Flashing Fix Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Stop the Home route from re-entering the protected-route settlement spinner loop after auth/profile updates.

**Architecture:** Treat daily settlement as a user-entry concern keyed to the authenticated user, not to the identity of callback props flowing through context. Add a regression test around `ProtectedNavLayout`, then narrow the settlement effect so auth-context rerenders do not restart it for the same user.

**Tech Stack:** React 19, React Router 7, Vitest, Testing Library

---

### Task 1: Capture the regression

**Files:**
- Create: `/Users/togay/Desktop/lifeRPG/tests/protected-nav-layout.test.tsx`
- Modify: `/Users/togay/Desktop/lifeRPG/package.json`

**Steps:**
1. Add a test runner command for browser-like component tests.
2. Write a regression test proving that `ProtectedNavLayout` should not call settlement twice when auth rerenders with the same `user.id` but a new `refreshProfile` function reference.

### Task 2: Stabilize protected-route settlement

**Files:**
- Modify: `/Users/togay/Desktop/lifeRPG/src/App.tsx`

**Steps:**
1. Keep the latest `refreshProfile` callback in a ref.
2. Key the settlement boot effect only to `user.id`, so profile refreshes do not restart the protected-route gate for the same signed-in user.

### Task 3: Verify and document

**Files:**
- Modify: `/Users/togay/Desktop/lifeRPG/docs/ROADMAP.md`
- Modify: `/Users/togay/Desktop/lifeRPG/docs/PRD.md`
- Modify: `/Users/togay/Desktop/lifeRPG/docs/RELEASE.md`

**Steps:**
1. Run the new regression test.
2. Run `npm run build`.
3. Update roadmap, PRD tech decisions, and release notes to record the protected-route flashing fix.
