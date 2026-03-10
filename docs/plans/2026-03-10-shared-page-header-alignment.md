# Shared Page Header Alignment Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Unify the protected-page header styling so every page uses the same sticky header shell while keeping the bottom-nav label `CHAR` and the page header title `Character`.

**Architecture:** Extract one reusable `AppHeader` component that owns the sticky container, title, subtitle, and optional right-side actions. Refactor `Quests`, `Shop`, `Achievements`, and `Settings` to consume that component so header color, spacing, and blur behavior stay consistent across the app.

**Tech Stack:** React, TypeScript, Tailwind CSS, Vite

---

### Task 1: Document the shared header contract

**Files:**
- Create: `docs/plans/2026-03-10-shared-page-header-alignment.md`
- Modify: `src/pages/Quests.tsx`
- Modify: `src/pages/Shop.tsx`
- Modify: `src/pages/Achievements.tsx`
- Modify: `src/pages/Settings.tsx`

**Step 1: Confirm current header variants**

Run: `rg -n "font-heading text-2xl|sticky top-0 z-30" src/pages`
Expected: `Quests`, `Shop`, `Achievements`, and `Settings` each show their own sticky header markup.

**Step 2: Define the reusable API**

Use a component with:

```tsx
type AppHeaderProps = {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
};
```

**Step 3: Keep label/title split explicit**

Keep `BottomNav` label as `CHAR`, but use `Character` as the page title inside `Achievements`.

### Task 2: Extract the shared component

**Files:**
- Create: `src/components/AppHeader.tsx`

**Step 1: Write the component**

Implement a sticky header shell:

```tsx
export default function AppHeader({ title, subtitle, actions }: AppHeaderProps) {
  return (
    <div className="sticky top-0 z-30 border-b border-slate-800 bg-slate-950/88 px-4 pt-6 pb-4 backdrop-blur-md">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl text-white">{title}</h1>
          {subtitle ? <p className="text-xs text-slate-500">{subtitle}</p> : null}
        </div>
        {actions ? <div className="shrink-0">{actions}</div> : null}
      </div>
    </div>
  );
}
```

**Step 2: Verify action-slot behavior**

`Quests` keeps the add button. `Shop` keeps the gold badge. `Achievements` and `Settings` render without actions.

### Task 3: Refactor the protected pages

**Files:**
- Modify: `src/pages/Quests.tsx`
- Modify: `src/pages/Shop.tsx`
- Modify: `src/pages/Achievements.tsx`
- Modify: `src/pages/Settings.tsx`
- Modify: `src/components/BottomNav.tsx`

**Step 1: Replace inline header markup**

Swap each custom sticky header with `AppHeader`.

**Step 2: Normalize title styling**

Use white titles on all page headers. `Shop` should no longer render `Bazaar` in amber.

**Step 3: Expand the page title**

Change the `Achievements` page header from `CHAR` to `Character`, while leaving `BottomNav` as `CHAR`.

### Task 4: Update docs and verify

**Files:**
- Modify: `docs/ROADMAP.md`
- Modify: `docs/PRD.md`
- Modify: `docs/RELEASE.md`

**Step 1: Update roadmap**

Add a checked item for unified protected-page headers and update the `Last Updated` date.

**Step 2: Update PRD**

Document that protected pages share one header treatment and that compact nav labels may differ from page titles.

**Step 3: Update release notes**

Record the header alignment and `Character` title change under `[Unreleased]`.

**Step 4: Run verification**

Run: `npm run build`
Expected: production build succeeds without type errors.
