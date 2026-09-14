/**
 * RIK-RIDE Design System Color Tokens
 * Unified Brand Identity: Black / Charcoal / Neutral Greys / Off-White / Vibrant Orange
 * STRICT RULE: ZERO BLUE OR BLUE-ADJACENT SHADES IN EITHER DARK OR LIGHT THEME.
 * STRICT RULE: NO DECORATIVE GREEN. GREEN ONLY FOR GENUINE SUCCESS / ACTIVE OPERATIONAL STATES.
 */

export interface ThemeColors {
  background: string;
  surface: string;
  surfaceElevated: string;
  surfaceHover: string;
  border: string;
  borderSubtle: string;
  borderStrong: string;
  
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  
  // Orange Brand System Tokens
  primary: string;
  primaryHover: string;
  primaryLight: string;
  primaryDark: string;
  primaryMuted: string;
  primaryForeground: string;
  primarySurface: string;
  primaryBorder: string;
  
  accent: string;
  accentSurface: string;
  accentGlow: string;
  
  cardHeroBg: string;
  cardHeroBorder: string;

  // Semantic Status Tokens (Strictly Meaningful)
  success: string;
  successSurface: string;
  warning: string;
  warningSurface: string;
  danger: string;
  dangerSurface: string;
  info: string;
  infoSurface: string;

  overlay: string;
  mapBg: string;
}

export const darkColors: ThemeColors = {
  background: '#090A0C',       // Matte near-black
  surface: '#121417',          // Deep charcoal
  surfaceElevated: '#181B1F',  // Dark graphite
  surfaceHover: '#22262C',     // Slightly lighter charcoal hover
  border: '#282C34',           // Clean neutral graphite border
  borderSubtle: '#1F232B',
  borderStrong: '#3A3F4B',

  textPrimary: '#F8FAFC',
  textSecondary: '#9EA3AE',
  textMuted: '#6C727F',

  // Orange System Tokens
  primary: '#F97316',          // Vibrant Orange
  primaryHover: '#EA580C',     // Deep Orange
  primaryLight: '#FB923C',     // Warm Amber Orange
  primaryDark: '#C2410C',      // Dark Orange Accent
  primaryMuted: 'rgba(249, 115, 22, 0.16)',
  primaryForeground: '#FFFFFF',
  primarySurface: 'rgba(249, 115, 22, 0.10)',
  primaryBorder: 'rgba(249, 115, 22, 0.32)',

  accent: '#FB923C',
  accentSurface: 'rgba(249, 115, 22, 0.14)',
  accentGlow: 'rgba(249, 115, 22, 0.22)',

  cardHeroBg: '#161311',
  cardHeroBorder: 'rgba(249, 115, 22, 0.35)',

  success: '#10B981',          // Operational active / success ONLY
  successSurface: 'rgba(16, 185, 129, 0.12)',
  warning: '#F59E0B',
  warningSurface: 'rgba(245, 158, 11, 0.12)',
  danger: '#EF4444',
  dangerSurface: 'rgba(239, 68, 68, 0.12)',
  info: '#F97316',             // Standard info matches Orange
  infoSurface: 'rgba(249, 115, 22, 0.14)',

  overlay: 'rgba(9, 10, 12, 0.85)',
  mapBg: '#111317',
};

export const lightColors: ThemeColors = {
  background: '#FAFAFA',
  surface: '#FFFFFF',
  surfaceElevated: '#F4F4F5',
  surfaceHover: '#EFEFF1',
  border: '#E4E4E7',
  borderSubtle: '#F4F4F5',
  borderStrong: '#D4D4D8',

  textPrimary: '#111315',
  textSecondary: '#52525B',
  textMuted: '#71717A',

  // Orange System Tokens
  primary: '#F97316',
  primaryHover: '#EA580C',
  primaryLight: '#FB923C',
  primaryDark: '#C2410C',
  primaryMuted: 'rgba(249, 115, 22, 0.12)',
  primaryForeground: '#FFFFFF',
  primarySurface: 'rgba(249, 115, 22, 0.08)',
  primaryBorder: 'rgba(249, 115, 22, 0.28)',

  accent: '#F97316',
  accentSurface: 'rgba(249, 115, 22, 0.08)',
  accentGlow: 'rgba(249, 115, 22, 0.15)',

  cardHeroBg: '#FFF7ED',
  cardHeroBorder: '#FFEDD5',

  success: '#059669',
  successSurface: 'rgba(5, 150, 105, 0.08)',
  warning: '#D97706',
  warningSurface: 'rgba(217, 119, 6, 0.08)',
  danger: '#DC2626',
  dangerSurface: 'rgba(220, 38, 38, 0.08)',
  info: '#F97316',
  infoSurface: 'rgba(249, 115, 22, 0.08)',

  overlay: 'rgba(17, 19, 21, 0.5)',
  mapBg: '#F4F4F5',
};

