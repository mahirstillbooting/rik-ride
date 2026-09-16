/**
 * RIK-RIDE Design System Color Tokens — Cyber Obsidian / Electric Acid Lime / Tech Cyan Edition
 * Vercel-Inspired Sleek Aesthetics with Vercel Geist Typography Integration
 * 
 * Base Background: Deepest Obsidian / Charcoal Black (#0B0B0E)
 * Card / Surface Fill: Elevated Dark Zinc (#121316 / #18191E)
 * Hairline Borders: Ultra-subtle (rgba(255,255,255,0.08) / #23252B)
 * Primary Accent: Electric Acid Lime / Cyber Yellow (#DFFF00)
 * Secondary Accent: Tech Cyan / Ice Blue (#4DD0E1)
 * Muted / Alert Accent: Dark Orange / Coral (#FF5722)
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
  
  // Primary Acid Lime Brand System Tokens
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

  // Primary Electric Acid Lime / Cyber Yellow (#DFFF00)
  primary: '#DFFF00',
  primaryHover: '#E2F84A',
  primaryLight: '#E9FA73',
  primaryDark: '#C0DC00',
  primaryMuted: 'rgba(223, 255, 0, 0.14)',
  primaryForeground: '#000000', // Pitch-black text on Acid Lime
  primarySurface: 'rgba(223, 255, 0, 0.10)',
  primaryBorder: 'rgba(223, 255, 0, 0.30)',

  // Secondary Tech Cyan / Ice Blue (#4DD0E1)
  accent: '#4DD0E1',
  accentSurface: 'rgba(77, 208, 225, 0.12)',
  accentGlow: 'rgba(77, 208, 225, 0.20)',

  cardHeroBg: '#16171C',
  cardHeroBorder: 'rgba(223, 255, 0, 0.25)',

  // Semantic Status Tokens
  success: '#10B981',          // Active operational state
  successSurface: 'rgba(16, 185, 129, 0.12)',
  warning: '#FF5722',          // Dark Orange / Coral alert accent
  warningSurface: 'rgba(255, 87, 34, 0.12)',
  danger: '#FF5722',           // Dark Orange / Coral destructive action
  dangerSurface: 'rgba(255, 87, 34, 0.12)',
  info: '#4DD0E1',             // Tech Cyan Info
  infoSurface: 'rgba(77, 208, 225, 0.12)',

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

  // Primary Acid Lime System
  primary: '#121316',          // In light mode, crisp obsidian primary text/button background
  primaryHover: '#202127',
  primaryLight: '#2B2C33',
  primaryDark: '#0B0B0E',
  primaryMuted: 'rgba(18, 19, 22, 0.08)',
  primaryForeground: '#DFFF00', // Acid Lime text on black button in light mode
  primarySurface: 'rgba(18, 19, 22, 0.05)',
  primaryBorder: 'rgba(18, 19, 22, 0.20)',

  accent: '#00838F',           // Darker Cyan for light mode readability
  accentSurface: 'rgba(0, 131, 143, 0.08)',
  accentGlow: 'rgba(0, 131, 143, 0.15)',

  cardHeroBg: '#F1F3F5',
  cardHeroBorder: '#DEE2E6',

  success: '#059669',
  successSurface: 'rgba(5, 150, 105, 0.08)',
  warning: '#E64A19',
  warningSurface: 'rgba(230, 74, 25, 0.08)',
  danger: '#E64A19',
  dangerSurface: 'rgba(230, 74, 25, 0.08)',
  info: '#00838F',
  infoSurface: 'rgba(0, 131, 143, 0.08)',

  overlay: 'rgba(18, 19, 22, 0.55)',
  mapBg: '#E9ECEF',
};
