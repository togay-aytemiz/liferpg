# Habit Card Alignment Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Redesign habit cards so their primary action feels as clear as quest completion, and move deletion into a cleaner in-app action pattern.

**Architecture:** Keep habit creation in `Habits.tsx`, but extract the card UI into a dedicated `HabitCard` component that follows the same structural language as `QuestCard`: left-side square action affordance, central content block, and right-side menu for secondary actions like removal. This keeps the main screen consistent without forcing habits and quests into the same exact data model.

**Tech Stack:** React, TypeScript, Tailwind CSS, Vite

---

### Task 1: Define the new habit card interaction model

**Files:**
- Create: `docs/plans/2026-03-10-habit-card-alignment.md`
- Modify: `src/components/Habits.tsx`
- Create: `src/components/HabitCard.tsx`

**Step 1: Mirror quest-card affordances**

Use:
- square action button on the left
- title + meta content in the middle
- `...` action menu on the right

**Step 2: Clarify deletion**

Move deletion behind the right-side menu so the card no longer ends with a floating `X`.

### Task 2: Implement the redesigned card

**Files:**
- Create: `src/components/HabitCard.tsx`
- Modify: `src/components/Habits.tsx`

**Step 1: Create the new component**

Props should include:

```tsx
type HabitCardProps = {
  habit: Habit;
  isLogging?: boolean;
  onLog: (habit: Habit) => void | Promise<void>;
  onRemove: (habit: Habit) => void;
};
```

**Step 2: Use a checkbox-style action**

The primary log action should look like the quest completion square instead of a glowing `+` / `-` pill.

**Step 3: Keep the delete confirmation flow**

The menu should trigger the existing in-app delete dialog, not delete immediately.

### Task 3: Update docs and verify

**Files:**
- Modify: `docs/ROADMAP.md`
- Modify: `docs/PRD.md`
- Modify: `docs/RELEASE.md`

**Step 1: Document the card alignment**

Record that habit cards now share the same interaction language as quest cards and no longer rely on a trailing `X` plus ambiguous `+/-` action.

**Step 2: Run verification**

Run: `npm run build`
Expected: build succeeds.
