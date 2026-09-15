import React from 'react';
import { StyleProp, Text, TextProps, TextStyle } from 'react-native';
import { type } from '@/constants/theme';
import { usePalette } from '@/hooks/useTheme';

type Variant = keyof typeof type;
type Tone = 'primary' | 'secondary' | 'tertiary' | 'accent' | 'inverse';

export interface AppTextProps extends TextProps {
  variant?: Variant;
  tone?: Tone;
  /** Overrides the tone entirely — used for pastel-tinted card text. */
  color?: string;
  style?: StyleProp<TextStyle>;
}

/**
 * Every piece of text in Bump goes through here so the rounded typeface and
 * the tone ramp stay consistent without repeating style objects.
 */
export function AppText({
  variant = 'body',
  tone = 'primary',
  color,
  style,
  ...rest
}: AppTextProps) {
  const palette = usePalette();
  const toneColor = {
    primary: palette.text,
    secondary: palette.textSecondary,
    tertiary: palette.textTertiary,
    accent: palette.accent,
    inverse: palette.accentText,
  }[tone];

  return <Text {...rest} style={[type[variant], { color: color ?? toneColor }, style]} />;
}
