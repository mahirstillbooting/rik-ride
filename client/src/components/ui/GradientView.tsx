import React, { ReactNode } from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../theme/ThemeContext';

export type GradientPreset =
  | 'darkHero'
  | 'accentHero'
  | 'orangeHighlight'
  | 'charcoalElevated'
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
          return ['#090A0C', '#121417'];
        case 'accentHero':
          return ['#121417', 'rgba(249, 115, 22, 0.12)'];
        case 'orangeHighlight':
          return ['#F97316', '#EA580C'];
        case 'charcoalElevated':
        default:
          return ['#121417', '#181B1F'];
      }
    } else {
      switch (preset) {
        case 'darkHero':
        case 'accentHero':
          return ['#FFF7ED', '#FFFFFF'];
        case 'orangeHighlight':
          return ['#F97316', '#EA580C'];
        case 'charcoalElevated':
        default:
          return ['#FFFFFF', '#F4F4F5'];
      }
    }
  };

  return (
    <LinearGradient colors={getGradientColors()} start={start} end={end} style={style}>
      {children}
    </LinearGradient>
  );
};
