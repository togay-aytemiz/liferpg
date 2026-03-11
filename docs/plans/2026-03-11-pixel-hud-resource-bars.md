# Pixel HUD Resource Bars Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Restyle the dashboard HP and XP bars so they feel like pixel-game HUD meters instead of smooth modern pills.

**Architecture:** Introduce one reusable pixel-style resource bar component for HUD use. The component should handle icon, label, value text, segmented overlay, and continuous fill width while preserving exact numeric readability. Then replace the existing Dashboard XP and HP pill bars with this component.

**Tech Stack:** React, TypeScript, Tailwind CSS, Vite

---

### Task 1: Create a reusable pixel HUD bar component

**Files:**
- Create: `/Users/togay/Desktop/lifeRPG/src/components/PixelResourceBar.tsx`

**Step 1: Define component API**
- Accept label, icon, current/max values, fill percent, and color theme.
- Include a segmented/pixel overlay and square-edged frame.

**Step 2: Implement pixel styling**
- Use hard corners, stronger border contrast, and segmented visual rhythm.
- Keep numbers readable and do not rely only on the bar fill.

### Task 2: Replace Dashboard XP/HP bars

**Files:**
- Modify: `/Users/togay/Desktop/lifeRPG/src/pages/Dashboard.tsx`

**Step 1: Swap existing smooth bars for the shared pixel component**
- Preserve current XP and HP values.
- Keep the overall HUD compact and mobile-safe.

**Step 2: Tune bar theme per resource**
- XP should feel like progression/energy.
- HP should feel like health/danger.

### Task 3: Verify and document

**Files:**
- Modify: `/Users/togay/Desktop/lifeRPG/docs/ROADMAP.md`
- Modify: `/Users/togay/Desktop/lifeRPG/docs/PRD.md`
- Modify: `/Users/togay/Desktop/lifeRPG/docs/RELEASE.md`

**Step 1: Run verification**
Run: `npm run build`
Expected: successful production build.

**Step 2: Update docs**
- Add a short roadmap/release note about the pixel HUD styling.
- Add a concise PRD decision note for the retro segmented HUD meter treatment.
