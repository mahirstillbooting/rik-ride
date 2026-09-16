/**
 * RIK-RIDE Design System Color Tokens
 * Unified Premium Identity: Black / Charcoal / Neutral Greys / Off-White / Vibrant Orange
 * ABSOLUTE RULE: ZERO BLUE OR BLUE-ADJACENT SHADES IN EITHER DARK OR LIGHT THEME.
 * ABSOLUTE RULE: NO DECORATIVE GREEN. GREEN ONLY FOR GENUINE SUCCESS / ACTIVE OPERATIONAL STATES.
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
  background: '#080808',       // Deepest matte black
  surface: '#121212',          // Secondary charcoal surface
  surfaceElevated: '#1A1A1A',  // Elevated graphite card surface
  surfaceHover: '#242424',     // Graphite highlight hover state
  border: 'rgba(255, 255, 255, 0.08)', // Subtle border
  borderSubtle: 'rgba(255, 255, 255, 0.05)',
  borderStrong: 'rgba(255, 255, 255, 0.14)',

  textPrimary: '#F5F5F5',
  textSecondary: '#A1A1AA',
  textMuted: '#71717A',

  // Orange Brand System Tokens
  primary: '#FF6A00',          // Vibrant Orange
  primaryHover: '#FF7A1A',     // Primary Orange Hover
  primaryLight: '#FF8A3D',     // Warm Accent Orange
  primaryDark: '#D94F00',      // Deep Orange
  primaryMuted: 'rgba(255, 106, 0, 0.14)',
  primaryForeground: '#FFFFFF',
  primarySurface: 'rgba(255, 106, 0, 0.10)',
  primaryBorder: 'rgba(255, 106, 0, 0.30)',

  accent: '#FF8A3D',
  accentSurface: 'rgba(255, 106, 0, 0.12)',
  accentGlow: 'rgba(255, 106, 0, 0.20)',

  cardHeroBg: '#14100D',
  cardHeroBorder: 'rgba(255, 106, 0, 0.32)',

  success: '#10B981',          // Operational active / success ONLY
  successSurface: 'rgba(16, 185, 129, 0.12)',
  warning: '#F59E0B',
  warningSurface: 'rgba(245, 158, 11, 0.12)',
  danger: '#EF4444',
  dangerSurface: 'rgba(239, 68, 68, 0.12)',
  info: '#FF6A00',             // Info matches Brand Orange
  infoSurface: 'rgba(255, 106, 0, 0.12)',

  overlay: 'rgba(8, 8, 8, 0.88)',
  mapBg: '#0E0E0E',
};

export const lightColors: ThemeColors = {
  background: '#F9F9FB',       // Warm neutral off-white
  surface: '#FFFFFF',          // Crisp white surface
  surfaceElevated: '#F4F4F5',  // Light grey elevated card surface
  surfaceHover: '#E4E4E7',     // Light grey hover state
  border: '#E4E4E7',
  borderSubtle: '#F4F4F5',
  borderStrong: '#D4D4D8',

  textPrimary: '#18181B',       // Charcoal primary text
  textSecondary: '#52525B',     // Dark grey secondary text
  textMuted: '#71717A',        // Neutral grey muted text

  // Orange Brand System Tokens
  primary: '#FF6A00',
  primaryHover: '#EA580C',
  primaryLight: '#FF8A3D',
  primaryDark: '#D94F00',
  primaryMuted: 'rgba(255, 106, 0, 0.10)',
  primaryForeground: '#FFFFFF',
  primarySurface: 'rgba(255, 106, 0, 0.08)',
  primaryBorder: 'rgba(255, 106, 0, 0.26)',

  accent: '#FF6A00',
  accentSurface: 'rgba(255, 106, 0, 0.08)',
  accentGlow: 'rgba(255, 106, 0, 0.15)',

  cardHeroBg: '#FFF7ED',
  cardHeroBorder: '#FFEDD5',

  success: '#059669',
  successSurface: 'rgba(5, 150, 105, 0.08)',
  warning: '#D97706',
  warningSurface: 'rgba(217, 119, 6, 0.08)',
  danger: '#DC2626',
  dangerSurface: 'rgba(220, 38, 38, 0.08)',
  info: '#FF6A00',
  infoSurface: 'rgba(255, 106, 0, 0.08)',

  overlay: 'rgba(24, 24, 27, 0.55)',
  mapBg: '#F4F4F5',
};
