# Habit Delete Modal Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the browser-native habit deletion confirmation with an in-app confirmation dialog that matches LifeRPG’s dark HUD modal style.

**Architecture:** Keep the confirmation flow local to `Habits.tsx` by tracking the habit being deleted and rendering a custom modal overlay when needed. Reuse the existing visual language already used by other in-app dialogs so deletion confirmations stay consistent with the rest of the UI.

**Tech Stack:** React, TypeScript, Tailwind CSS, Vite, Supabase

---

### Task 1: Replace browser confirmation with local modal state

**Files:**
- Modify: `src/components/Habits.tsx`

**Step 1: Add explicit delete-dialog state**

Track:

```ts
const [deleteTarget, setDeleteTarget] = useState<Habit | null>(null);
const [deletingId, setDeletingId] = useState<string | null>(null);
```

**Step 2: Open the dialog from the habit card**

Replace:

```ts
window.confirm(...)
```

with:

```ts
setDeleteTarget(habit);
```

**Step 3: Confirm deletion through the custom modal**

Delete only after the user taps the in-app remove button.

### Task 2: Style the confirmation dialog

**Files:**
- Modify: `src/components/Habits.tsx`

**Step 1: Render a centered overlay**

Use the same dark modal tone as other app dialogs:
- dark blurred backdrop
- bordered slate panel
- white heading
- slate body copy
- secondary `Cancel` button
- destructive `Remove Habit` button

**Step 2: Add loading safety**

Disable actions while the delete request is in flight and keep the dialog open until the request succeeds or fails.

### Task 3: Update docs and verify

**Files:**
- Modify: `docs/ROADMAP.md`
- Modify: `docs/PRD.md`
- Modify: `docs/RELEASE.md`

**Step 1: Document the shift away from browser UI**

Record that habit deletion now uses an app-owned confirmation dialog rather than `window.confirm`.

**Step 2: Run verification**

Run: `npm run build`
Expected: build succeeds without type errors.
