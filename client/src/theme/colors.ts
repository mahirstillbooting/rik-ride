/**
 * RIK-RIDE Design System Color Tokens — Amber-Orange & Refined Semantic Approval/Suspend Tokens
 * Eye-Pleasing Soft Light Mode & Sleek Obsidian Dark Mode Integration
 * 
 * Primary Accent / CTA: #FF7A00 (High-energy, crisp amber-orange)
 * Soft Amber (Readable Text): #FFA347 (Desaturated, lifted lightness for labels & secondary badges)
 * Neon / High-Contrast: #FF6600 (Saturated racing orange for focal points & glow shadows)
 * Subtle Tint / Container: rgba(255, 122, 0, 0.10) / #FF7A001A (10% opacity container overlay)
 * Approval (Good Muted Green): #10B981 (Soft emerald for approvals & active states)
 * Suspend (Good Muted Red): #EF4444 (Soft crimson for suspensions, denials & danger actions)
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

  // Primary Crisp Amber-Orange (#FF7A00)
  primary: '#FF7A00',
  primaryHover: '#FF6600',     // Neon Racing Orange
  primaryLight: '#FFA347',     // Soft Amber
  primaryDark: '#D96300',
  primaryMuted: 'rgba(255, 122, 0, 0.10)',
  primaryForeground: '#FFFFFF',
  primarySurface: 'rgba(255, 122, 0, 0.10)', // #FF7A001A
  primaryBorder: 'rgba(255, 122, 0, 0.25)',

  // Secondary Soft Amber (#FFA347)
  accent: '#FFA347',
  accentSurface: 'rgba(255, 163, 71, 0.12)',
  accentGlow: 'rgba(255, 102, 0, 0.20)',

  cardHeroBg: '#16171C',
  cardHeroBorder: 'rgba(255, 122, 0, 0.25)',

  // Semantic Approval & Suspend Tokens
  success: '#10B981',          // Muted Emerald Green for Approval / Approved state
  successSurface: 'rgba(16, 185, 129, 0.12)',
  warning: '#F59E0B',          // Muted Amber Warning
  warningSurface: 'rgba(245, 158, 11, 0.12)',
  danger: '#EF4444',           // Muted Crimson Red for Suspend / Denied / Danger state
  dangerSurface: 'rgba(239, 68, 68, 0.12)',
  info: '#FF7A00',             // Info matches Primary Amber-Orange
  infoSurface: 'rgba(255, 122, 0, 0.10)',

  overlay: 'rgba(11, 11, 14, 0.88)',
  mapBg: '#090A0C',
};

export const lightColors: ThemeColors = {
  background: '#FAFAFC',       // Soft off-white linen canvas (eye-pleasing)
  surface: '#FFFFFF',          // Crisp white surface
  surfaceElevated: '#F4F4F6',  // Soft elevated grey container
  surfaceHover: '#EAEAEF',     // Smooth hover fill
  border: '#E4E4E7',           // Subtle border token
  borderSubtle: '#F4F4F5',
  borderStrong: '#D4D4D8',

  textPrimary: '#0F172A',       // Deep slate navy-charcoal (comfortably readable)
  textSecondary: '#475569',     // Slate grey text
  textMuted: '#94A3B8',        // Soft slate placeholder

  // Primary Orange System (#FF7A00)
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

  success: '#059669',          // Muted Green for light mode
  successSurface: 'rgba(5, 150, 105, 0.08)',
  warning: '#D97706',
  warningSurface: 'rgba(217, 119, 6, 0.08)',
  danger: '#DC2626',           // Muted Red for light mode
  dangerSurface: 'rgba(220, 38, 38, 0.08)',
  info: '#FF7A00',
  infoSurface: 'rgba(255, 122, 0, 0.08)',

  overlay: 'rgba(15, 23, 42, 0.50)',
  mapBg: '#F1F3F5',
};
