# Bazaar Offer Header Countdown Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Move weekly personalized-offer expiry messaging into one shared Bazaar section countdown and refresh expired offers when the Bazaar opens after rotation.

**Architecture:** Keep personalized-offer expiry derived from the existing `expires_at` timestamps already stored on `shop_items`. Reuse the current localStorage offer cache, but surface the countdown once at the section level and trigger a refresh path when the active offer set expires instead of rendering redundant per-card timers.

**Tech Stack:** React, TypeScript, Supabase, localStorage cache

---

### Task 1: Centralize personalized-offer expiry presentation

**Files:**
- Modify: `src/pages/Shop.tsx`

**Steps:**
1. Compute the nearest active `expires_at` timestamp from the current personalized offers.
2. Add one ticking countdown formatter in the section header helper copy.
3. Remove per-card `7d left` text so expiry messaging appears only once.

### Task 2: Refresh expired offers when Bazaar opens again

**Files:**
- Modify: `src/pages/Shop.tsx`
- Reuse: `src/lib/shopOfferCache.ts`

**Steps:**
1. Keep using persisted cached offers when they are still active.
2. When the active offer expiry is reached, clear the persisted offer cache and refetch/generate the next weekly set.
3. Ensure this path does not duplicate requests while a refresh is already in flight.

### Task 3: Verify and document

**Files:**
- Modify: `docs/ROADMAP.md`
- Modify: `docs/PRD.md`
- Modify: `docs/RELEASE.md`

**Steps:**
1. Document the new section-level weekly offer countdown and refresh behavior.
2. Run `npm run build`.
3. Record the outcome and provide a phase-scoped commit message.
