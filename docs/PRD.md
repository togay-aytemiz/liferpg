# Product Requirements Document (PRD)

**Product Name:** LifeRPG
**Tagline:** Turn your life into a quest.

> **Last Updated:** 2026-03-11

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
- AI should generate a **small rotating pool**, not a wall of chores.
- Only **3-5 daily quests** should be active/visible at a time; the rest of the current pool can rotate in on later days without requiring a fresh LLM call every day.
- Daily quests should support **rerolling** into another option from the current hidden pool instead of using a punitive "skip" action.
- The daily quest action menu should show how many rerolls remain in the **current daily pool**; if there are no alternates left, the menu should say so explicitly instead of implying a hidden quota.
- Each daily reroll should collect a **reason bucket** (for example timing, energy, relevance) and optionally a short custom note; that reroll feedback should be persisted and fed back into later LLM generation so the next daily pools can learn from what the user rejected.
- Within a single generated weekly pool, daily quests must be **title-distinct and micro-action-distinct**; near-duplicate dailies (for example two versions of "Morning Stretch") are invalid.
- Nightly rotation should prefer dailies that were **not visible the previous day** when the hidden pool has enough alternatives.
- The generator should bias the daily pool toward **variety across stats/life areas**, and include at least one learning/knowledge-style daily when the user's dislikes and routine do not rule it out.
- Daily/boss pool generation should receive a **recent behavior summary** covering at least the last 7 app days of completions, skipped quests with reasons, and recently generated daily titles so the LLM can build on what worked and avoid stale repetition.
- That recent behavior summary should also include **reroll feedback buckets + custom notes** when available, so the model can respond to "why this daily was swapped out" rather than only seeing completions and skips.
- The frontend should still dedupe legacy dirty daily rows by normalized title as a final UI safeguard, so repeated generated tasks never render twice in the visible list.
- If the user completes at least **80%** of the currently active daily quests, the day should count as sufficiently cleared for overnight penalty purposes; leftover dailies should not trigger HP/streak punishment on their own.
- Active **good daily habits** should count toward that same daily objective pool and the same 80% overnight clear rule, so habit-building advances the day instead of living in a disconnected tracker.
- The active daily set should refresh on a **nightly 03:00** cadence, and the UI should show a countdown to that reset.
- The same `03:00 -> 03:00` app-day boundary must drive **streak progression**, `quest_date`, daily reroll limits, and daily-habit completion checks; the system must not use raw UTC 24-hour windows for those mechanics.
- Overnight settlement should not depend solely on a background cron existing in production. The app should also support an **authenticated idempotent settlement fallback** on first app open/return after reset, so HP penalties, streak breaks, and daily rotation still occur even if the scheduled trigger is delayed or missing.
- On compact mobile HUD cards, the countdown should read as a centered three-line block: label, remaining time, then reset helper line.
- The non-daily quest refresh quota should surface in quest action context (the `... more` menu / regenerate flow), not inside the top progress summary card.
- Home and Quests should reuse the same daily-progress card component so the progress HUD, reset countdown, and daily-rule helper stay visually identical.
- The `+` action beside **Today's Dailies** on Home should open the same custom quest forge modal used in Quests, not navigate away to another screen.
- When forged from Home, the new quest should default to a **daily** quest and enter today's active visible daily flow immediately.
- The shared daily-progress counter should keep its numeric fraction and wrapped label vertically centered together on narrow mobile widths.
- The daily-penalty explanation should live behind a subtle helper action (for example, `What happens if I miss some?`) instead of sitting as always-visible warning text.
- That helper should open as a centered overlay above the fixed bottom HUD so the modal never collides with navbar controls on mobile.

**Side Quests** (Optional activities)
- *Examples:* try a new recipe, walk outside, learn a micro skill, creative activity
- *Reward:* small XP
- Active side quests should also be **title-distinct**; duplicate optional quests such as multiple versions of `Explore a New Podcast` should never appear simultaneously.

**Boss Quests** (Large challenges or milestones)
- *Examples:* finish project, presentation, run 10k, publish article
- *Reward:* Large XP, Achievement badge

