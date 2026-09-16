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
          return ['#080808', '#121212'];
        case 'accentHero':
          return ['#121212', 'rgba(255, 106, 0, 0.12)'];
        case 'orangeHighlight':
          return ['#FF6A00', '#D94F00'];
        case 'charcoalElevated':
        default:
          return ['#121212', '#1A1A1A'];
      }
    } else {
      switch (preset) {
        case 'darkHero':
        case 'accentHero':
          return ['#FFF7ED', '#FFFFFF'];
        case 'orangeHighlight':
          return ['#FF6A00', '#D94F00'];
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
