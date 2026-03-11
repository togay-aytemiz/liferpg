# Quest Stat Badge Alignment Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Move quest stat metadata above the quest title and align it with the Character stats icon language using a subtler badge treatment.

**Architecture:** Extract stat presentation metadata into one shared frontend helper so Character and quest cards stop drifting. Then adjust quest-card hierarchy so the stat badge sits above the title and reads like quest context instead of low-priority footer metadata.

**Tech Stack:** React, TypeScript, Tailwind CSS, Vite

---

### Task 1: Centralize stat presentation metadata

**Files:**
- Create: `/Users/togay/Desktop/lifeRPG/src/lib/statPresentation.tsx`
- Modify: `/Users/togay/Desktop/lifeRPG/src/pages/Achievements.tsx`

**Step 1: Create a shared stat metadata helper**
- Define labels, colors, and icons for strength, knowledge, wealth, adventure, and social.
- Export a helper that resolves quest/profile stat keys into one presentation object.

**Step 2: Switch Character stats to the shared helper**
- Replace local hardcoded stat icon config.
- Preserve the existing Character screen look.

### Task 2: Rework quest card hierarchy

**Files:**
- Modify: `/Users/togay/Desktop/lifeRPG/src/components/QuestCard.tsx`

**Step 1: Move stat metadata above the title**
- Render a compact stat badge above the quest title.
- Use the shared icon and label.

**Step 2: Make the badge subtler than the reward row**
- Keep the icon colored, but reduce contrast/chrome so it doesn’t compete with title or rewards.
- Remove the old footer stat text to avoid duplication.

### Task 3: Verify and document

**Files:**
- Modify: `/Users/togay/Desktop/lifeRPG/docs/ROADMAP.md`
- Modify: `/Users/togay/Desktop/lifeRPG/docs/PRD.md`
- Modify: `/Users/togay/Desktop/lifeRPG/docs/RELEASE.md`

**Step 1: Run verification**
Run: `npm run build`
Expected: successful production build.

**Step 2: Update docs**
- Record the shared stat-badge alignment change in roadmap/release.
- Add a short PRD decision note for the shared stat icon language.
