/**
 * RIK-RIDE Design System Color Tokens
 * Dark-first transportation & ride-platform theme
 * Refined palette: Near-black/charcoal dark theme with vibrant orange accents
 */

export interface ThemeColors {
  background: string;
  surface: string;
  surfaceElevated: string;
  surfaceHover: string;
  border: string;
  borderSubtle: string;
  
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  
  primary: string;
  primaryHover: string;
  primaryForeground: string;
  
  accent: string;
  accentSurface: string;
  accentGlow: string;
  
  cardHeroBg: string;
  cardHeroBorder: string;

  success: string;
  successSurface: string;
  warning: string;
  warningSurface: string;
  danger: string;
  dangerSurface: string;
  info: string;
  infoSurface: string;

  overlay: string;
}

export const darkColors: ThemeColors = {
  background: '#090C10',
  surface: '#111620',
  surfaceElevated: '#19202E',
  surfaceHover: '#1F2839',
  border: '#222B3D',
  borderSubtle: '#161D2A',

  textPrimary: '#F8FAFC',
  textSecondary: '#94A3B8',
  textMuted: '#64748B',

  primary: '#F97316',
  primaryHover: '#EA580C',
  primaryForeground: '#FFFFFF',

  accent: '#FB923C',
  accentSurface: 'rgba(249, 115, 22, 0.14)',
  accentGlow: 'rgba(249, 115, 22, 0.22)',

  cardHeroBg: '#181412',
  cardHeroBorder: 'rgba(249, 115, 22, 0.35)',

  success: '#10B981',
  successSurface: 'rgba(16, 185, 129, 0.12)',
  warning: '#F59E0B',
  warningSurface: 'rgba(245, 158, 11, 0.12)',
  danger: '#EF4444',
  dangerSurface: 'rgba(239, 68, 68, 0.12)',
  info: '#F97316',
  infoSurface: 'rgba(249, 115, 22, 0.14)',

  overlay: 'rgba(9, 12, 16, 0.82)',
};

export const lightColors: ThemeColors = {
  background: '#F8FAFC',
  surface: '#FFFFFF',
  surfaceElevated: '#F1F5F9',
  surfaceHover: '#F1F5F9',
  border: '#E2E8F0',
  borderSubtle: '#F1F5F9',

  textPrimary: '#0F172A',
  textSecondary: '#475569',
  textMuted: '#94A3B8',

  primary: '#0284C7',
  primaryHover: '#0369A1',
  primaryForeground: '#FFFFFF',

  accent: '#0EA5E9',
  accentSurface: 'rgba(14, 165, 233, 0.08)',
  accentGlow: 'rgba(14, 165, 233, 0.15)',

  cardHeroBg: '#F0F9FF',
  cardHeroBorder: '#BAE6FD',

  success: '#059669',
  successSurface: 'rgba(5, 150, 105, 0.08)',
  warning: '#D97706',
  warningSurface: 'rgba(217, 119, 6, 0.08)',
  danger: '#DC2626',
  dangerSurface: 'rgba(220, 38, 38, 0.08)',
  info: '#2563EB',
  infoSurface: 'rgba(37, 99, 235, 0.08)',

  overlay: 'rgba(15, 23, 42, 0.5)',
};
