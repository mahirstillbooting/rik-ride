/**
 * RIK-RIDE Design System Color Tokens
 * Dark-first transportation & ride-platform theme
 */

export interface ThemeColors {
  background: string;
  surface: string;
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
  background: '#0B0F17',
  surface: '#151C28',
  surfaceHover: '#1E2738',
  border: '#2A364F',
  borderSubtle: '#1C2536',

  textPrimary: '#F1F5F9',
  textSecondary: '#94A3B8',
  textMuted: '#64748B',

  primary: '#0EA5E9',
  primaryHover: '#0284C7',
  primaryForeground: '#FFFFFF',

  accent: '#38BDF8',
  accentSurface: 'rgba(56, 189, 248, 0.12)',

  success: '#10B981',
  successSurface: 'rgba(16, 185, 129, 0.12)',
  warning: '#F59E0B',
  warningSurface: 'rgba(245, 158, 11, 0.12)',
  danger: '#EF4444',
  dangerSurface: 'rgba(239, 68, 68, 0.12)',
  info: '#3B82F6',
  infoSurface: 'rgba(59, 130, 246, 0.12)',

  overlay: 'rgba(11, 15, 23, 0.75)',
};

export const lightColors: ThemeColors = {
  background: '#F8FAFC',
  surface: '#FFFFFF',
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
