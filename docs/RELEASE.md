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

### Changed
- Replaced Vite boilerplate with RPG-themed application

### Fixed
- N/A
