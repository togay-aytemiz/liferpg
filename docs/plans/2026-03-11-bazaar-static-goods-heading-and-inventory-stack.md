# Bazaar Static Goods Heading And Inventory Stack Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Align the `Magical Goods` section header with the other Bazaar section headers and ensure static shop purchases display as stacked inventory entries.

**Architecture:** Keep the visual change in the Bazaar page, but add a small shared inventory-normalization helper so the UI can collapse duplicate/legacy inventory rows instead of relying only on backend invariants. This keeps current behavior correct even if old data exists.

**Tech Stack:** React, TypeScript, Tailwind CSS, Vite

---

### Task 1: Align the Magical Goods heading

**Files:**
- Modify: `/Users/togay/Desktop/lifeRPG/src/pages/Shop.tsx`

**Step 1: Rework the section heading**
- Use the same heading treatment as `Personalized Offers`.
- Add an icon and white heading text so the sections feel like one system.

### Task 2: Normalize inventory stacking in the UI

**Files:**
- Create: `/Users/togay/Desktop/lifeRPG/src/lib/inventoryStack.ts`
- Modify: `/Users/togay/Desktop/lifeRPG/src/pages/Shop.tsx`

**Step 1: Add a stack-normalization helper**
- Collapse inventory rows by stack key.
- At minimum, static items should stack by `item_key`.
- Preserve quantity totals and keep one representative row for actions/rendering.

**Step 2: Apply normalization everywhere inventory enters local state**
- Cached inventory hydration
- Fresh inventory fetches
- Post-purchase updates
- Post-use decrements/removals

### Task 3: Verify and document

**Files:**
- Modify: `/Users/togay/Desktop/lifeRPG/docs/ROADMAP.md`
- Modify: `/Users/togay/Desktop/lifeRPG/docs/PRD.md`
- Modify: `/Users/togay/Desktop/lifeRPG/docs/RELEASE.md`

**Step 1: Run verification**
Run: `npm run build`
Expected: successful production build.

**Step 2: Update docs**
- Add a roadmap/release note about Bazaar heading parity and inventory stack normalization.
- Add a concise PRD note that inventory rendering now defensively collapses stackable owned items.
