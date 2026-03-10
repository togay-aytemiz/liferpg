# Roadmap - lifeRPG

> **Last Updated:** 2026-03-10

This document tracks the structured phases of development for the lifeRPG project, based on the MVP scope outlined in the PRD.

## Phase 1: Foundation & Architecture ✅
- [x] Setup project repository and base architecture (Mobile-first framework)
- [x] Implement core UI framework (RPG styling, Cinzel/Inter typography, Dark Slate/Gold/Emerald palette)
- [x] Define and setup database schemas (Users, Quests, Stats, Achievements)

## Phase 2: Core Mechanics (MVP - Part 1) ✅
- [x] **Authentication & Routing:** Setup basic auth state and React Router.
- [x] **Life Rhythm Onboarding:** Single-field text input for user routing capture.
- [x] **Quest Generation (Loading Screen):** Animated RPG progress bar and status steps.
- [x] **Character Profile System:** Avatar, Username, core attributes setup.
- [x] **XP & Leveling System:** Implement XP calculation and Level boundaries (Level 1=0, Level 2=100, etc.).
- [x] **Stat Progression System:** Logic to map specific actions to stats (Strength, Knowledge, Wealth, Adventure, Social).
- [x] **Daily Quest System:** Add, edit, and complete repeatable daily quests (Generated from Life Rhythm).

## Phase 3: Engagement & UI (MVP - Part 2) ✅
- [x] **Streak Tracking:** Detect daily consistency and apply XP multipliers.
- [x] **Achievement System:** Define and trigger unlockable badges (e.g., First Quest, 7-Day Streak).
- [x] **Dashboard UI:** Combine Character card, XP bar, daily quests, and streak into the main view.
- [x] **Custom Rewards:** AI-generated real-life rewards at level milestones.

## Phase 4: Polish & Launch (Version 1.0)
- [x] **Quest Screen:** Dedicated view for Daily, Side, and Boss quests.
- [x] **Settings Screen:** Section to edit "Life Rhythm" and regenerate quests.
- [x] **Character & Achievement Screens:** Detailed views for stats and unlocked badges.
- [x] **Auth Refresh Stability:** Prevented `/auth` and `/onboarding` refresh spinner lock by hardening auth session/profile bootstrap flow.
- [x] **Mobile-First Auth Surface Cleanup:** Removed desktop-like centered wrapper/shell and fixed bright browser autofill styling on auth inputs.
- [x] **Onboarding Focus Toggle Polish:** Rebuilt the "Surprise me" control as an RPG-themed full-width toggle card below the label and standardized the copy to English.
- [x] **Onboarding Mobile Scroll Safety:** Removed nested scroll in onboarding and added stronger safe-area bottom spacing so the submit section remains reachable above phone bottom bars.
- [x] **Typography Accent Expansion:** Extended Cinzel-based accent usage to key form labels and utility actions (without replacing body copy) for stronger RPG identity.
- [x] **Viewport Scroll Lock Fix:** Switched app shell to fixed viewport-height (`100dvh`) with an explicit internal scroller to reliably enable vertical scroll on mobile onboarding.
- [x] **Focus Label Copy Tightening:** Shortened focus question copy from a long sentence to "What should we focus on?" for cleaner scanability.
- [x] **Onboarding Intro Copy Refinement:** Rewrote helper text to cover routine plus user preferences (likes/dislikes/focus) in a short, consistent sentence.
- [x] **LLM Backbone Hardening:** Fixed quest-chain JSON parsing, ensured active habit/dislike context is consistently injected, unified custom quest generation with shared OpenAI helper, added OpenAI request timeout/retry hardening, protected rewards regeneration from pre-delete data loss, and reduced regeneration failure blast-radius.
- [ ] Testing, QA, and bug fixing.
- [ ] Final UI/UX polish (ensure it feels like an RPG HUD).

---

## Phase 5: Advanced Systems ✅
- [x] **HP & Death Penalty:** Health Points system — skip quests to lose HP, die to lose gold & streak.
- [x] **Streak Freezes:** Purchasable items that protect overnight HP/streak loss.
- [x] **Custom Quests & Avoidance Goals:** User-prompted AI quest creation + "quit smoking" style avoidance goals.
- [x] **Quest Skip System:** Skip with reason → HP loss → LLM-aware replacement quest.
- [x] **Personalization (Likes/Dislikes/Focus):** Free-text user preferences injected into all LLM prompts.

## Phase 6: Habits & Context-Aware AI ✅
- [x] **Habit Tracking System:** Good/Bad habits with daily XP drip, stat boosts, and logging.
- [x] **Habit Frequencies:** Daily, Weekly, Monthly habits with UI selector.
- [x] **Quest → Habit Conversion:** One-click convert any quest into a recurring habit.
- [x] **LLM Context Awareness:** All Edge Functions receive active habits to avoid duplicate quest generation.

## Phase 7: Dynamic Economy ✅
- [x] **Static Shop (Magical Goods):** Health Potions, XP Scrolls, Streak Freezes available permanently.
- [x] **Dynamic AI Shop (The Bazaar):** LLM generates personalized real-life rewards (4 items, 8 categories, 7-day rotation).
- [x] **Category-Based Visuals:** Each dynamic item mapped to a visual category (food, entertainment, self-care, learning, gear, experience, digital, social).
- [x] **Auto-Restock:** Shop automatically regenerates when items expire.

## Phase 8: Infinite Progression & Achievement Expansion ✅
- [x] **Formula-Based Infinite Levels:** Replaced hardcoded Level 1-15 table with `100 × level^1.8` formula. No level cap.
- [x] **Stat Diminishing Returns:** Stats use soft-cap formula `10 / (10 + current)` — fast growth early, asymptotic later.
- [x] **Achievement Catalog Expanded (13 → 34):** New badges for Level 25/50/100, 500/1000 quests, 90/365-day streaks, habit milestones, gold accumulation, and shop purchases.
- [x] **New Achievement Condition Types:** `habit_count`, `gold_reached`, `shop_purchase` added to auto-unlock engine.

---

## Phase 9: Narrative & Progression Depth ✅
- [x] **Quest Chains:** Multi-step connected quests (2-4 steps) that tell a narrative.
- [x] **Sequential Unlocking:** Chain steps are locked and "ghosted" until the previous step is completed.
- [x] **Unlock Notifications:** Frontend triggers specific toasts when the next link in a chain is forged.
- [x] **LLM Chain Generation:** `generate-quests` and `regenerate-quests` now produce narrative-linked follow-ups for boss quests.

---

## Post-MVP (Future Features)
- [ ] **Character Class System:** Auto-assign class (Warrior, Scholar, etc.) based on highest stat
- [ ] **Boss Loot Drops:** Random bonus rewards from boss quest completions
- [ ] **Weekly AI Review:** LLM-generated summary of weekly progress
- [ ] **Random Events:** Surprise micro-quests that appear with a % chance
- [ ] **Character Cosmetics:** Unlockable avatars, UI themes, profile frames
- [ ] **Guild System:** Friends / accountability groups
- [ ] **PvP Challenges:** Step competitions, productivity battles
- [ ] **Leaderboards:** Weekly/Monthly rankings
- [ ] **Push Notifications:** Daily quest reminders
