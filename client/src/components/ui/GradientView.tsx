import React, { ReactNode } from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../theme/ThemeContext';

export type GradientPreset =
  | 'darkHero'
  | 'accentHero'
  | 'limeHighlight'
  | 'cyanHighlight'
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
          return ['#0B0B0E', '#121316'];
        case 'accentHero':
          return ['#121316', 'rgba(223, 255, 0, 0.12)'];
        case 'limeHighlight':
          return ['#DFFF00', '#C0DC00'];
        case 'cyanHighlight':
          return ['#4DD0E1', '#00838F'];
        case 'charcoalElevated':
        default:
          return ['#121316', '#18191E'];
      }
    } else {
      switch (preset) {
        case 'darkHero':
        case 'accentHero':
          return ['#F8F9FA', '#FFFFFF'];
        case 'limeHighlight':
          return ['#121316', '#202127'];
        case 'cyanHighlight':
          return ['#00838F', '#006064'];
        case 'charcoalElevated':
        default:
          return ['#FFFFFF', '#F1F3F5'];
      }
    }
  };

  return (
    <LinearGradient colors={getGradientColors()} start={start} end={end} style={style}>
      {children}
    </LinearGradient>
  );
};
