// Design Tokens for lifeRPG

export const colors = {
    // Primary Backgrounds
    background: {
        DEFAULT: '#0f172a', // deep slate - main app background
        panel: '#1e293b',   // dark slate - cards, HUD elements
        surface: '#334155', // slightly lighter for interactive surfaces
    },

    // Accents & XP Drops
    accent: {
        gold: '#f59e0b',       // Core gold for XP / rewards
        goldHover: '#fbbf24',  // Lighter glowing gold
        amber: '#d97706',      // Darker gold for borders/shadows
    },

    // Secondary / Progress (Emerald & Teal)
    progress: {
        DEFAULT: '#10b981',    // Standard emerald progress
        glow: '#34d399',       // Bright teal glow for completion
        dark: '#059669',       // Deep emerald for backgrounds
    },

    // Danger / Boss Fights
    danger: {
        DEFAULT: '#ef4444',    // Crimson red
        hover: '#f87171',
        dark: '#b91c1c',       // Blood red for boss cards
    },

    // Text Colors
    text: {
        primary: '#f8fafc',    // Off-white for max readability
        secondary: '#94a3b8',  // Slate gray for descriptions/minor info
        muted: '#475569',      // Dark slate for disabled text or subtle borders
    },

    // Borders & Dividers
    border: {
        DEFAULT: '#334155',    // Subtle separator
        highlight: '#475569',  // Slightly more visible border
        gold: 'rgba(245, 158, 11, 0.3)', // Faint gold border for special cards
    }
};

export const spacing = {
    xs: '0.25rem',   // 4px
    sm: '0.5rem',    // 8px
    md: '1rem',      // 16px - standard padding
    lg: '1.5rem',    // 24px - larger padding for layout
    xl: '2rem',      // 32px
    '2xl': '3rem',   // 48px
};

export const borderRadius = {
    none: '0',
    sm: '0.125rem',   // 2px
    DEFAULT: '0.25rem', // 4px - HUD style corners
    md: '0.375rem',   // 6px
    lg: '0.5rem',     // 8px - standard card corners
    xl: '0.75rem',    // 12px
    full: '9999px',   // Round for avatars / badges
};

export const shadows = {
    hud: '0 4px 6px -1px rgba(0, 0, 0, 0.5), 0 2px 4px -1px rgba(0, 0, 0, 0.3)',
    glowGold: '0 0 10px rgba(245, 158, 11, 0.5)',
    glowEmerald: '0 0 10px rgba(16, 185, 129, 0.5)',
    innerPanel: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.3)',
};

export const theme = {
    colors,
    spacing,
    borderRadius,
    shadows,
};
