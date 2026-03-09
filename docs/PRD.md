# Product Requirements Document (PRD)

**Product Name:** LifeRPG
**Tagline:** Turn your life into a quest.

> **Last Updated:** 2026-03-09

---

## 1. Product Overview
LifeRPG is a mobile-first gamified productivity app that transforms real-life tasks, goals, and habits into an RPG-style quest system.

Users complete real-world actions to earn XP, level up their character, improve stats, unlock achievements, and complete quests.

The goal is to make personal development feel like playing a role-playing game.

---

## 2. Target Users

**Primary users:**
- Gamers who struggle with discipline
- Productivity enthusiasts
- Students
- Creators / indie builders
- People interested in self-improvement
- Habit tracking users

**User motivation:**
- Visible progress
- Dopamine feedback loops
- Structured goals
- Gamified achievements
- RPG progression systems

---

## 3. Core Product Concept
The app converts real-life actions into game mechanics.

| Real life | Game mechanic |
|-----------|---------------|
| Task | Quest |
| Habit | Daily Quest |
| Goal | Boss Quest |
| Progress | XP |
| Consistency| Streak |
| Growth | Level Up |
| Skills | Character Stats |
| Milestones| Achievements |

**Core idea:** Your life becomes an RPG campaign.

---

## 4. Core Features

### 4.1 Character System
Each user has a player character.

**Character attributes:**
- Avatar
- Username
- Level
- XP
- Gold / reward points

**Character stats:**
- **Strength** → fitness / exercise
- **Knowledge** → reading / learning
- **Wealth** → career / finance
- **Adventure** → exploration / experiences
- **Social** → networking / relationships

Stats are displayed as RPG progress bars.

### 4.2 Quest System
Tasks are converted into quests.

**Daily Quests** (Repeatable tasks)
- *Examples:* workout, read 20 minutes, study session, work deep focus
- *Reward:* XP

**Side Quests** (Optional activities)
- *Examples:* try a new recipe, walk outside, learn a micro skill, creative activity
- *Reward:* small XP

**Boss Quests** (Large challenges or milestones)
- *Examples:* finish project, presentation, run 10k, publish article
- *Reward:* Large XP, Achievement badge

**Quest Chains** (Multi-step narrative quests)
- *Logic:* Completing a Boss Quest (Step 1) unlocks a sequence of 2-4 connected tasks.
- *Visuals:* Chain steps are "ghosted" (locked) until the previous link is completed.
- *Narrative:* Designed by AI to tell a story or breakdown a large goal into manageable phases.

### 4.3 XP and Level System
Completing quests gives XP.

**Example XP system:**
- Pomodoro focus session → 25 XP
- Workout → 20 XP
- Reading → 10 XP
- Daily quest → 15 XP
- Boss quest → 100 XP

**Infinite Level Progression:**
Levels are calculated with a scaling formula: `xp_required(level) = 100 × level^1.8`
- Level 2 → 100 XP
- Level 10 → 6,300 XP
- Level 50 → 120,000 XP
- Level 100 → 400,000 XP

There is **no level cap** — the system supports infinite progression like idle RPGs.

**Level ups unlock:**
- Achievements
- Rewards
- Cosmetic upgrades

### 4.4 Character Stat Progression
Actions increase stats with **diminishing returns**: `effective_gain = raw × (10 / (10 + current_stat))`

Stats grow fast early but slow down as they increase, creating meaningful progression without absurd numbers.

*Example:*
- Workout → Strength
- Reading → Knowledge
- Networking → Social
- Travel → Adventure
- Work projects → Wealth

Stats visually grow with RPG stat bars.

### 4.5 Achievement System
Users unlock collectible achievements **automatically** when conditions are met.

**Achievement categories (34 total):**
- **Quest milestones:** First Quest, 5, 50, 100, 500, 1000 quests
- **Streak milestones:** 3, 7, 14, 30, 90, 100, 365 day streaks
- **Level milestones:** Level 5, 10, 15, 25, 50, 100
- **Boss milestones:** First boss, 10, 25, 50 bosses defeated
- **Habit milestones:** First habit, 5, 10 habits created
- **Gold milestones:** 100, 1K, 10K, 100K gold accumulated
- **Shop milestones:** First purchase, 10 purchases

Rarities: Common, Uncommon, Rare, Epic, Legendary.
Achievements appear as badges with rarity-coded colors and a 🏆 toast notification on unlock.

### 4.6 Streak System
Track daily consistency.

*Examples:* Workout streak, Reading streak, Daily quest streak

**Streak rewards:** Bonus XP multiplier.
- 3 day streak → +5% XP
- 7 day streak → +10% XP
- 30 day streak → rare badge

### 4.7 Reward System
Users define real-life rewards.

*Examples:*
- Level 3 → coffee treat
- Level 5 → buy a book
- Level 10 → cinema night
- Level 15 → day trip

*Purpose:* reinforce habit loops.

