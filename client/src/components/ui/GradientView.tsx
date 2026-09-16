import React, { ReactNode } from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../theme/ThemeContext';

export type GradientPreset =
  | 'darkHero'
  | 'accentHero'
  | 'charcoalElevated'
  | 'subtleMuted'
  | 'custom';

export interface GradientViewProps {
  children?: ReactNode;
  preset?: GradientPreset;
  colors?: readonly [string, string, ...string[]];
  start?: { x: number; y: number };
  end?: { x: number; y: number };
  style?: StyleProp<ViewStyle>;
}

export const GradientView: React.FC<GradientViewProps> = ({
  children,
  preset = 'charcoalElevated',
  colors: customColors,
  start = { x: 0, y: 0 },
  end = { x: 1, y: 1 },
  style,
}) => {
  const { colors, mode } = useTheme();

  const getGradientColors = (): readonly [string, string, ...string[]] => {
    if (customColors && customColors.length >= 2) return customColors;

    if (mode === 'dark') {
      switch (preset) {
        case 'darkHero':
          return ['#08090A', '#101113'];
        case 'accentHero':
          return ['#101113', 'rgba(226, 118, 58, 0.06)'];
        case 'subtleMuted':
          return ['#141517', '#18191C'];
        case 'charcoalElevated':
        default:
          return ['#101113', '#141517'];
      }
    } else {
      switch (preset) {
        case 'darkHero':
        case 'accentHero':
          return ['#F8F9FA', '#FFFFFF'];
        case 'subtleMuted':
          return ['#FFFFFF', '#F0F2F5'];
        case 'charcoalElevated':
        default:
          return ['#FFFFFF', '#F8F9FA'];
      }
    }
  };

  return (
    <LinearGradient colors={getGradientColors()} start={start} end={end} style={style}>
      {children}
    </LinearGradient>
  );
};
