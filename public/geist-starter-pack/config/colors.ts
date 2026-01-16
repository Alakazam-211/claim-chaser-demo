/**
 * Geist Color Palette Configuration
 * 
 * Based on Vercel's official Geist design system 10-color scale.
 * Official documentation: https://vercel.com/geist/colors
 * 
 * Customize these colors to match your brand.
 */

export const colors = {
  // Background Colors (Geist 10-color system)
  background1: '#ffffff',  // Default element background
  background2: '#fafafa',    // Secondary background
  
  // Component Backgrounds (Colors 1-3)
  color1: '#ffffff',        // Default background
  color2: '#fafafa',        // Hover background
  color3: '#f5f5f5',        // Active background
  
  // Borders (Colors 4-6)
  color4: '#eaeaea',        // Default border
  color5: '#e5e5e5',        // Hover border
  color6: '#d4d4d4',        // Active border
  
  // High Contrast Backgrounds (Colors 7-8)
  color7: '#000000',        // High contrast background
  color8: '#262626',        // Hover high contrast background
  
  // Text and Icons (Colors 9-10)
  color9: '#666666',       // Secondary text and icons
  color10: '#000000',      // Primary text and icons
  
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

/**
 * Get color based on theme
 */
export function getThemeColor(
  lightColor: string,
  darkColor: string,
  isDark: boolean = false
): string {
  return isDark ? darkColor : lightColor;
}