### 4.8 Habit Tracking System (Continuous Tasks)
Separate from quests, users can define *Habits* that remain active day-to-day.
- **Good habits:** (e.g., Drink water, Meditate) - Grants drip-feed XP every time it's clicked.
- **Bad habits:** (e.g., Avoid sugar, Limit screen time) - Visualized as standing strength, testing willpower over time.
- **Frequencies:** Habits can be Daily, Weekly, or Monthly — each with its own tracking cadence.
- **Quest → Habit Conversion:** Any AI-generated quest can be converted into a permanent habit with one click.
- **LLM Context:** Active habits are injected into all AI prompts so the system never generates redundant quests.

### 4.9 Shop & Economy System
Gold is earned through quests and boss battles. It can be spent in the Shop ("The Bazaar").

**Static Magical Goods (always available):**
- **Health Potion:** Restore 50 HP instantly (100 gold).
- **Scroll of Experience:** +250 XP boost (300 gold).
- **Streak Freeze:** Protect one missed day from HP/streak loss (500 gold, max 3).

**Dynamic AI-Generated Offers (rotating):**
- LLM generates 4 personalized real-life rewards based on user's life rhythm and preferences.
- Each item is categorized into one of 8 visual categories: Food/Drink, Entertainment, Self-Care, Learning, Gear, Experience, Digital, Social.
- Items expire after 7 days; shop auto-restocks with fresh AI-generated items.
- Cost ranges from 100 to 1500 gold.

*Purpose:* Give the virtual economy weight so the "Death Penalty" (losing gold) feels impactful, while the dynamic offers provide tangible real-life motivation.

### 4.10 Custom Quests & Avoidance Goals
Users can create custom AI-evaluated quests via free-text prompt.
- **Custom Quests:** User describes what they want to do; AI evaluates difficulty, XP, and stat mapping.
- **Avoidance Goals:** Negative-framed quests (e.g., "Don't smoke today", "Spend less than 2 hours on Instagram") that test willpower.

---

## 5. Core Screens

**1. Onboarding (Life Rhythm)**
- Shown immediately after authentication
- Explains the purpose: "Understand Your Life Rhythm"
- Single large multiline text input for user to describe their typical day
- Primary button: "Generate My Quests"
- Data stored as `user_life_rhythm`

**2. Loading / Generation Screen**
- Displayed after submitting Life Rhythm
- Simulates processing: Analyzing rhythm → Creating quests → Building profile
- Animated RPG-style progress indicator (XP bar)

**3. Dashboard (Main screen)**
- Character card
- Level and XP bar
- Generated Daily quests (based on Life Rhythm)
- Weekly boss quest
- Current streak

**2. Quest Screen (Quest list)**
- Sections: Daily quests, Side quests, Boss quests
- Quest card includes: quest name, XP reward, difficulty icon, completion toggle

**3. Character Screen (Character overview)**
- Level
- XP progress
- Stat bars
- Character avatar

**4. Achievement Screen (Achievement gallery)**
- Unlocked achievements
- Locked achievements
- Rare badges

**5. Shop / Marketplace**
- Buy XP Boosts (Potions)
- Buy Cosmetics
- Restore lost streaks

---

## 6. Design Principles

**Mobile-first interface.**

**Visual style:** RPG inspired UI.
- *Influences:* Skyrim HUD, Diablo UI, modern RPG character screens

**Color palette:**
- Primary → dark slate / charcoal
- Accent → gold (XP / rewards)
- Secondary → emerald (progress)

**Typography:**
- Headings → Cinzel
- Body → Inter

**UI components:**
- XP bars, stat bars, quest cards, achievement badges, reward cards

---

## 7. Core Engagement Loop

The core user loop:
1. User completes task
2. Quest completed
3. Gain XP
4. Character levels up
5. Achievement unlocked
6. User feels progress
7. User continues playing

*This loop should feel like playing an RPG.*

---

## 8. Success Metrics

**Key metrics:**
- Daily Active Users
- Quests completed per user
- Average streak length
- Weekly boss completion rate
- Average level progression

*Goal:* Increase daily engagement through gamification.

---

## 9. Scope & Phasing

### MVP Scope (Version 1)
- Authentication
- Life Rhythm Onboarding & Quest Generation (Loading Screen)
- Character profile
- Daily quest system (AI-generated based on life rhythm)
- XP system
- Level progression
- Streak tracking
- Achievement system
- Dashboard UI
- Settings (Ability to edit Life Rhythm and regenerate quests)

### Future Features (Post-MVP)
- Loot system (random reward drops from boss fights)
- Character cosmetics (unlockable avatars, UI themes)
- Guild system (friends / accountability groups)
- PvP challenges (step competitions, productivity battles)
- Leaderboards
- Push notifications & daily reminders
- Weekly AI-generated progress review

---

## 🛠️ Tech Decisions
*(Appendix for architectural choices and technical decisions - To be populated during development)*
