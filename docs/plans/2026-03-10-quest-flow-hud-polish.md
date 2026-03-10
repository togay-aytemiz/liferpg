# Quest Flow HUD Polish Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Reduce quest overwhelm, clarify quest actions, and tighten the mobile HUD/gameplay loop so the app behaves more like a focused RPG than a task dump.

**Architecture:** Keep the existing quest schema and LLM backbone, but harden the visible quest rules at both server and client layers. Server-side generation and cron logic will enforce a small active pool and a single visible weekly boss, while frontend screens will share one quest-card component, consistent header spacing, progress summaries, and time-to-reset messaging.

**Tech Stack:** React, TypeScript, Supabase JS, Supabase Edge Functions, Tailwind utility classes

---

### Task 1: Centralize gameplay display rules

**Files:**
- Modify: `src/lib/gameplay.ts`

**Steps:**
1. Add helpers for daily progress counts, reset countdown formatting, and visible weekly boss selection.
2. Keep the rules explicit: daily reset at 03:00 local time, one visible boss, and manageable daily counts.
3. Export reusable helpers so Dashboard and Quests stop drifting visually and behaviorally.

### Task 2: Create one shared quest-card component

**Files:**
- Create: `src/components/QuestCard.tsx`
- Modify: `src/pages/Dashboard.tsx`
- Modify: `src/pages/Quests.tsx`

**Steps:**
1. Move the quest-card markup out of Dashboard/Quests into one shared component.
2. Replace the conflicting side icons with a single `... more` menu.
3. Put habit conversion and quest regeneration/reroll inside that menu, along with remaining regenerate uses where relevant.
4. Ensure daily cards reroll, non-daily cards regenerate with reason, and Dashboard/Quests render the same card design.

### Task 3: Tighten Home and Quests information architecture

**Files:**
- Modify: `src/pages/Dashboard.tsx`
- Modify: `src/pages/Quests.tsx`
- Modify: `src/components/BottomNav.tsx`

**Steps:**
1. Move streak and gold to the hero header far-right.
2. Remove side quest, weekly boss, character stats, and milestone reward sections from Home.
3. Add `Today’s progress` counts to Home and Quests.
4. Add countdown copy for the 03:00 daily refresh.
5. Increase top spacing under sticky headers so page content does not visually collide with headers.

### Task 4: Make boss visibility actually weekly and singular

**Files:**
- Modify: `supabase/functions/generate-quests/index.ts`
- Modify: `supabase/functions/regenerate-quests/index.ts`
- Modify: `supabase/functions/daily-cron/index.ts`

**Steps:**
1. Generate exactly one active weekly boss entry at a time.
2. Keep chain steps hidden/locked until progression unlocks them.
3. During daily cron, rotate daily quests at 03:00 and also enforce only one active weekly boss.
4. Avoid new OpenAI cost for daily rotation; use existing generated pools where possible.

### Task 5: Surface achievement dates

**Files:**
- Modify: `src/pages/Achievements.tsx`

**Steps:**
1. Fetch `unlocked_at` alongside achievement IDs.
2. Render earned dates on unlocked cards in a compact format.

### Task 6: Verify and document

**Files:**
- Modify: `docs/ROADMAP.md`
- Modify: `docs/PRD.md`
- Modify: `docs/RELEASE.md`

**Steps:**
1. Run `npm run build`.
2. Deploy changed edge functions if server logic changes.
3. Update roadmap, PRD tech decisions, and release notes with the new quest flow rules.
