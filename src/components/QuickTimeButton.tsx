import React from 'react';
import { StyleSheet } from 'react-native';
import { radius, spacing } from '@/constants/theme';
import { usePalette } from '@/hooks/useTheme';
import { AppText } from '@/components/AppText';
import { PressableScale } from '@/components/PressableScale';

export interface QuickTimeButtonProps {
  label: string;
  emoji?: string;
  selected?: boolean;
  onPress: () => void;
  disabled?: boolean;
}

/** A pill-shaped one-tap time. Also reused for the chips inside sheets. */
export function QuickTimeButton({
  label,
  emoji,
  selected = false,
  onPress,
  disabled = false,
}: QuickTimeButtonProps) {
  const palette = usePalette();
  return (
    <PressableScale
      onPress={onPress}
      disabled={disabled}
      activeScale={0.93}
      accessibilityRole="button"
      accessibilityState={{ selected, disabled }}
      accessibilityLabel={label}
      style={[
        styles.chip,
        {
          backgroundColor: selected ? palette.accent : palette.card,
          borderColor: selected ? palette.accent : palette.border,
          opacity: disabled ? 0.45 : 1,
        },
      ]}
    >
      {emoji ? <AppText style={styles.emoji}>{emoji}</AppText> : null}
      <AppText variant="caption" color={selected ? palette.accentText : palette.textSecondary}>
        {label}
      </AppText>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: spacing.md,
    paddingVertical: 9,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  emoji: {
    fontSize: 13,
    lineHeight: 17,
  },
});