**Quest Chains** (Multi-step narrative quests)
- *Logic:* Completing a Boss Quest (Step 1) unlocks a sequence of 2-4 connected tasks.
- *Visuals:* Future chain steps stay hidden until the previous link is completed, so the user only sees the current chapter.
- *Narrative:* Designed by AI to tell a story or breakdown a large goal into manageable phases.
- At any moment, the player should see **only one active weekly boss/current chapter** in the quest flow; older completed boss chapters should not linger in the active list.

### 4.4 Settings / Quest Setup
- Life Rhythm and related quest-personalization inputs should not sit in an always-live editable state.
- Settings should present the current quest setup in read-only form by default, with an explicit **Edit** action to change it.
- In that read-only state, the saved **Current Life Rhythm** should render inside its own accented summary wrapper, visually aligned with the Likes / Dislikes / Focus summary cards.
- The **Regenerate Quests** action should only enable when the quest-setup form is actually dirty.
- Regenerating quests from Settings should preserve progression state: **XP, level, gold, streak, stats, achievements, and other earned progress must remain untouched**.
- Settings-based regeneration should not implicitly force-regenerate milestone rewards.

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
- Good habits should also award a small amount of **gold**, so habit-building participates in the same earn/spend economy loop as quests.
- **Daily good habits count toward daily progress:** Logging a `daily` good habit should clear one daily objective for that day. The system should count each habit at most once per day toward the objective threshold, even if the player logs it multiple times.
- **Bad habits:** (e.g., Avoid sugar, Limit screen time) - Visualized as standing strength, testing willpower over time.
- **Frequencies:** Habits can be Daily, Weekly, or Monthly — each with its own tracking cadence.
- **Quest → Habit Conversion:** Any AI-generated quest can be converted into a permanent habit with one click.
- **LLM Context:** Active habits are injected into all AI prompts so the system never generates redundant quests.
- **Deletion Safety:** Removing a habit should require explicit confirmation because the inline remove affordance is intentionally compact on mobile.
- Habit deletion confirmation should use an app-owned modal/dialog, not the browser's default confirm UI.
- Habit cards should follow the same interaction language as quest cards: square primary action on the left, content in the middle, and secondary actions such as removal behind a compact action menu.
- Habit cards should clearly show whether they have already been logged **today**, using a quest-like completed state instead of an ambiguous glowing action.
- That completed-for-today signal should not be duplicated with an extra status pill if the checkbox/checkmark state already communicates it clearly.
- Good habits should surface their fixed **XP reward** directly on the card, and the descriptive helper copy should sit under the title like quest-card subtitles.
- Good habits should also surface their fixed **gold reward** on the card.
- When the player creates a custom habit directly, the starter reward values should be **profile-aware** (at minimum considering level, habit polarity, and frequency) rather than using one flat reward for everyone.

### 4.9 Shop & Economy System
Gold is earned through quests and boss battles. It can be spent in the Shop ("The Bazaar").

**Static Magical Goods (always available):**
- **Health Potion:** Restore 50 HP instantly (100 gold).
- **Scroll of Experience:** +250 XP boost (300 gold).
- **Streak Freeze:** Protect one missed day from HP/streak loss (500 gold, max 3).
- Static goods should be added to a **persistent inventory** when purchased; the player decides when to consume them instead of having the effect apply immediately on purchase.

**Dynamic AI-Generated Offers (rotating):**
- LLM generates 4 personalized real-life rewards based on user's life rhythm and preferences.
- Each item is categorized into one of 8 visual categories: Food/Drink, Entertainment, Self-Care, Learning, Gear, Experience, Digital, Social.
- Items expire after 7 days; shop auto-restocks with fresh AI-generated items.
- Reopening the Bazaar during that active window should reuse the same current offers instead of regenerating them.
- The active personalized offer set should stay diverse: only one active offer per category at a time.
- Cost ranges from 100 to 1500 gold.
- Buying a personalized Bazaar offer should also place it into the player's **inventory** so it can be redeemed later, and the system should allow owning multiple copies of the same offer over time.
- The Bazaar screen should expose an **Inventory** section where owned items/offers can be consumed or redeemed later.
- Quests should visibly award gold in the UI so the player understands how Bazaar spending is funded; the app should not hide the earn loop behind a top-right number alone.
- Quest gold should respect a sensible minimum floor by **quest type + difficulty**, even for legacy/generated records that may carry stale low values.

