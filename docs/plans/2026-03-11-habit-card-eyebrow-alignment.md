# Habit Card Eyebrow Alignment Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Align habit cards with quest cards by moving the stat gain into a plain eyebrow row above the title.

**Architecture:** Reuse the shared stat-presentation map so habit cards and quest cards speak the same icon/color language. Keep reward metadata compact in the footer and remove duplicated stat treatment from the lower meta row.

**Tech Stack:** React, TypeScript, Tailwind CSS.

---

### Task 1: Align HabitCard hierarchy

**Files:**
- Modify: `src/components/HabitCard.tsx`
- Modify: `src/lib/statPresentation.tsx` (only if current mapping is insufficient)

**Step 1: Identify the existing stat/reward row split**
Run: `sed -n '1,220p' src/components/HabitCard.tsx`
Expected: current card shows stat gain in the lower meta row.

**Step 2: Move stat gain into an eyebrow row above the title**
Implement a plain icon + text line matching quest-card styling, but include the gain value (e.g. `+1 Knowledge`) because habits express repeatable progression.

**Step 3: Remove the duplicated lower stat chip**
Keep XP, gold, and frequency in the lower row so the card stays denser.

**Step 4: Verify visually-safe states**
Check good/bad habit, logged/unlogged, and line-through title states still read correctly.

**Step 5: Commit**
```bash
git add src/components/HabitCard.tsx
# commit later with the rest of the verified changes
```

### Task 2: Update docs and verify

**Files:**
- Modify: `docs/ROADMAP.md`
- Modify: `docs/PRD.md`
- Modify: `docs/RELEASE.md`

**Step 1: Add the alignment note to docs**
Describe that habit cards now use the same eyebrow stat language as quest cards.

**Step 2: Run verification**
Run: `npm run build`
Expected: build passes.
