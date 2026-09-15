import React from 'react';
import { View } from 'react-native';
import { spacing } from '@/constants/theme';
import { usePalette } from '@/hooks/useTheme';
import { AppText } from '@/components/AppText';

export interface SectionHeaderProps {
  title: string;
  emoji: string;
  count: number;
  /** Softly highlights the "Now" group. */
  accent?: boolean;
}

export function SectionHeader({ title, emoji, count, accent = false }: SectionHeaderProps) {
  const palette = usePalette();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        paddingHorizontal: spacing.xs,
        marginTop: spacing.lg,
        marginBottom: spacing.md,
      }}
    >
      <AppText variant="section" style={{ fontSize: 15 }}>
        {emoji}
      </AppText>
      <AppText
        variant="section"
        color={accent ? palette.accent : palette.textSecondary}
        style={{ textTransform: 'uppercase' }}
      >
        {title}
      </AppText>
      <View
        style={{
          minWidth: 20,
          height: 20,
          paddingHorizontal: 6,
          borderRadius: 10,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: accent ? palette.accentSoft : palette.surface,
        }}
      >
        <AppText variant="micro" color={accent ? palette.accent : palette.textTertiary}>
          {count}
        </AppText>
      </View>
    </View>
  );
}
