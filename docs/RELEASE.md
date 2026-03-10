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
- Replaced loading-screen percentage progress with rotating RPG status lines to better reflect variable generation latency.
- Slowed loading-status rotation and added smoother fade transitions for better readability.
- Removed the redundant static helper copy beneath the loading title so the rotating amber status line carries the full generation messaging.
- Pulled the rotating amber loading line closer to the title so it reads like a subtitle instead of a detached block.
- Reworked onboarding input fields with a darker, more consistent RPG panel style.
- Unified auth inputs with onboarding field visuals and tightened onboarding field sizing for a more compact mobile layout.
- Added auth-refresh loop guards so token refresh does not remount loading routes repeatedly.
- Added proactive JWT refresh before edge invocations and deduplicated onboarding generation attempts to stop repeated unauthorized request bursts.
- Added a single-flight generation cache keyed by per-submit `generationId` so dev remounts do not fire duplicate quest-generation requests.
- Added server-side LLM reuse guards so duplicate onboarding requests return the newest generated quest batch and reward generation reuses existing milestone rewards unless regeneration is explicitly forced.
- Hardened dark-mode autofill styling so browser-saved credentials no longer wash auth fields into a pale background.
- Adjusted the auth wordmark to uppercase `LIFE` plus bold `RPG` for cleaner visual balance at one apparent size.
- Switched authenticated edge calls to direct fetch-based invocation and gated onboarding generation on an explicitly rehydrated Supabase session for more deterministic first-run auth behavior.
- Moved protected Edge Functions off gateway-level JWT verification and onto explicit in-function auth checks to eliminate false `Invalid JWT` gateway failures.
- Unified custom quest generation with the shared OpenAI helper + sanitization path for consistent retry/error behavior.
- Shifted AI quest generation from an always-visible chore wall to a **small rotating daily pool**: generation now keeps only 3-5 daily quests active at once, side quests tighter, and `daily-cron` rotates the active daily subset over time without a fresh LLM call.
- Updated quest visibility so the Quests screen shows only currently active quests; future boss-chain chapters stay off-screen until unlocked.
- Reworked the main character HUD so streak and gold sit beside the level label, and the XP bar now reflects true within-level progress.
- Converted the protected-screen bottom navbar into a fixed safe-area HUD so navigation stays anchored while content scrolls.
- Moved the HUD navbar into the protected app shell, aligned navbar labels with page headers (`Bazaar`, `CHAR`, `Settings`), and removed redundant top-left back arrows from navbar-driven screens.
- Reframed daily quest replacement as a **reroll** from the existing hidden daily pool instead of a punitive skip, avoiding extra LLM cost for day-to-day quest swaps.
- Centralized onboarding-complete routing so sign-in, `/`, and direct `/onboarding` visits all send previously onboarded users straight to the dashboard.
- Simplified Home to the core gameplay loop: hero HUD, today's dailies, progress summary, reset countdown, and habits. Weekly boss, side quests, stats, and milestone rewards no longer clutter the home feed.
- Unified Dashboard and Quests around one shared quest-card design with a `... more` action menu for habits and reroll/regeneration flows.
- Added explicit daily-reset countdown messaging targeting nightly `03:00`, plus progress counters for today's quest completion in both Home and Quests.
- Reworked Settings so quest inputs live behind an explicit edit action, and quest regeneration only enables when those inputs are actually changed.
- Standardized protected-page headers onto one shared sticky treatment so Quests, Bazaar, Character, and Settings now read as one cohesive navigation system.
- Unified Home and Quests around one shared daily-progress HUD card, with a centered three-line reset countdown and a lightweight daily-rule helper instead of persistent warning text.
- Clarified the gold economy loop: quests now surface gold rewards next to XP, completion toasts mention gold earned, and Bazaar explicitly tells the player to spend quest gold there.

