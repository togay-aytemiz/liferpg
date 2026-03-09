# Roadmap - lifeRPG

> **Last Updated:** 2026-03-09

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
- [ ] Testing, QA, and bug fixing.
- [ ] Final UI/UX polish (ensure it feels like an RPG HUD).

---

## Post-MVP (Future Features)
- [x] HP (Health Points) system and death penalties (loss of streak and gold)
- [ ] Guild system (friends / accountability groups)
- [ ] PvP challenges (step competitions, productivity battles)
- [ ] Leaderboards
- [x] AI quest generation (AI suggests daily quests)
- [ ] Loot system (random reward drops)
- [ ] Character cosmetics
