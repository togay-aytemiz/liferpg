# Layout Principles for lifeRPG

This document outlines the core layout structures for the mobile-first application.

## 1. Global Structure

All screens share a common global shell:
- **Top HUD:** Status bar area (if applicable), sometimes showing total Gold/Streak if not on the main dashboard.
- **Main Content Area:** Scrollable vertical stack. Padding standard is `16px` (or `1rem`) on left and right edges.
- **Bottom Navigation:** Fixed to the bottom. Contains 4 primary tabs. Background `bg-slate-900` with a top border `border-slate-800`.

## 2. Dashboard Screen (Home)

**Vertical Stacking Order:**
1. **Character Profile (Top):**
   - Flex row: Avatar (Circle, left) + Info block (Right). Info block contains Name (Cinzel), Level number prominently displayed, and the XP Bar spanning full width below the name.
2. **Quick Stats / Currencies:**
   - Horizontal scroll or flex row showing current Streak (🔥) and Gold (💰).
3. **Daily Quests (Action Center):**
   - Section Title ("Daily Quests" in `text-lg` or `text-xl`).
   - Vertical list of `quest-cards`.
4. **Boss Quest (Highlight):**
   - If active, this card breaks the visual pattern of daily quests (red themes, larger padding, prominent call-to-action).
5. **Character Stats (Preview):**
   - Compact horizontal bars for Strength, Knowledge, etc., right above the bottom nav.

## 3. Quest List Screen

A dedicated view for managing all quests.
- **Header:** "Quests" Title.
- **Tabs/Filters:** Fixed below header to toggle between [Daily] [Side] [Boss].
- **List:** Standard vertical stack of quest cards.

## 4. Character Stats Screen

Focuses heavily on RPG progression.
- **Large Avatar/Portrait:** Top center.
- **Level & XP Focus:** Centralized radial progress or large horizontal bar.
- **Detailed Stat Bars:**
  - Full-width bars for Strength, Wealth, Knowledge, etc.
  - Accompanied by numerical values (e.g., Lvl 5, 450/1000).

## 5. Achievement Screen

The trophy room.
- **Grid Layout:** 2 or 3 columns depending on screen size (`grid-cols-3` or `grid-cols-2`).
- **Cards:** Square ratio cards. Locked achievements rendered in grayscale / low opacity. Unlocked in full color with glowing effects.
