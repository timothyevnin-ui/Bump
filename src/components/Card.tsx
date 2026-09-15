import React from 'react';
import { StyleProp, View, ViewStyle } from 'react-native';
import { radius, softShadow, spacing } from '@/constants/theme';
import { usePalette } from '@/hooks/useTheme';

export interface CardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Tinted cards skip the border so the pastel reads as one soft block. */
  background?: string;
  elevation?: 1 | 2 | 3;
  padded?: boolean;
}

export function Card({ children, style, background, elevation = 1, padded = true }: CardProps) {
  const palette = usePalette();
  return (
    <View
      style={[
        {
          backgroundColor: background ?? palette.card,
          borderRadius: radius.lg,
          padding: padded ? spacing.lg : 0,
          borderWidth: background ? 0 : 1,
          borderColor: palette.border,
        },
        softShadow(palette, elevation),
        style,
      ]}
    >
      {children}
    </View>
  );
}
