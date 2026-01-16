/**
 * Color Palette Configuration
 * 
 * Geist design system colors with green color scheme (#1e7145).
 * Based on Vercel's Geist design system 10-color scale.
 */

export const colors = {
  // Primary Green Colors
  primary: '#1e7145',
  primaryDark: '#165832',
  primaryLight: '#2a8a5a',
  
  // Background Colors (Geist 10-color system)
  background1: '#ffffff',
  background2: '#fafafa',
  
  // Component Backgrounds (Colors 1-3)
  color1: '#ffffff',
  color2: '#fafafa',
  color3: '#f5f5f5',
  
  // Borders (Colors 4-6)
  color4: '#eaeaea',
  color5: '#e5e5e5',
  color6: '#d4d4d4',
  
  // High Contrast Backgrounds (Colors 7-8) - Using green
  color7: '#1e7145',
  color8: '#165832',
  
  // Text and Icons (Colors 9-10)
  color9: '#666666',
  color10: '#000000',
  
  // Legacy color variables for backward compatibility
  black: '#000000',
  white: '#ffffff',
  
  // Gray Scale
  gray50: '#fafafa',
  gray100: '#f5f5f5',
  gray200: '#e5e5e5',
  gray300: '#d4d4d4',
  gray400: '#a3a3a3',
  gray500: '#737373',
  gray600: '#525252',
  gray700: '#404040',
  gray800: '#262626',
  gray900: '#171717',
  
  // Accent Colors
  blue: '#0070f3',
  blueDark: '#0051cc',
  blueLight: '#3291ff',
  purple: '#7928ca',
  purpleDark: '#5a1fa8',
  purpleLight: '#9a4ed4',
  
  // Legacy Background Colors
  background: '#ffffff',
  backgroundDark: '#000000',
  backgroundSubtle: '#fafafa',
  backgroundSubtleDark: '#111111',
  
  // Legacy Text Colors
  foreground: '#000000',
  foregroundDark: '#ffffff',
  foregroundSecondary: '#666666',
  foregroundSecondaryDark: '#888888',
  
  // Legacy Border Colors
  border: '#e5e5e5',
  borderDark: '#333333',
  borderHover: '#d4d4d4',
  borderHoverDark: '#444444',
  
  // Additional brand colors
  green: '#1e7145',
  greenLight: '#2a8a5a',
  yellow: '#f0be3b',
  orange: '#eb7f37',
  red: '#d72e27',
  
  // Secondary Colors
  secondary: '#1e7145',
  secondaryDark: '#000000',
};

/**
 * Helper function to convert hex to rgba
 */
export function hexToRgba(hex: string, alpha: number = 1): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

