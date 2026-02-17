/**
 * Design system colors - CaviTour
 * Dark teal #2D545E, lime green #9ACD32, off-white #F8F8F8
 */
export const Colors = {
  primary: '#1F4F59', // Dark teal-green (rgba(31, 79, 89, 1)) - main content, headers
  primaryLight: '#1B4D4D', // Slightly darker teal
  accent: '#7EA00E', // Lime green (rgba(126, 160, 14, 1)) - Cavi in logo, pins
  cta: '#7EA00E', // Lime green for CTA buttons
  background: '#F8F8F8', // Off-white background
  white: '#FFFFFF',
  black: '#000000',
  text: {
    primary: '#1F4F59', // Dark teal
    secondary: '#7A7878', // rgba(122, 120, 120, 1)
    light: '#AFA7A7', // rgba(175, 167, 167, 1)
  },
  card: {
    background: '#FFFFFF',
    shadow: 'rgba(0, 0, 0, 0.1)',
  },
  // Purple-blue gradient for terminals/directions screens
  gradient: {
    start: '#6B2D8A',
    end: '#4169E1',
  },
  // Get Direction button gradient
  directionButton: {
    start: '#61D0EC',
    end: '#35B0D0',
  },
  // For useThemeColor and light/dark mode components (app template)
  light: {
    text: '#2D545E',
    background: '#F8F8F8',
    tint: '#2D545E',
    icon: '#2D545E',
    tabIconDefault: '#999999',
    tabIconSelected: '#2D545E',
  },
  dark: {
    text: '#FFFFFF',
    background: '#1a1a1a',
    tint: '#9ACD32',
    icon: '#9ACD32',
    tabIconDefault: '#666666',
    tabIconSelected: '#9ACD32',
  },
};
