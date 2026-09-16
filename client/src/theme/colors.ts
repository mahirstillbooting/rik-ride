/**
 * RIK-RIDE Design System Color Tokens — Cyber Obsidian & Vibrant Orange Edition
 * Unified Identity: Deep Obsidian / Charcoal Black / Neutral Greys / Soft White / Vibrant Orange (#FF6A00)
 * ABSOLUTE RULE: ZERO GREEN OR GREEN-ADJACENT ACCENTS IN EITHER DARK OR LIGHT THEME.
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
  
  // Primary Orange Brand System Tokens (#FF6A00)
  primary: string;
  primaryHover: string;
  primaryLight: string;
  primaryDark: string;
  primaryMuted: string;
  primaryForeground: string;
  primarySurface: string;
  primaryBorder: string;
  
  // Secondary Tech Cyan Tokens
  accent: string;
  accentSurface: string;
  accentGlow: string;
  
  cardHeroBg: string;
  cardHeroBorder: string;

  // Semantic Status Tokens
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
  background: '#0B0B0E',       // Deepest Obsidian Charcoal Black
  surface: '#121316',          // Elevated Dark Zinc
  surfaceElevated: '#18191E',  // Card Fill Surface
  surfaceHover: '#202127',     // Dark Zinc Hover Highlight
  border: 'rgba(255, 255, 255, 0.08)', // Ultra-subtle hairline border
  borderSubtle: 'rgba(255, 255, 255, 0.05)',
  borderStrong: '#23252B',

  textPrimary: '#EDEDED',      // Soft Crisp White
  textSecondary: '#8E8F99',    // Slate Gray
  textMuted: '#52535A',        // Deep Carbon Gray

  // Primary Vibrant Orange System (#FF6A00)
  primary: '#FF6A00',
  primaryHover: '#FF7A1A',
  primaryLight: '#FF8A3D',
  primaryDark: '#D94F00',
  primaryMuted: 'rgba(255, 106, 0, 0.14)',
  primaryForeground: '#FFFFFF', // Crisp White text on Vibrant Orange
  primarySurface: 'rgba(255, 106, 0, 0.10)',
  primaryBorder: 'rgba(255, 106, 0, 0.30)',

  // Secondary Tech Cyan / Ice Blue (#4DD0E1)
  accent: '#4DD0E1',
  accentSurface: 'rgba(77, 208, 225, 0.12)',
  accentGlow: 'rgba(77, 208, 225, 0.20)',

  cardHeroBg: '#16171C',
  cardHeroBorder: 'rgba(255, 106, 0, 0.30)',

  // Semantic Status Tokens (ZERO GREEN — Neutral Slate, Dark Gray & Subtle Orange)
  success: '#FF7043',          // Subtle Warm Orange active state
  successSurface: 'rgba(255, 112, 67, 0.12)',
  warning: '#FF5722',          // Dark Orange / Coral alert accent
  warningSurface: 'rgba(255, 87, 34, 0.12)',
  danger: '#FF5722',           // Dark Orange / Coral destructive action
  dangerSurface: 'rgba(255, 87, 34, 0.12)',
  info: '#FF6A00',             // Info matches Brand Orange
  infoSurface: 'rgba(255, 106, 0, 0.12)',

  overlay: 'rgba(11, 11, 14, 0.88)',
  mapBg: '#090A0C',
};

export const lightColors: ThemeColors = {
  background: '#F8F9FA',       // Modern ultra-clean background
  surface: '#FFFFFF',          // Pure white surface
  surfaceElevated: '#F1F3F5',  // Light grey elevated card surface
  surfaceHover: '#E9ECEF',     // Light grey hover state
  border: '#E9ECEF',
  borderSubtle: '#F1F3F5',
  borderStrong: '#DEE2E6',

  textPrimary: '#121316',       // Obsidian primary text
  textSecondary: '#52535A',     // Carbon grey secondary text
  textMuted: '#8E8F99',        // Slate grey muted text

  // Primary Orange System
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

  success: '#E64A19',
  successSurface: 'rgba(230, 74, 25, 0.08)',
  warning: '#E64A19',
  warningSurface: 'rgba(230, 74, 25, 0.08)',
  danger: '#E64A19',
  dangerSurface: 'rgba(230, 74, 25, 0.08)',
  info: '#FF6A00',
  infoSurface: 'rgba(255, 106, 0, 0.08)',

  overlay: 'rgba(18, 19, 22, 0.55)',
  mapBg: '#E9ECEF',
};
