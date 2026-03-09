# lifeRPG UI Components Guide

This document specifices how to build the core RPG components in the application.

## 1. XP Progress Bar
The XP bar is the central dopamine loop of the app. It must look recessed and glowing.

**DOM Structure:**
```html
<div class="xp-track">
  <div class="xp-fill" style="width: 75%;"></div>
  <span class="xp-label">Level 7 - 450/1000 XP</span>
</div>
```

**Styling Rules:**
- `xp-track`: Background `bg-slate-900`, inset shadow `shadow-inner`, rounded corners `rounded-md`.
- `xp-fill`: Background `bg-amber-500`, right-side glow `box-shadow: 2px 0 10px rgba(245,158,11,0.5)`. Transition `width 0.5s ease-out`.
- `xp-label`: Absolute centered or top-right aligned, font `Inter`, size `text-xs`, color `text-slate-300`.

## 2. Quest Card
The basic interactable element.

**DOM Structure:**
```html
<div class="quest-card">
  <div class="quest-checkbox"></div>
  <div class="quest-content">
    <h3 class="quest-title">Read 20 Pages</h3>
    <span class="quest-reward">+15 XP</span>
  </div>
</div>
```

**Styling Rules:**
- `quest-card`: Background `bg-slate-800`, border `border border-slate-700`, layout `flex items-center gap-3 p-4`.
- `quest-checkbox`: Square with subtle rounding, dark inset background until checked, then filled with Emerald.
- `quest-title`: Font `Inter`, size `text-base`, color `text-white`.
- `quest-reward`: Font `Cinzel` or `Inter.bold`, size `text-sm`, color `text-amber-500`.

## 3. Boss Quest Card
Needs to feel threatening and rewarding.

**Styling Rules:**
- Background: Dark red gradient or `bg-slate-800` with crimson borders `border-red-900`.
- Title: Uses `Cinzel` heading, often accompanied by a custom icon (Skull, Crossed Swords).
- Glow: Subtle crimson outer shadow.
