/**
 * RIK-RIDE Typography System — Vercel Geist Edition
 * Featuring Vercel's Geist Sans & Geist Mono fonts with system fallback stack
 */

import { TextStyle, Platform } from 'react-native';

const geistSansFamily = Platform.select({
  web: '"Geist", "Geist Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  android: 'sans-serif',
  ios: 'System',
  default: 'sans-serif',
});

const geistMonoFamily = Platform.select({
  web: '"Geist Mono", "GeistMono", "ui-monospace", "SFMono-Regular", "Roboto Mono", monospace',
  android: 'monospace',
  ios: 'Courier',
  default: 'monospace',
});

export const typography = {
  // Font Families
  fontFamily: geistSansFamily,
  fontFamilyMono: geistMonoFamily,

  // Font Sizes
  sizes: {
    xs: 11,
    sm: 12,
    base: 14,
    md: 15,
    lg: 16,
    xl: 18,
    '2xl': 22,
    '3xl': 28,
    '4xl': 36,
  },

  // Font Weights
  weights: {
    regular: '400' as TextStyle['fontWeight'],
    medium: '500' as TextStyle['fontWeight'],
    semibold: '600' as TextStyle['fontWeight'],
    bold: '700' as TextStyle['fontWeight'],
    extrabold: '800' as TextStyle['fontWeight'],
  },

  // Line Heights
  lineHeights: {
    tight: 1.25,
    snug: 1.35,
    normal: 1.5,
    relaxed: 1.625,
  },

  // Preset Typography Styles
  styles: {
    display: {
      fontFamily: geistSansFamily,
      fontSize: 28,
      fontWeight: '800' as TextStyle['fontWeight'],
      lineHeight: 34,
      letterSpacing: -0.5,
    } as TextStyle,

    pageTitle: {
      fontFamily: geistSansFamily,
      fontSize: 22,
      fontWeight: '800' as TextStyle['fontWeight'],
      lineHeight: 28,
      letterSpacing: -0.3,
    } as TextStyle,

    sectionTitle: {
      fontFamily: geistSansFamily,
      fontSize: 18,
      fontWeight: '700' as TextStyle['fontWeight'],
      lineHeight: 24,
      letterSpacing: -0.2,
    } as TextStyle,

    cardTitle: {
      fontFamily: geistSansFamily,
      fontSize: 15,
      fontWeight: '700' as TextStyle['fontWeight'],
      lineHeight: 20,
      letterSpacing: 0.1,
    } as TextStyle,

    body: {
      fontFamily: geistSansFamily,
      fontSize: 14,
      fontWeight: '400' as TextStyle['fontWeight'],
      lineHeight: 20,
    } as TextStyle,

    secondaryBody: {
      fontFamily: geistSansFamily,
      fontSize: 13,
      fontWeight: '400' as TextStyle['fontWeight'],
      lineHeight: 18,
    } as TextStyle,

    caption: {
      fontFamily: geistSansFamily,
      fontSize: 11,
      fontWeight: '500' as TextStyle['fontWeight'],
      lineHeight: 15,
      letterSpacing: 0.2,
    } as TextStyle,

    label: {
      fontFamily: geistSansFamily,
      fontSize: 12,
      fontWeight: '600' as TextStyle['fontWeight'],
      lineHeight: 16,
      letterSpacing: 0.3,
    } as TextStyle,

    button: {
      fontFamily: geistSansFamily,
      fontSize: 14,
      fontWeight: '600' as TextStyle['fontWeight'],
      lineHeight: 18,
      letterSpacing: 0.2,
    } as TextStyle,

    metric: {
      fontFamily: geistMonoFamily,
      fontSize: 32,
      fontWeight: '800' as TextStyle['fontWeight'],
      lineHeight: 38,
      letterSpacing: -0.8,
    } as TextStyle,

    mono: {
      fontFamily: geistMonoFamily,
      fontSize: 13,
      fontWeight: '400' as TextStyle['fontWeight'],
      lineHeight: 18,
    } as TextStyle,
  },
};
