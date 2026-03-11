# Roadmap - lifeRPG

> **Last Updated:** 2026-03-11

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
- [x] **Loading Screen Messaging Refresh:** Removed the unreliable quest-generation progress bar and replaced it with rotating RPG-themed status lines while generation runs.
- [x] **Loading Flow Polish:** Removed the bottom "Did you know?" block, slowed status-line rotation, and added smooth fade transitions between loading messages.
- [x] **Bazaar Inventory Density Polish:** Moved the inventory helper copy below the section title and compacted owned-item cards so purchased goods read more cleanly on mobile.
- [x] **Quest Stat Badge Alignment:** Moved quest stat context above quest titles and aligned it with the Character screen's icon language using a subtler badge style.
- [x] **Pixel HUD Resource Bars:** Reworked the dashboard XP and HP meters into retro segmented HUD bars with icon badges and stronger game-like framing.
- [x] **Quest Stat Eyebrow Simplification:** Removed the pill-style quest stat chip and reduced it to a plain eyebrow line so quest cards stay denser.
- [x] **Bazaar Static Goods Parity:** Aligned the `Magical Goods` section heading with the other Bazaar headers and normalized stackable inventory rendering for owned static goods.
- [x] **Bazaar Offer Rotation Countdown:** Personalized Bazaar offers now show one shared weekly refresh countdown under the section heading instead of repeating `7d left` on every card, and expired offers regenerate when the Bazaar is opened after rotation.
- [x] **Bazaar Weekly App-Day Cadence:** Personalized Bazaar offers now rotate on the same `03:00` app-day boundary as daily systems, but only once every 7 app days instead of on a rolling 7x24-hour timer.
- [x] **Quest Description Visibility:** Quest cards now allow up to three lines of description copy before truncating, so medium-length task context remains readable on mobile.
- [x] **Loading Copy Simplification:** Removed the redundant static helper sentence under "Generating your quests..." so the rotating RPG status line becomes the single source of loading feedback.
- [x] **Loading Subtitle Alignment:** Pulled the rotating status line up to sit directly under the loading title, making it read like an RPG-styled subtitle instead of a detached secondary block.
- [x] **Edge Auth Retry Guard:** Added token-forwarded edge invokes with one-shot session refresh retry on 401 to prevent quest-generation stalls from transient auth expiry.
- [x] **Onboarding Field Visual Consistency:** Reworked onboarding textareas into a darker, unified panel style with calmer borders and improved contrast matching the app’s night palette.
- [x] **Mobile Input Zoom Stabilization:** Removed onboarding autofocus and enforced iOS-safe 16px form text sizing to prevent post-login text growth/zoom jumps.
- [x] **Auth + Onboarding Field Parity:** Unified auth inputs and onboarding textareas under the same dark panel style tokens and reduced onboarding field typography/padding for a more compact mobile feel.
- [x] **401 Remount Loop Guard:** Prevented loading-route remount churn during token refresh and added explicit session-expired redirect handling to stop repeated unauthorized edge calls.
- [x] **JWT Expiry Guard:** Added proactive session refresh before edge invokes and deduplicated generation requests per onboarding run so expired tokens cannot trigger repeated quest-generation floods.
- [x] **Generation Single-Flight Guard:** Converted onboarding quest generation into a shared promise keyed by a per-submit `generationId`, so React dev remounts/StrictMode no longer spawn duplicate `generate-quests` calls or lose the original completion result.
- [x] **Server-Side LLM Cost Guard:** `generate-quests` now reuses a recent non-custom AI quest batch instead of re-calling OpenAI during duplicate onboarding requests, and `generate-rewards` reuses existing milestone rewards unless Settings explicitly forces regeneration.
- [x] **Autofill Dark-Mode Lock:** Hardened form-field autofill styling so saved credentials no longer flip auth/onboarding inputs to a pale browser-controlled background after initial render.
- [x] **Wordmark Optical Balance:** Updated the auth wordmark to use uppercase `LIFE` with bold `RPG`, preserving one visual size across the full brand name.
- [x] **Session Verification Hardening:** Login and edge-function invocation now server-verify Supabase sessions instead of trusting cached client session state alone, preventing stale-but-present JWTs from failing only after onboarding submit.
- [x] **Onboarding Generation Auth Stabilization:** Sign-in now explicitly rehydrates a validated Supabase session, the loading screen waits for auth readiness before invoking AI generation, onboarding profile updates use the guaranteed `user.id`, and edge calls use direct authenticated fetches to avoid post-onboarding 401 races.
- [x] **Edge Gateway Auth Simplification:** Disabled gateway-level JWT verification for protected Edge Functions and kept manual `supabase.auth.getUser(token)` validation inside each function, removing false `Invalid JWT` rejections without exposing OpenAI or relaxing actual user authentication.
- [x] **LLM Backbone Hardening:** Fixed quest-chain JSON parsing, ensured active habit/dislike context is consistently injected, unified custom quest generation with shared OpenAI helper, added OpenAI request timeout/retry hardening, protected rewards regeneration from pre-delete data loss, and reduced regeneration failure blast-radius.
- [x] **Fixed Bottom HUD Navigation:** Converted the protected-screen bottom navbar into a viewport-fixed, safe-area-aware HUD so it stays anchored while page content scrolls underneath.
- [x] **Daily Quest Rotation & Quest Visibility:** Quest generation now produces a small daily pool, only a manageable 3-5 daily quests stay active at once, `daily-cron` rotates that focus set over time, and future quest-chain chapters stay hidden until unlocked.
- [x] **HUD Progress Polish:** Corrected the XP bar to fill from the real start of the current level and moved streak/gold into compact level-adjacent HUD chips for a more game-like character card.
- [x] **Nav / Header Consistency Pass:** Moved the HUD navbar into the protected app shell, removed redundant back arrows from navbar-driven screens, aligned page titles with navbar labels, and let long Bazaar/quest titles wrap instead of disappearing into truncation.
- [x] **Daily Reroll & Completion Threshold:** Daily quests no longer use punitive skip flow; they reroll from the hidden daily pool instead, and overnight HP penalties now forgive leftover dailies once 80% of the active daily set was completed.
- [x] **Onboarding Re-Entry Guard:** Returning users who already completed onboarding now bypass `/onboarding` after sign-in and when hitting the route directly; app routing consistently sends them to `/dashboard` instead of asking for the same routine again.
- [x] **Quest Flow HUD Simplification:** Dashboard now focuses on hero + today's dailies + habits only, daily progress is visible in Home and Quests, daily reset countdown targets nightly 03:00, quest cards use one shared action menu, achievements show earned dates, and only one visible weekly boss remains in the active quest flow.
- [x] **Settings Quest-Setup Guard:** Quest-generation inputs in Settings now open behind an explicit edit action, regeneration stays disabled until those inputs are actually changed, and Settings no longer force-regenerates milestone rewards when the user only wants a new quest pool.
- [x] **Countdown Readability Polish:** The daily-reset HUD now uses a centered three-line stack for the label, countdown, and reset helper so the card reads cleanly on mobile.
- [x] **Shared Daily Progress Card:** Home and Quests now render the same daily-progress HUD card, the countdown uses a centered three-line layout, and the penalty rule lives behind a compact helper action instead of permanent warning copy.
- [x] **Habit-Based Daily Progress:** Active good daily habits now count toward the shared daily objective total and the same overnight 80% clear rule as daily quests.
- [x] **Daily Rule Modal Layering:** The daily-rule helper now opens as a centered modal above the bottom HUD instead of sitting low enough to collide with the fixed navbar.
- [x] **Habit Delete Confirmation:** Habit removal now asks for explicit confirmation before deleting the entry, reducing accidental loss from the compact inline remove control.
- [x] **App-Owned Habit Delete Dialog:** Habit deletion no longer uses the browser-native confirm dialog; it now uses a system-styled in-app modal aligned with the rest of the HUD overlays.
- [x] **Habit Card Alignment:** Habit cards now follow the same interaction language as quest cards, with a square log control on the left and a cleaner secondary action menu for removal.
- [x] **Habit Completion Clarity:** Habit cards now show today's logged state more explicitly, surface visible XP/penalty metadata, and move helper copy into a quest-like subtitle line under the title.
- [x] **Habit Completion Badge Simplification:** Habit cards no longer repeat a separate `Done Today` pill when the left checkbox already communicates the completed-for-today state.
- [x] **Habit Stat Eyebrow Alignment:** Habit cards now place stat gain/context above the title using the same plain icon eyebrow language as quest cards, instead of repeating that information as a separate lower badge.
- [x] **Quest Gold Economy Clarity:** Quest cards and completion feedback now show gold rewards, quest generation awards meaningful gold across daily/side/boss content, and the Bazaar copy explicitly ties spending to quest earnings.
- [x] **Protected Tab Read Cache:** Dashboard, Quests, Bazaar, Awards, and Habits now reuse short-lived client caches while hopping between bottom-nav tabs, so idle navigation does not re-hit Supabase on every remount.
- [x] **Fetch Dedup Hardening:** Edge auth now uses local-session-first checks, Dashboard/Habits share one cached habit snapshot, streak/runtime reads reuse in-flight loaders, and authenticated daily settlement is throttled so idle remounts/visibility changes do not spam Supabase.
- [x] **Persistent Streak Cache:** Dashboard streak reads now survive full browser refreshes via a narrow localStorage-backed cache path, avoiding an unnecessary `streaks` read on every reload while still invalidating immediately after real streak mutations.
- [x] **Bazaar Offer Stability:** Weekly personalized Bazaar offers now persist client-side for their full lifetime, `generate-shop` reuses active unexpired offers instead of regenerating them, and duplicate active offer categories are cleaned up so the same offer type does not appear twice at once.
- [x] **Shared Protected Page Headers:** Quests, Bazaar, Character, and Settings now use the same sticky white header treatment; compact HUD labels can stay abbreviated (`CHAR`) while the page itself uses the full `Character` title.
- [x] **Daily Reroll Visibility:** The quest `... more` menu now shows how many alternate daily rerolls remain in the current pool and explicitly says when today's pool has no rerolls left.
- [x] **Daily Progress Counter Alignment:** The shared daily-progress HUD now vertically centers its numeric counter and wrapped helper text so the card reads cleanly on narrow mobile widths.
- [x] **Quest Setup Summary Wrapper:** The read-only `Current Life Rhythm` summary in Settings now uses its own amber-accented wrapper so it visually matches the surrounding Likes/Dislikes/Focus summary cards.
- [x] **Legacy Quest Gold Floor:** Quest gold rewards now enforce a minimum baseline by quest type and difficulty, so old hard boss chapters can no longer display or award tiny under-tuned gold values like `+5`.
- [x] **Daily Pool Dedup & Variety Guard:** Daily generation/regeneration now filters duplicate micro-actions, nightly rotation prefers unique dailies that were not shown yesterday when alternatives exist, and the frontend hides legacy duplicate rows as a final safeguard.
- [x] **Side Quest Title Dedup:** Side quest generation/regeneration now filters duplicate optional quest titles, and the Quests screen hides legacy duplicate side rows so the active list never shows the same side quest multiple times.
- [x] **Home Daily Forge Flow:** The `+` action beside Today's Dailies now opens the same custom-quest forge modal used in Quests and adds the forged quest directly into today's active daily flow instead of redirecting away from Home.
- [x] **Custom Daily Visibility Preservation:** User-forged daily quests now stay visible in Today's Dailies without displacing one of the rotating AI focus dailies.
- [x] **03:00 App-Day Streak Alignment:** Streaks, daily completions, reroll counts, and daily habit progress now all use the same `03:00 -> 03:00` app-day boundary instead of UTC day splits, so second-day streaks increment when the player clears the next app day.
- [x] **03:00 App-Entry Streak Check-In:** Authenticated protected screens now wait for the per-user daily settlement/check-in pass before loading their content, so entering the app after `03:00` records that day's streak without needing an immediate quest completion.
- [x] **Legacy Streak Recovery & Floor-Based Daily Rule:** Repaired users whose previous app-day entry was settled before streak check-ins were persisted, and aligned the 80% daily-clear rule to floor-based copy/logic (`3/4`, `4/5`, etc.) instead of rounding upward.
- [x] **Recent Behavior-Aware Daily Generation:** Quest generation now uses the last 7 app days of completions, skipped quests with reasons, and recent generated daily titles to avoid stale repetition and build more intelligent daily pools.
- [x] **AI Weekly Focus Inference:** If focus is left blank or set to system-choice mode, quest generation now lets the LLM choose a weekly focus, stores it on the profile, and uses it to make the active daily set less soft.
- [x] **AI Weekly Focus Continuity:** Blank/system-chosen focus mode now carries the last AI weekly focus into later weekly generations by default, letting the system continue or sensibly evolve a long-term growth arc instead of resetting randomly every cycle.
- [x] **Weekly Boss Unlock Gate:** Weekly boss quests now stay locked behind prerequisite daily/side progress, expose remaining unlock conditions in the quest UI, and reject completion server-side until the gate is satisfied.
- [x] **Authenticated Daily Settlement Fallback:** Daily HP/streak settlement and pool rotation no longer rely only on a background cron; the app now performs an idempotent user-scoped daily settlement on authenticated entry/return after reset.
- [x] **Reroll Feedback Memory:** Daily rerolls now require a structured reason (with optional custom detail), store that feedback per app day, and feed it back into later LLM generation so the system learns what the player is rejecting.
- [x] **Persistent Bazaar Inventory:** Bazaar purchases now become inventory items instead of instant one-shot effects; static consumables and personalized offers can be bought, stacked, and used or redeemed later from an inventory section.
- [x] **Habit Reward Economy:** Good habits now award gold as well as XP, and newly created custom habits derive reward values from frequency, polarity, and the player's current level instead of using flat generic rewards.
- [x] **Character Stat Iconography:** The Character screen now decorates each stat lane with a dedicated icon and tuned accent color so the stat block reads more like an RPG attribute panel.
- [x] **Hero HUD Copy Cleanup:** Removed the redundant economy helper line under the hero name so the top card stays tighter and less repetitive.
- [x] **Daily Reroll Quota Cap:** Daily rerolls now cap at 2 per `03:00 -> 03:00` app day, replacing the overly generous raw-reserve count with a clearer player-facing quota.
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
