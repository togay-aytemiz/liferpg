# Bazaar Inventory Compact Layout Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Move the Bazaar inventory helper copy under the Inventory title and tighten purchased-item cards into a more compact mobile-friendly layout.

**Architecture:** Keep the change local to the Bazaar page. Rework the inventory section header into a stacked title/subtitle block and compress the inventory item card structure so icon, title, quantity, meta, and CTA consume less vertical and horizontal space without losing readability.

**Tech Stack:** React, TypeScript, Tailwind CSS, Vite

---

### Task 1: Update inventory section header hierarchy

**Files:**
- Modify: `/Users/togay/Desktop/lifeRPG/src/pages/Shop.tsx`

**Step 1: Rework the Inventory header row**
- Keep the icon + title on the first line.
- Move the helper copy to a second line beneath the title.
- Preserve existing typography system and spacing rhythm.

**Step 2: Verify empty state still reads correctly**
- Ensure the empty-state card still sits visually below the new stacked header.

### Task 2: Compact inventory item cards

**Files:**
- Modify: `/Users/togay/Desktop/lifeRPG/src/pages/Shop.tsx`

**Step 1: Reduce card chrome**
- Shrink icon container, tighten paddings, and simplify gaps.
- Keep quantity and source labels visible but less dominant.

**Step 2: Compact content hierarchy**
- Title remains primary.
- Description remains visible but with fewer lines.
- Footer should use a smaller helper/meta row and a compact action button.

**Step 3: Preserve action clarity**
- Keep the use/redeem CTA readable.
- Ensure loading state still works.

### Task 3: Verify and document

**Files:**
- Modify: `/Users/togay/Desktop/lifeRPG/docs/ROADMAP.md`
- Modify: `/Users/togay/Desktop/lifeRPG/docs/PRD.md`
- Modify: `/Users/togay/Desktop/lifeRPG/docs/RELEASE.md`

**Step 1: Run verification**
Run: `npm run build`
Expected: successful production build.

**Step 2: Update docs**
- Add the Bazaar inventory layout adjustment to roadmap/release notes.
- Add a short PRD tech decision note only if the presentation behavior changed materially.
