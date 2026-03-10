# Release Notes - lifeRPG

All notable changes to this project will be documented in this file.

## [Unreleased]

### Added
- **Project Foundation:** Vite + React + TypeScript scaffold with Tailwind CSS v4
- **Design System:** Complete RPG-themed design guide (`design/` folder) with tokens, typography, components, and layout specs
- **Documentation:** `AGENTS.md`, `PRD.md`, `ROADMAP.md`, `RELEASE.md`
- **Supabase DB Schema:** 4 migration files for profiles, quests, achievements, streaks, rewards (all with RLS)
- **TypeScript Types:** Full `database.types.ts` mirroring DB schema
- **Authentication:** Supabase Auth with Login/Register RPG-themed UI, `AuthContext` provider, protected/public route guards
- **Life Rhythm Onboarding:** Single large text input for daily routine, saves to `profiles.life_rhythm`
- **AI Quest Generation:** OpenAI-powered Edge Functions (`generate-quests`, `regenerate-quests`) that analyze life rhythm and create personalized daily/side/boss quests
- **Quest Completion Engine:** `complete-quest` Edge Function handling XP award (with streak multiplier), level up detection, stat progression, streak tracking, and achievement unlocking
- **Dashboard UI:** Character card with XP bar, daily/side/boss quest lists with completion checkboxes, stat bars, streak counter, gold display, level-up and achievement toast notifications
- **Frontend API Service:** `api.ts` for type-safe Edge Function calls
- **AI-Generated Rewards:** `generate-rewards` Edge Function creates 6 personalized real-life milestone rewards (Lv.3–15) based on user's life rhythm and stats
- **Rewards UI:** Milestone rewards section in Dashboard with locked/unlocked/redeemed visual states
- **Quest Screen:** Dedicated tabbed view (Daily / Side / Boss) with quest completion
- **Settings Screen:** Username editing, Life Rhythm editing with quest + reward regeneration via Edge Functions
- **Character & Achievements Screen:** Full character card, stat bars, and achievement grid with rarity-colored cards (common → legendary)
- **Quest Skip, Reason & Regen:** Users can skip quests up to 3 times a day by picking a reason (e.g. "Too difficult"). This reason + the user's routine is immediately sent to the LLM to generate a smart replacement quest on the spot.
- **Deep Personalization Context:** Added optional `Likes`, `Dislikes`, and `Focus Areas` to onboarding and settings. AI uses this to tailor quests precisely to hobbies while actively avoiding disliked activities.
- **Health Points (HP), Daily Penalties & Death:** Added a fully-integrated HP system (max 100). Characters lose HP by skipping quests (-5) or missing daily quests overnight (-10 via `daily-cron` Edge Function). If HP hits 0, they "die" (losing their ongoing streak and cutting their gold in half). Completing quests slowly heals the character (+2 HP).
- **Custom Quests & Avoidance Goals:** Users can now click the `+` icon to add manual, custom quests. They simply write what they want to do (e.g. "Do laundry") or what they want to AVOID (e.g. "No fast food today"). The LLM evaluates the prompt, flags avoidance challenges as Willpower/Strength obstacles, and dynamically assigns difficulty, XP, Gold, and stat rewards.
- **AI Robustness:** OpenAI retry with exponential backoff (3 attempts), response validation with field whitelisting, duplicate completion guard
- **Quest Chains:** Implemented multi-step connected quests (2-4 steps) that unlock sequentially. Chained quests follow boss battles, starting locked/ghosted in the UI and automatically activating upon completion of the previous step. Includes frontend toast notifications for step unlocks.

### Changed
- Replaced Vite boilerplate with RPG-themed application
- Expanded Cinzel accent typography to selected onboarding/settings labels and utility actions for a stronger RPG feel without overusing display font in body copy.
- Refined onboarding intro helper copy to reflect both routine and preference inputs in a concise sentence.
- Unified custom quest generation with the shared OpenAI helper + sanitization path for consistent retry/error behavior.

### Fixed
- **Auth Refresh Spinner Lock:** Fixed an auth bootstrap edge case where refreshing `/auth` or `/onboarding` could leave the app stuck in a perpetual spinner. `AuthContext` now avoids async work directly inside Supabase auth callbacks and applies timeout guards during initial session/profile hydration.
- **Auth Wrapper / Input Contrast:** Removed the desktop-style wrapper effect on auth pages (center shell + shadow feel) and fixed bright browser autofill backgrounds so inputs stay dark-themed.
- **Onboarding Surprise Toggle Styling:** Replaced the plain inline checkbox with an RPG-themed full-width toggle card, moved it below the focus label, and converted Turkish copy to English for UI consistency.
- **Onboarding Bottom Reachability:** Fixed mobile onboarding where the bottom action area could be obstructed by device/browser bottom bars by removing nested form scrolling, adding stronger safe-area padding, and enabling `viewport-fit=cover`.
- **Mobile Vertical Scroll Reliability:** Fixed remaining onboarding scroll lock by constraining the app shell to viewport height and keeping scrolling inside an explicit internal container.
- **Focus Prompt Copy:** Shortened the focus question to "What should we focus on?" for a cleaner, faster read.
- **LLM Prompt/Context Integrity:** Fixed lost `chain_quests` parsing, ensured habits/dislikes context is passed into generation prompts, normalized reward milestone levels (3/5/7/10/12/15), added OpenAI request timeout guards, prevented reward refresh from deleting old rewards before successful insert, and reduced regenerate failure impact by deactivating old auto-generated quests only after successful insert of new ones.
