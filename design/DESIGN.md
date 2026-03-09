# Design System: lifeRPG

## 1. Visual Theme & Atmosphere
The interface evokes a **Dark Fantasy RPG** aesthetic, drawing inspiration from modern RPG HUDs like Skyrim and Diablo. The UI is clean, immersive, and semi-realistic, intentionally avoiding cartoonish styles. The default and only mode is **Dark Mode**. Backgrounds should feel physical—like a game HUD panel resting over a dark, subtly textured surface. Interactive elements provide light RPG feedback, such as glowing button hovers, XP bar fill animations, and subtle particle sparkles upon earning achievements.

## 2. Color Palette & Roles
* **Deep Charcoal / Dark Slate `(#111827 / #1F2937)`**: Used as the primary background and structural panel colors. Creates the deep, immersive foundation.
* **Amber Gold `(#F59E0B / #D97706)`**: The primary accent. Used for XP bars, rewards, level-up indicators, and primary call-to-action buttons.
* **Emerald Teal `(#10B981 / #059669)`**: The secondary accent. Used for progress indicators, success states, and completed quests.
* **Crimson Red `(#EF4444 / #B91C1C)`**: Used for danger, warnings, destructive actions, or boss quest threats.
* **Subtle Silver/Gray `(#9CA3AF / #D1D5DB)`**: Used for secondary text, disabled states, and subtle borders.

## 3. Typography Rules
The typography blends fantasy immersion with mobile readability.
* **Headings (Cinzel or Uncial Antiqua)**: Used for screen titles, character names, achievement titles, and levels. Gives a grand, ancient RPG feel.
* **Body Text (Inter or DM Sans)**: Used for quest descriptions, settings, and general UI text. Ensures crisp readability on mobile devices.
* **Numerals**: XP, stats, and counters should use a monospaced or highly legible variant of the body font to feel like real-time game counters.

## 4. Component Stylings
* **Backgrounds & Surfaces:** Dark Slate panels with subtle inner shadows or borders to separate them from the deeper background.
* **Buttons:** 
  * *Primary:* Amber Gold, styled with a subtle inset or metallic sheen. Projects a soft glow on hover.
  * *Secondary:* Dark, bordered with silver, acting like secondary HUD actions.
* **XP Progress Bars:** Placed prominently. Dark track background with a glowing Amber Gold or Emerald Teal fill.
* **Cards/Containers (Quests):** Subtly rounded corners (not perfectly square, but not pill-shaped). Dark Slate backgrounds with a slight stroke to create a border.
* **Bottom Navigation:** Fixed at the bottom, very dark background, using RPG-styled icons (Sword, Scroll, Shield, Crown). Icons glow gold when active.
* **Stat Meters:** Horizontal bars for Strength, Knowledge, Wealth, etc. Designed like classic RPG stat bars.

## 5. Layout Principles (Mobile First)
* **Dashboard Structure:** Top priority is the Character Card (Avatar, Level, XP bar), followed by Daily Quests, Stats, and Boss Quests.
* **Whitespace:** Dense enough to feel like a HUD, but with enough padding (16px/24px) to ensure touch targets are easily tappable.
* **Alignment:** Left-aligned text for readability, with XP/Rewards aligned to the right edge of cards.

## 6. UX Philosophy
"Your life is an RPG campaign."
The core loop consists of Quests → XP → Levels → Streaks → Achievements. The UI should stay minimal, unobtrusive, and mobile-optimized while delivering satisfying gamified feedback.
