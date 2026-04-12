import { Colors } from './Colors';

// Re-export Colors for convenience
export { Colors };

export const Theme = {
  colors: Colors,
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
  },
  borderRadius: {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
  },
  shadows: {
    card: {
      shadowColor: Colors.card.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 3,
    },
  },
};

// Fonts used by app/(tabs)/explore.tsx (imports from @/constants/Theme)
export const Fonts = {
  rounded: 'System',
  mono: 'System',
};

