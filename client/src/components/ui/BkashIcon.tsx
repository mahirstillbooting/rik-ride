import React from 'react';
import { Image, ImageStyle, StyleProp } from 'react-native';

export interface BkashIconProps {
  size?: number;
  style?: StyleProp<ImageStyle>;
}

export const BkashIcon: React.FC<BkashIconProps> = ({ size = 18, style }) => {
  return (
    <Image
      source={require('../../assets/bkash-logo.png')}
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