### Fixed
- **Auth Refresh Spinner Lock:** Fixed an auth bootstrap edge case where refreshing `/auth` or `/onboarding` could leave the app stuck in a perpetual spinner. `AuthContext` now avoids async work directly inside Supabase auth callbacks and applies timeout guards during initial session/profile hydration.
- **Auth Wrapper / Input Contrast:** Removed the desktop-style wrapper effect on auth pages (center shell + shadow feel) and fixed bright browser autofill backgrounds so inputs stay dark-themed.
- **Onboarding Surprise Toggle Styling:** Replaced the plain inline checkbox with an RPG-themed full-width toggle card, moved it below the focus label, and converted Turkish copy to English for UI consistency.
- **Onboarding Bottom Reachability:** Fixed mobile onboarding where the bottom action area could be obstructed by device/browser bottom bars by removing nested form scrolling, adding stronger safe-area padding, and enabling `viewport-fit=cover`.
- **Mobile Vertical Scroll Reliability:** Fixed remaining onboarding scroll lock by constraining the app shell to viewport height and keeping scrolling inside an explicit internal container.
- **Focus Prompt Copy:** Shortened the focus question to "What should we focus on?" for a cleaner, faster read.
- **Loading Tip Clutter:** Removed the bottom "Did you know?" tip section from quest generation loading to keep focus on primary status text.
- **Edge Function 401 Stall:** Added token-forwarded function invokes with one-shot session-refresh retry to reduce unauthorized generation failures that caused loading dead-ends.
- **Mobile Input Text Growth:** Prevented post-login form zoom/growth behavior by removing onboarding autofocus and enforcing iOS-safe 16px form control sizing.
- **Console 401 Flood:** Prevented repeated unauthorized call loops by suppressing loading-state remounts on token refresh and redirecting expired sessions to login from generation flow.
- **Duplicate `generate-quests` Calls:** Fixed loading-screen remounts causing the same onboarding generation to be started multiple times; the route now reuses one shared promise and still navigates correctly when the original request resolves.
- **Duplicate LLM Spend on Replayed Requests:** Fixed duplicate onboarding/server replays from consuming extra OpenAI tokens by short-circuiting `generate-quests` to the latest complete AI batch and `generate-rewards` to existing rewards when appropriate.
- **Post-Onboarding Generate 401:** Fixed the case where signing in succeeded but the first onboarding generation call could still hit `401 Unauthorized`; sign-in now rehydrates a validated session before navigation, generation waits for auth readiness, and onboarding profile persistence no longer depends on `profile` being loaded first.
- **False `Invalid JWT` Edge Rejection:** Fixed protected Supabase Edge Functions being rejected by the gateway before function code ran; auth is now enforced inside the functions themselves using the bearer token, which keeps the calls protected while avoiding the broken gateway verification path.
- **LLM Prompt/Context Integrity:** Fixed lost `chain_quests` parsing, ensured habits/dislikes context is passed into generation prompts, normalized reward milestone levels (3/5/7/10/12/15), added OpenAI request timeout guards, prevented reward refresh from deleting old rewards before successful insert, and reduced regenerate failure impact by deactivating old auto-generated quests only after successful insert of new ones.
- **Quest Overwhelm & Progress HUD Bugs:** Fixed bottom nav drifting with scroll, prevented the level-1 XP bar from appearing filled before any quest completion, and cut the visible daily quest set down to a manageable slice instead of showing the entire backlog/future chain at once.
- **Navbar Persistence / Title Truncation:** Fixed Bazaar and Awards losing the expected persistent HUD navigation, removed header back-button redundancy, kept sign-out in Settings above the HUD, and allowed long reward/quest titles to wrap instead of clipping into ellipses too early.
- **Daily Punishment Flow:** Fixed daily quests being treated like skippable penalty targets; they now reroll cleanly from the reserve pool, the overnight clear threshold is now 80% of the active daily set, and the consequence rule is explained through an on-demand helper instead of extra permanent copy in the quest HUD.
- **Repeated Onboarding Prompt:** Fixed returning users being pushed back through onboarding after login; routing now consistently recognizes existing onboarding data and redirects them to the dashboard.
- **Weekly Boss Flood / Quest Icon Confusion:** Fixed the quest experience showing multiple active weekly bosses and conflicting inline quest-action icons. Boss completion now deactivates the finished chapter, nightly maintenance re-normalizes visible boss state, and quest actions now live behind a single more-menu so habit conversion and reroll/regeneration are understandable.
- **Achievement Timeline / Header Spacing:** Fixed achievements lacking earned dates and gave sticky-header screens more breathing room so content no longer visually collides with page headers.
- **Settings Regeneration Safety:** Fixed Settings treating quest inputs as always-editable and always-actionable. Life Rhythm edits now require entering an explicit edit mode, regenerate stays disabled until the form is actually dirty, and Settings no longer force-refreshes milestone rewards when only quests are being regenerated.
- **Daily Reset Countdown Layout:** Fixed the daily reset HUD layout by turning it into a centered three-line stack: label, countdown, and reset helper. This keeps the card cleaner and easier to scan on mobile.
- **Habit Delete Safety:** Fixed habits being removable with a single tap from the compact inline `X` control; the app now asks for confirmation before deleting a habit and shows an error toast if the delete fails.
- **Protected-Tab Fetch Churn / Quest Refresh Placement:** Fixed bottom-nav page hops repeatedly re-fetching the same Supabase payloads even when nothing changed by adding short-lived shared client caches plus mutation-driven invalidation. The non-daily refresh counter was also removed from the top Quests progress card and kept in the quest `... more` / regenerate context where it actually matters.
- **Bazaar Offer Regeneration / Duplicate Weekly Offers:** Fixed weekly personalized offers being re-queried or regenerated too aggressively and allowed to stack duplicate offer types. Bazaar now reuses persisted active offers for their full lifetime, `generate-shop` returns current unexpired offers before calling the LLM, and duplicate active categories are cleaned up so only one weekly offer per category remains visible at a time.
- **Header Style Drift / CHAR Title Mismatch:** Fixed protected-page headers using mixed title colors and one-off shell markup. Navbar-driven pages now share one white sticky header style, while the HUD label remains `CHAR` and the page title correctly expands to `Character`.
- **Daily Rule Modal vs. Fixed HUD:** Fixed the daily-rule helper modal opening too low and colliding with the fixed bottom navbar; it now opens centered above the HUD with its own overlay layer.
- **Browser Habit Confirm Popup:** Fixed habit deletion relying on the browser's native confirm dialog; it now uses an in-app confirmation modal with the same dark RPG HUD styling as the rest of the system.
- **Habit Card Action Ambiguity:** Fixed habit cards using a floating `X` plus glowing `+/-` control that did not match the rest of the app. Habits now use a quest-like square log control on the left and a cleaner secondary action menu for removal.
- **Invisible Gold Economy:** Fixed coins existing in the HUD without a clear earn loop. Quest generation and replacement flows now attach meaningful gold rewards, legacy zero-gold quests still award gold on completion, quest cards display gold payouts, and completion feedback surfaces the currency gain immediately.