*Purpose:* Give the virtual economy weight so the "Death Penalty" (losing gold) feels impactful, while the dynamic offers provide tangible real-life motivation.

### 4.10 Custom Quests & Avoidance Goals
Users can create custom AI-evaluated quests via free-text prompt.
- **Custom Quests:** User describes what they want to do; AI evaluates difficulty, XP, and stat mapping.
- Custom quest forging should evaluate difficulty, XP, gold, and stat impact with awareness of the player's current **level, stats, life rhythm, and preference context**, so the result feels scaled to the character rather than generic.
- The same forge modal should be reusable from both Quests and Home, with Home defaulting to `daily` creation.
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
- Uses rotating RPG-themed status lines instead of a fake percentage bar
- Reflects variable backend latency without pretending precise progress

**3. Dashboard (Main screen)**
- Character card
- Level and XP bar
- Generated Daily quests (based on Life Rhythm)
- Weekly boss quest
- Current streak

**2. Quest Screen (Quest list)**
- Sections: Daily quests, Side quests, Boss quests
- Navbar-driven screens should not rely on redundant back buttons in the header.
- Protected navbar-driven pages should share one consistent sticky header treatment.
- Quest card includes: quest name, XP reward, difficulty icon, completion toggle

**3. Character Screen (Character overview)**
- Level
- XP progress
- Stat bars with per-stat icons and tuned accent colors
- Character avatar
- Bottom-nav labels may use compact abbreviations (`CHAR`), while the page header itself should use the full title `Character`.

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

