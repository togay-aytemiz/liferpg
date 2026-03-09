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

### Changed
- Replaced Vite boilerplate with RPG-themed application

### Fixed
- N/A
