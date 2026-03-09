// Typography Configuration for lifeRPG

export const typography = {
  fonts: {
    heading: "'Cinzel', serif",
    body: "'Inter', sans-serif",
    // Fallbacks if Cinzel is unavailable or for specific magical/ancient elements
    alternateHeading: "'Uncial Antiqua', serif",
    numbers: "'Inter', monospace", // Used for XP counters and stats
  },
  sizes: {
    xs: '0.75rem',    // 12px - Small UI text, disclaimers
    sm: '0.875rem',   // 14px - Secondary text, quest XP rewards
    base: '1rem',     // 16px - Body text, quest titles
    lg: '1.125rem',   // 18px - Card headers, sub-section titles
    xl: '1.25rem',    // 20px - Screen headers
    '2xl': '1.5rem',  // 24px - Dashboard level numbers
    '3xl': '1.875rem',// 30px - Major achievements
    '4xl': '2.25rem', // 36px - Boss titles, Level up modals
  },
  weights: {
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },
  lineHeights: {
    none: '1',
    tight: '1.25',
    snug: '1.375',
    normal: '1.5',
    relaxed: '1.625',
    loose: '2',
  }
};