- **2026-03-10 - Auth Bootstrap Hardening:** The authentication initialization flow now keeps `onAuthStateChange` callback synchronous and defers async profile hydration, with explicit timeout guards for both `getSession` and profile fetch. This prevents indefinite loading states on route refresh (`/auth`, `/onboarding`) while preserving safe fallback behavior when network/auth calls stall.
- **2026-03-10 - Auth Layout Simplification:** Removed the desktop-style centered shell (`max-width` container and root padding) so authentication screens render full-width mobile-first. Browser autofill colors are now explicitly themed to dark mode to prevent bright input backgrounds.
- **2026-03-10 - Focus Toggle UX Consistency:** The onboarding focus preference now uses an RPG-themed, full-width toggle card placed under the field label (instead of an inline checkbox), and all related copy is English to maintain language consistency across the UI.
- **2026-03-10 - Mobile Safe-Area Scroll Handling:** Onboarding now uses a single vertical scroll flow (no nested internal scroller) with explicit bottom safe-area spacing and `viewport-fit=cover`, ensuring action buttons remain fully visible on mobile devices with bottom browser/system UI overlays.
- **2026-03-10 - Controlled Typography Emphasis:** Cinzel accent usage was expanded to selected form labels and key action buttons to reinforce RPG tone while preserving Inter for long-form readability and input content.
- **2026-03-10 - Viewport Shell Stabilization:** The root app shell now uses a fixed viewport-height container (`h-screen` + `100dvh`) with a dedicated internal `overflow-y-auto` region. This prevents mobile pages from losing vertical scroll when body overflow is intentionally locked.
- **2026-03-10 - Label Copy Compression:** Onboarding focus prompt copy was shortened to "What should we focus on?" to improve readability and reduce visual noise.
- **2026-03-10 - Onboarding Prompt Scope Alignment:** The onboarding helper sentence now references both routine and preferences, matching the full data collected by the form (likes, dislikes, and focus areas) while remaining concise.
- **2026-03-10 - Loading UX Fallback Strategy:** The quest-generation screen now favors rotating RPG status lines over a percentage progress bar to avoid presenting misleading static progress when backend latency is variable.
- **2026-03-10 - Loading Readability Polish:** Loading state now avoids secondary tip clutter and uses slower cross-fade status transitions for better perceived stability during generation waits.
- **2026-03-10 - Loading Copy Deduplication:** The quest-generation screen no longer repeats a static explanatory sentence beneath the title; the rotating amber status line is now the sole loading explanation to keep the state cleaner and less redundant.
- **2026-03-10 - Loading Subtitle Hierarchy:** The rotating amber loading line now sits directly under the main title with tighter spacing so it reads as the primary subtitle, not as a detached block lower on the screen.
- **2026-03-10 - Edge Auth Resilience:** Frontend edge-function calls now explicitly forward bearer tokens and perform a single refresh-session retry on HTTP 401 before surfacing errors, reducing false "stuck" states caused by transient auth expiry.
- **2026-03-10 - Dark Input Surface Standardization:** Onboarding form fields now use a deeper navy panel treatment with consistent border/placeholder contrast to match the RPG night theme and reduce visual mismatch after auth transition.
- **2026-03-10 - Mobile Form Zoom Control:** iOS text autoscaling/auto-zoom regressions are mitigated by removing autofocus on onboarding and enforcing 16px minimum control typography for inputs/textareas/selects.
- **2026-03-10 - Cross-Screen Form Style Consistency:** Authentication and onboarding now share a single dark-field style token set so panel color, border treatment, and focus behavior remain visually consistent; onboarding field sizing was also tightened for denser mobile readability.
- **2026-03-10 - Unauthorized Loop Containment:** The auth context now ignores loading-state toggles for token-refresh events, and loading generation treats repeated 401 as session-expired with redirect to login. This prevents remount-driven retry loops and console error flooding.
- **2026-03-10 - Proactive JWT Validity Check:** Frontend edge invocations now refresh Supabase sessions when cached access tokens are near expiry and deduplicate onboarding generation attempts client-side, ensuring expired JWTs fail fast instead of repeatedly replaying the same request.
- **2026-03-10 - Generation Single-Flight Execution:** The loading screen now reuses a module-scoped generation promise keyed by a unique `generationId` passed from onboarding. This makes quest generation idempotent across React StrictMode remounts and transient route remounts, preventing duplicate `generate-quests` calls and ensuring the surviving screen instance still receives the original result.
- **2026-03-10 - Server-Side LLM Reuse Guard:** To control token spend even when clients replay requests, `generate-quests` now returns the most recent complete non-custom AI quest batch if it was just created, and `generate-rewards` returns existing milestone rewards by default unless the Settings flow explicitly forces regeneration.
- **2026-03-10 - Browser Autofill Theme Enforcement:** Shared form fields now use a dedicated dark-field class with strong autofill overrides (`color-scheme: dark`, inset background lock, text-fill override) so browser credential autofill cannot visually switch inputs to a light theme after hydration.
- **2026-03-10 - Brand Wordmark Balance:** The auth wordmark now uses uppercase `LIFE` with bold `RPG` in the same heading scale, avoiding the misleading mixed-size appearance caused by lowercase letterforms.
- **2026-03-10 - Onboarding Generation Session Determinism:** Post-login onboarding generation now waits for an explicitly rehydrated, server-validated Supabase session before the first protected AI call. Edge invocations use direct authenticated fetches, and onboarding profile persistence keys off `user.id` instead of optional profile state to remove post-onboarding 401 races.
- **2026-03-10 - Edge Auth Ownership Moved In-Function:** Protected Edge Functions no longer rely on gateway-level JWT verification. Instead, they consistently enforce auth inside the function body via `supabase.auth.getUser(token)`, which avoids false `Invalid JWT` gateway failures while preserving server-side-only OpenAI access and authenticated user checks.
- **2026-03-10 - LLM Reliability Standards:** AI generation now uses stronger consistency guards: chain quest payloads are preserved through validation, active-habit/dislike context is supplied across generation paths, custom quest creation uses shared retry/sanitization logic, OpenAI calls now use bounded request timeouts with retry, rewards refresh no longer risks pre-delete data loss, and regeneration no longer deactivates existing auto quests until new quests are successfully inserted.
- **2026-03-10 - Manageable Daily Pool Rotation:** Quest generation now creates a small daily quest pool instead of a long always-active list. Only a manageable 3-5 daily quests are active at once, future boss-chain steps remain hidden until unlocked, and `daily-cron` rotates the active daily subset over time so users get fresh-feeling daily focus without incurring a new OpenAI call each day.
- **2026-03-10 - HUD Anchoring & Progress Accuracy:** Protected screens now use a viewport-fixed bottom HUD with safe-area padding, streak/gold are surfaced beside the level label, and the XP bar fills from the true start of the current level instead of appearing pre-filled at level 1.
- **2026-03-10 - Navbar-Owned Screen Navigation:** The bottom HUD now belongs to the protected application shell rather than individual pages. This guarantees persistence across Dashboard, Quests, Bazaar, CHAR, and Settings, removes redundant header back arrows on navbar-driven screens, and allows compact nav labels like `CHAR` while the actual page header keeps the full title `Character`.
- **2026-03-10 - Shared Protected Header Shell:** Quests, Bazaar, Character, and Settings now render through one reusable sticky header shell so title color, spacing, blur, and subtitle treatment stay visually consistent across every navbar-driven page.
- **2026-03-10 - Daily Reroll Without Token Spend:** Daily quests now reroll by swapping in another hidden quest from the already-generated daily pool instead of calling the LLM again or treating the action as a penalized skip. Overnight HP penalties now use an 80% daily completion threshold so the day still feels strict, but a nearly-cleared daily set does not create unnecessary punishment.
- **2026-03-10 - Centralized Onboarding Completion Routing:** The application now treats a non-empty persisted `life_rhythm` as the canonical onboarding-complete signal across login redirects, root redirects, and direct `/onboarding` hits. This prevents previously onboarded users from being prompted for the same setup again and keeps Settings as the place to revise those answers later.
- **2026-03-10 - Singular Weekly Boss Visibility:** The weekly boss loop now behaves like a focused chapter system rather than a backlog. Frontend quest selection shows only one current boss, completed boss chapters deactivate on completion, and nightly maintenance re-normalizes AI-generated boss visibility so legacy data cannot accumulate a wall of active weekly bosses.
- **2026-03-10 - Shared Quest Card Action Model:** Dashboard and Quests now render the same quest card component. Secondary actions moved behind a `... more` menu so habit conversion and reroll/regeneration are not represented by competing inline icons, and Home intentionally limits itself to hero HUD, today's dailies, and habits instead of duplicating side/boss/stats/rewards content.
- **2026-03-10 - Settings Quest Regeneration Guard:** Settings now treats life-rhythm-driven quest inputs as an explicit edit flow rather than a permanently dirty textarea block. Quest regeneration only enables when those inputs truly changed, and the Settings action refreshes quest content without forcibly replacing milestone rewards or touching earned progression state.
- **2026-03-10 - Protected Tab Cache Strategy:** Bottom-nav screen hops now rely on short-lived in-memory caches for quest runtime, streak, habits, Bazaar, and Awards payloads. Mutations explicitly invalidate those caches so idle navigation stays quiet without letting action-driven state go stale.
- **2026-03-10 - Bazaar Weekly Offer Persistence:** Personalized Bazaar offers now use a persisted client cache for their full weekly lifetime, and `generate-shop` returns active unexpired offers before attempting another LLM call. The server also collapses duplicate active categories so one weekly offer type cannot occupy multiple slots at once.
- **2026-03-10 - Shared Daily Progress HUD:** Dashboard and Quests now reuse one daily-progress card component. The reset countdown became a vertically centered three-line block, and the daily-penalty rule moved into a compact helper modal so the HUD stays clean without hiding the consequences.
- **2026-03-10 - Modal Overlays Above The HUD:** Mobile helper modals triggered from HUD cards now render as centered overlays above the fixed bottom navbar with their own higher stacking layer, avoiding clipped actions or partially hidden copy.
- **2026-03-10 - App-Owned Confirmation UI:** Destructive confirmations in the main HUD flow now use in-app dialogs instead of browser-native confirm popups so typography, colors, button hierarchy, and overlay behavior stay consistent with the rest of LifeRPG.
- **2026-03-10 - Habit Cards Follow Quest Affordances:** Habit tracking cards now mirror the quest-card interaction model instead of inventing a separate one. Logging uses a square left-side action control, while deletion moved into a cleaner secondary action menu so the card no longer ends with an ambiguous floating `X` and neon `+/-` button pairing.
- **2026-03-10 - Quest Gold Loop Visibility:** The quest economy now treats gold as a first-class reward instead of hidden metadata. Generated quests across daily/side/boss flows receive meaningful gold values, older zero-gold quests still pay via completion fallback logic, quest cards show gold beside XP, and Bazaar copy explicitly frames gold as a quest-earned currency to spend.
- **2026-03-10 - Unified Daily Objective Loop:** Dashboard and Quests now treat active daily quests plus active good daily habits as one shared objective pool. Progress comes from the cached quest-runtime snapshot, each daily habit can contribute at most once per day, and nightly HP penalties evaluate the exact same 80% rule server-side.
- **2026-03-10 - Daily Reroll Pool Messaging:** Daily rerolls are now exposed as pool availability rather than an ambiguous hidden quota. The shared quest action menu shows the remaining alternate dailies in the current pool and disables reroll with explicit copy when no alternates remain.
- **2026-03-11 - Daily Progress Counter Alignment:** The shared daily-progress HUD now centers the `x/y` fraction and its wrapped descriptor as one aligned unit, avoiding the awkward top-heavy counter/text relationship on small mobile widths.
- **2026-03-11 - Quest Setup Summary Visual Parity:** The read-only Settings summary now gives `Current Life Rhythm` the same card-family treatment as Likes / Dislikes / Focus, using an amber-accented wrapper instead of leaving the main routine text visually floating on the parent panel.
- **2026-03-11 - Legacy Quest Gold Minimums:** Quest gold rewards now clamp upward to the current type+difficulty baseline instead of blindly trusting stale low stored values. This keeps older hard bosses and similar content economically aligned with the Bazaar loop without requiring manual cleanup first.
- **2026-03-11 - Habit Completion Signal Simplification:** Habit cards now trust the left checkbox/checkmark as the primary “done today” signal and drop the extra status pill, reducing repeated state labels without losing clarity.
- **2026-03-11 - App-Day Boundary Ownership:** Streaks, `quest_date`, daily reroll limits, countdown anchoring, and daily-habit progress now all derive from one shared `03:00 -> 03:00` app-day key instead of mixing UTC day splits with local UI assumptions. This keeps streak progression coherent across quest completion, nightly penalties, and daily HUD reads.
- **2026-03-11 - Recent Behavior Prompt Memory:** Quest-generation prompts now include a short summary of the last 7 app days: completed quests, skipped quests with reasons, successful stat lanes, and recently generated daily titles. This gives the LLM enough behavioral memory to vary pools instead of repeating stale daily patterns.
- **2026-03-11 - Authenticated Daily Settlement Fallback:** Nightly HP/streak settlement and daily-pool rotation no longer depend only on a server cron. The app can now trigger an idempotent per-user settlement on authenticated entry/visibility return, keyed by `last_daily_settlement_day`, so missed schedules do not silently suppress penalties or daily refreshes.
- **2026-03-11 - Reroll Feedback as LLM Memory:** Daily rerolls now collect structured reason buckets plus optional custom notes, persist them as `quest_feedback`, and fold recent reroll signals into generation/regeneration prompts. This gives the model a usable rejection-history memory instead of relying only on completion/skip outcomes.
- **2026-03-11 - Inventory-Based Bazaar Ownership:** Bazaar purchases no longer apply immediately. Static magical goods and dynamic personalized offers are both stored as inventory entries, can stack, and are consumed/redeemed later via a dedicated inventory flow.
- **2026-03-11 - Profile-Aware Habit / Custom Quest Rewards:** Custom habits now derive XP/gold/stat rewards from frequency, polarity, and current level, while custom quest forging considers current level, stats, life rhythm, and preference context when assigning difficulty and rewards.
- **2026-03-11 - Hero HUD Copy Reduction:** The dashboard hero card no longer repeats an economy helper sentence under the player name; quest gold is already visible in cards and Bazaar, so the top HUD stays denser and cleaner without repeating that loop.
