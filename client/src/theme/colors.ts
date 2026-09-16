/**
 * RIK-RIDE Visual UI/UX Design System V2 — Premium Modern Dark/Neutral Product Palette
 * 
 * Primary Dark Palette:
 * Background: #08090A / #0B0C0E / #101113
 * Elevated Surfaces: #141517 / #18191C / #1D1F22
 * Higher Elevation: #222428 / #27292D
 * Text: #F4F4F2 / #E7E7E4
 * Secondary Text: #A1A3A8 / #85878D / #6F7177
 * Borders: rgba(255, 255, 255, 0.07) / #222428
 * Accent: Muted Sophisticated Orange (#E2763A / #D96832 / #C85D2C)
 * 
 * STRICT RULE: ABSOLUTELY NO DECORATIVE BLUE, CYAN, NAVY, INDIGO, OR BLUE-GREY.
 * GREEN IS STRICTLY SEMANTIC ONLY (SUCCESS / ACTIVE / APPROVED / ONLINE).
 */

export interface ThemeColors {
  background: string;
  surface: string;
  surfaceElevated: string;
  surfaceHover: string;
  surfaceSelected: string;
  border: string;
  borderSubtle: string;
  borderStrong: string;
  
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  
  // Muted Sophisticated Orange Accent Tokens
  primary: string;
  primaryHover: string;
  primaryLight: string;
  primaryDark: string;
  primaryMuted: string;
  primaryForeground: string;
  primarySurface: string;
  primaryBorder: string;
  
  // Secondary Accent System Tokens
  accent: string;
  accentSurface: string;
  accentGlow: string;
  
  cardHeroBg: string;
  cardHeroBorder: string;

  // Semantic Status Tokens (Green = Approval/Online, Red = Suspend/Offline, Amber = Warning/Pending)
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
  background: '#08090A',        // Deep Obsidian Canvas
  surface: '#101113',           // Dark Surface Base
  surfaceElevated: '#141517',   // Elevated Card Fill
  surfaceHover: '#18191C',      // Interactive Hover Fill
  surfaceSelected: '#1D1F22',   // Active Selected Surface
  border: 'rgba(255, 255, 255, 0.07)', // Ultra-subtle hairline border
  borderSubtle: 'rgba(255, 255, 255, 0.04)',
  borderStrong: '#222428',

  textPrimary: '#F4F4F2',       // Porcelain Off-White
  textSecondary: '#A1A3A8',     // Cool Pewter Gray
  textMuted: '#6F7177',         // Muted Carbon Gray

  // Muted Sophisticated Orange Accent (#E2763A)
  primary: '#E2763A',
  primaryHover: '#D96832',
  primaryLight: '#EC884D',
  primaryDark: '#C85D2C',
  primaryMuted: 'rgba(226, 118, 58, 0.08)',
  primaryForeground: '#FFFFFF',
  primarySurface: 'rgba(226, 118, 58, 0.08)',
  primaryBorder: 'rgba(226, 118, 58, 0.22)',

  accent: '#D96832',
  accentSurface: 'rgba(217, 104, 50, 0.08)',
  accentGlow: 'rgba(226, 118, 58, 0.12)',

  cardHeroBg: '#141517',
  cardHeroBorder: 'rgba(226, 118, 58, 0.22)',

  // Semantic Status Tokens (Green = Semantic Only)
  success: '#10B981',           // Muted Emerald Green for Active/Approved
  successSurface: 'rgba(16, 185, 129, 0.08)',
  warning: '#F59E0B',           // Muted Amber Warning
  warningSurface: 'rgba(245, 158, 11, 0.08)',
  danger: '#EF4444',            // Muted Crimson Red for Danger/Suspended
  dangerSurface: 'rgba(239, 68, 68, 0.08)',
  info: '#E2763A',              // Info matches Muted Sophisticated Orange
  infoSurface: 'rgba(226, 118, 58, 0.08)',

  overlay: 'rgba(8, 9, 10, 0.85)',
  mapBg: '#08090A',
};

export const lightColors: ThemeColors = {
  background: '#F8F9FA',        // Editorial Off-White Canvas
  surface: '#FFFFFF',           // Pure White Surface
  surfaceElevated: '#F0F2F5',   // Elevated Warm Gray Container
  surfaceHover: '#E4E7EB',      // Smooth Hover Fill
  surfaceSelected: '#E9ECEF',   // Active Selected Surface
  border: 'rgba(0, 0, 0, 0.08)', // Subtle Hairline Border
  borderSubtle: 'rgba(0, 0, 0, 0.04)',
  borderStrong: '#CBD5E1',

  textPrimary: '#0B0B0E',       // Deep Charcoal Black
  textSecondary: '#64748B',     // Cool Slate Gray
  textMuted: '#94A3B8',         // Soft Slate Placeholder

  // Muted Sophisticated Orange Accent (#E2763A)
  primary: '#E2763A',
  primaryHover: '#D96832',
  primaryLight: '#EC884D',
  primaryDark: '#C85D2C',
  primaryMuted: 'rgba(226, 118, 58, 0.06)',
  primaryForeground: '#FFFFFF',
  primarySurface: 'rgba(226, 118, 58, 0.06)',
  primaryBorder: 'rgba(226, 118, 58, 0.18)',

  accent: '#D96832',
  accentSurface: 'rgba(217, 104, 50, 0.06)',
  accentGlow: 'rgba(226, 118, 58, 0.10)',

  cardHeroBg: '#FFF7ED',
  cardHeroBorder: '#FED7AA',

  success: '#059669',           // Muted Emerald Green
  successSurface: 'rgba(5, 150, 105, 0.06)',
  warning: '#D97706',           // Muted Amber Warning
  warningSurface: 'rgba(217, 119, 6, 0.06)',
  danger: '#DC2626',            // Muted Crimson Red
  dangerSurface: 'rgba(220, 38, 38, 0.06)',
  info: '#E2763A',
  infoSurface: 'rgba(226, 118, 58, 0.06)',

  overlay: 'rgba(255, 255, 255, 0.85)',
  mapBg: '#F8F9FA',
};
