import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Switch, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { radius, spacing } from '@/constants/theme';
import { usePalette } from '@/hooks/useTheme';
import { BUMP_INTERVALS, BumpInterval } from '@/types/reminder';
import { haptics } from '@/utils/haptics';
import { AppText } from '@/components/AppText';
import { QuickTimeButton } from '@/components/QuickTimeButton';

export interface BumpToggleProps {
  enabled: boolean;
  interval: BumpInterval;
  onToggle: (enabled: boolean) => void;
  onIntervalChange: (interval: BumpInterval) => void;
  /** Hides the explainer once the user clearly knows what this does. */
  compact?: boolean;
}

export function bumpIntervalLabel(minutes: BumpInterval): string {
  if (minutes < 60) return `Every ${minutes} min`;
  const hours = minutes / 60;
  return hours === 1 ? 'Every hour' : `Every ${hours} hours`;
}

/**
 * "Bump me until I do it" — the feature the app is named after. Off means one
 * notification; on means an escalating chain that stops the moment it is done.
 */
export function BumpToggle({
  enabled,
  interval,
  onToggle,
  onIntervalChange,
  compact = false,
}: BumpToggleProps) {
  const palette = usePalette();

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: enabled ? palette.accentSoft : palette.surface },
      ]}
    >
      <View style={styles.row}>
        <View style={styles.labelBlock}>
          <View style={styles.titleRow}>
            <Ionicons
              name={enabled ? 'notifications' : 'notifications-outline'}
              size={16}
              color={enabled ? palette.accent : palette.textSecondary}
            />
            <AppText variant="label" color={enabled ? palette.text : palette.textSecondary}>
              Bump me until I do it
            </AppText>
          </View>
          {!compact ? (
            <AppText variant="caption" tone="tertiary" style={styles.blurb}>
              {enabled
                ? 'Bump keeps nudging — and gets a little more insistent — until you mark it done.'
                : 'One notification, then it is on you.'}
            </AppText>
          ) : null}
        </View>
        <Switch
          value={enabled}
          onValueChange={(next) => {
            haptics.tap();
            onToggle(next);
          }}
          trackColor={{ false: palette.border, true: palette.accent }}
          thumbColor={palette.card}
          ios_backgroundColor={palette.border}
        />
      </View>

      {enabled ? (
        <Animated.View entering={FadeIn.duration(220)} exiting={FadeOut.duration(140)} style={styles.intervals}>
          {BUMP_INTERVALS.map((option) => (
            <QuickTimeButton
              key={option}
              label={bumpIntervalLabel(option)}
              selected={option === interval}
              onPress={() => onIntervalChange(option)}
            />
          ))}
        </Animated.View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  labelBlock: {
    flex: 1,
    gap: 3,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  blurb: {
    lineHeight: 17,
  },
  intervals: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
});
