# Custom Daily Visibility Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Ensure manually forged daily quests appear in Today's Dailies without replacing an existing AI daily slot.

**Architecture:** Split visible daily selection into two lanes: user-created custom dailies, which are always visible, and AI-generated focus dailies, which still use the manageable rotating cap. This preserves the low-churn AI focus set while honoring explicit user-added work.

**Tech Stack:** React, TypeScript, shared gameplay selectors.

---

### Task 1: Separate custom and AI daily visibility

**Files:**
- Modify: `src/lib/gameplay.ts`

**Steps:**
1. Keep custom active daily quests in their own list.
2. Dedupe/slice only the non-custom AI daily pool.
3. Return `custom + visibleAI` so a forged daily does not displace an existing AI daily.

### Task 2: Verify and document

**Files:**
- Modify: `docs/ROADMAP.md`
- Modify: `docs/PRD.md`
- Modify: `docs/RELEASE.md`

**Steps:**
1. Document that custom dailies stay visible on top of the rotating AI focus set.
2. Run `npm run build`.
