# lifeRPG Design Guide

## Table of Contents
1. [Core Philosophy](#core-philosophy)
2. [Color System](#color-system)
3. [Typography](#typography)
4. [Components & HUD Elements](#components--hud-elements)
5. [Layout & Structure](#layout--structure)
6. [Motion & Animation](#motion--animation)

---

## Core Philosophy
**Concept:** "Your life is an RPG campaign."
**Style:** Dark fantasy / RPG inspired interface. Clean but immersive game-like UI. Semi-realistic fantasy style, not cartoonish.
**Defaults:** Dark mode default.

The UI should feel tactile and physical, like a HUD from a modern RPG game (e.g., Skyrim, Diablo), but optimized for a clean, mobile-first experience.

---

## Color System
Our color palette brings the dark, immersive feel of a dungeon, contrasted strongly with the glowing success of RPG rewards.

### Base / Backgrounds
- **Primary Background:** `#0F172A` (Deep Slate) - The void behind all panels.
- **Panel Surface:** `#1E293B` (Dark Slate) - The default color for all cards, HUD elements, modals.
- **Interactive Surface (Hover):** `#334155`

### Accents & Progression
- **XP / Rewards (Gold):** `#F59E0B` (Amber) - Used for XP bars, primary buttons, Level-up celebrations.
  - *Glow Variant:* `#FBBF24`
- **Progress / Success (Emerald):** `#10B981` (Teal/Emerald) - Used for secondary progress bars (like task completion) and positive feedback.
  - *Glow Variant:* `#34D399`

### Alerts & Boss Fights
- **Danger / Boss:** `#EF4444` (Crimson Red) - Used for imminent deadlines, boss quest banners, or destructive actions.

### Text
- **Primary:** `#F8FAFC` (Off-white) - Main readable text.
- **Secondary:** `#94A3B8` (Slate Gray) - Descriptions, minor info.

---

## Typography
Fonts must blend fantasy immersion with strict mobile readability.

- **Headings:** `Cinzel` or `Uncial Antiqua`
  - Used for large Titles, Level numbers, Character Names, Achievement Names.
- **Body Text:** `Inter` or `DM Sans`
  - Used for all descriptions, settings, and quest lists.
- **Counters & Stats:** `Inter Monospace`
  - Used for numbers that update frequently (XP: 1450/2000) to ensure numbers align vertically.

---

## Components & HUD Elements

### Buttons
- **Primary Actions:** Solid Gold background, inset dark text, subtle gold outer glow on hover.
- **Secondary Actions:** Transparent with a subtle Slate border and Off-white text.

### Progress Bars (XP & Stats)
- **Track:** `#0F172A` with an inner shadow to look recessed.
- **Fill:** Gold or Emerald, with a glowing effect at the leading edge.
- *Animation:* Smoothly interpolates sideways upon gaining XP.

### Cards (Quests & Bosses)
- **Shape:** Softly rounded corners (`4px` or `8px`), never pill-shaped.
- **Border:** `#334155`, mostly solid.
- **Boss Variant:** Crimson gradient background, glowing red border.

### Badges (Achievements)
- Circular (`rounded-full`), metallic gradients (Bronze, Silver, Gold, Platinum).

---

## Layout & Structure (Mobile First)
Layouts use stacked cards with standard spacing tokens (`4px`, `8px`, `16px`, `24px`).

### Dashboard Hierarchy
1. **Character Header:** Avatar (Left), Name & Level (Right). Large XP bar spanning the width right below.
2. **Current Streak & Gold:** Small, pill-shaped counters below XP.
3. **Daily Quests List:** Stacked checkboxes.
4. **Weekly Boss (If Active):** High visual weight, placed prominently.
5. **Stats Preview:** Mini horizontal bars for Strength, Knowledge, etc.

### Navigation
- Fixed Bottom Bar.
- Icons: RPG Symbols (Sword = Quests, Scroll = Dashboard/Stats, Crown/Medal = Achievements).
- Active state: Icon glows Gold.

---

## Motion & Animation
- **Rewards:** When XP is gained, a subtle gold particle burst appears over the quest block.
- **Level Up:** Screen flash or modal drop-in with heavy shaking/impact.
- **Hover/Tap:** Buttons subtly depress (scale down 2%) and emit a stronger glow.
