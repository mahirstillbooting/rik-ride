import React from 'react';
import { Image, ImageStyle, StyleProp } from 'react-native';

export interface NagadIconProps {
  size?: number;
  style?: StyleProp<ImageStyle>;
}

export const NagadIcon: React.FC<NagadIconProps> = ({ size = 18, style }) => {
  return (
    <Image
      source={require('../../assets/nagad-logo.png')}
      style={[
        {
          width: size,
          height: size,
          resizeMode: 'contain',
        },
        style,
      ]}
    />
  );
};
