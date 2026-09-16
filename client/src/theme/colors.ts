/**
 * RIK-RIDE Design System Dual-Theme Color Tokens
 * Obsidian Tech (Dark Mode) & Editorial Alabaster (Light Mode)
 * 
 * Palette Specs:
 * Dark Canvas: #08080A | Light Canvas: #F8F9FA
 * Dark Surface: #121316 | Light Surface: #FFFFFF
 * Dark Secondary Surface: #181920 | Light Secondary Surface: #F0F2F5
 * Dark Hairline Border: rgba(255, 255, 255, 0.08) | Light Hairline Border: rgba(0, 0, 0, 0.08)
 * Primary CTA Accent: #FF7A00 (Electric Amber)
 * Dark Text: #F8F8FA / #8E909B | Light Text: #0B0B0E / #64748B
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
  
  // Primary Orange Brand System Tokens
  primary: string;
  primaryHover: string;
  primaryLight: string;
  primaryDark: string;
  primaryMuted: string;
  primaryForeground: string;
  primarySurface: string;
  primaryBorder: string;
  
  // Secondary Soft Amber Tokens
  accent: string;
  accentSurface: string;
  accentGlow: string;
  
  cardHeroBg: string;
  cardHeroBorder: string;

  // Semantic Status Tokens (Approval = Muted Green, Suspend = Muted Red)
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
  background: '#08080A',       // Deep Obsidian Canvas
  surface: '#121316',          // Zinc Black Surface
  surfaceElevated: '#181920',  // Subtle Dark Fill for Inputs/Sheets
  surfaceHover: '#202127',     // Dark Hover Highlight
  border: 'rgba(255, 255, 255, 0.08)', // Hairline Border
  borderSubtle: 'rgba(255, 255, 255, 0.04)',
  borderStrong: '#2A2C34',

  textPrimary: '#F8F8FA',      // Porcelain White
  textSecondary: '#8E909B',    // Muted Pewter
  textMuted: '#525460',        // Dark Slate Gray

  // Primary Electric Amber (#FF7A00)
  primary: '#FF7A00',
  primaryHover: '#FF6600',
  primaryLight: '#FFA347',
  primaryDark: '#D96300',
  primaryMuted: 'rgba(255, 122, 0, 0.12)',
  primaryForeground: '#FFFFFF',
  primarySurface: 'rgba(255, 122, 0, 0.10)',
  primaryBorder: 'rgba(255, 122, 0, 0.28)',

  accent: '#FFA347',
  accentSurface: 'rgba(255, 163, 71, 0.12)',
  accentGlow: 'rgba(255, 122, 0, 0.20)',

  cardHeroBg: '#14151B',
  cardHeroBorder: 'rgba(255, 122, 0, 0.28)',

  success: '#10B981',          // Muted Emerald Green for Approval
  successSurface: 'rgba(16, 185, 129, 0.12)',
  warning: '#F59E0B',          // Muted Amber Warning
  warningSurface: 'rgba(245, 158, 11, 0.12)',
  danger: '#EF4444',           // Muted Crimson Red for Suspend
  dangerSurface: 'rgba(239, 68, 68, 0.12)',
  info: '#FF7A00',
  infoSurface: 'rgba(255, 122, 0, 0.10)',

  overlay: 'rgba(13, 14, 18, 0.75)',
  mapBg: '#08080A',
};

export const lightColors: ThemeColors = {
  background: '#F8F9FA',       // Soft Off-White / Alabaster Canvas
  surface: '#FFFFFF',          // Pure White Elevated Surface
  surfaceElevated: '#F0F2F5',  // Soft Gray Fill for Inputs/Sheets
  surfaceHover: '#E4E7EB',     // Smooth Hover Fill
  border: 'rgba(0, 0, 0, 0.08)', // Hairline Border
  borderSubtle: 'rgba(0, 0, 0, 0.04)',
  borderStrong: '#CBD5E1',

  textPrimary: '#0B0B0E',      // Deep Charcoal Black
  textSecondary: '#64748B',    // Cool Slate Gray
  textMuted: '#94A3B8',        // Soft Slate Placeholder

  // Primary Electric Amber (#FF7A00)
  primary: '#FF7A00',
  primaryHover: '#F97316',
  primaryLight: '#FFA347',
  primaryDark: '#EA580C',
  primaryMuted: 'rgba(255, 122, 0, 0.08)',
  primaryForeground: '#FFFFFF',
  primarySurface: 'rgba(255, 122, 0, 0.08)',
  primaryBorder: 'rgba(255, 122, 0, 0.22)',

  accent: '#FFA347',
  accentSurface: 'rgba(255, 163, 71, 0.10)',
  accentGlow: 'rgba(255, 122, 0, 0.15)',

  cardHeroBg: '#FFF7ED',
  cardHeroBorder: '#FED7AA',

  success: '#059669',          // Muted Emerald Green
  successSurface: 'rgba(5, 150, 105, 0.08)',
  warning: '#D97706',
  warningSurface: 'rgba(217, 119, 6, 0.08)',
  danger: '#DC2626',           // Muted Crimson Red
  dangerSurface: 'rgba(220, 38, 38, 0.08)',
  info: '#FF7A00',
  infoSurface: 'rgba(255, 122, 0, 0.08)',

  overlay: 'rgba(255, 255, 255, 0.80)',
  mapBg: '#F8F9FA',
};
