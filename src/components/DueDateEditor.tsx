import { Ionicons } from '@expo/vector-icons';
import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { radius, spacing } from '@/constants/theme';
import { usePalette } from '@/hooks/useTheme';
import {
  addDays,
  addMinutes,
  formatFullDate,
  formatTimeShort,
  isSameDay,
  startOfDay,
  withTime,
  WEEKDAY_NAMES,
} from '@/utils/date';
import { haptics } from '@/utils/haptics';
import { AppText } from '@/components/AppText';
import { PressableScale } from '@/components/PressableScale';
import { QuickTimeButton } from '@/components/QuickTimeButton';

/** Named times that cover most of what people actually pick. */
const TIME_PRESETS: { label: string; emoji: string; hour: number }[] = [
  { label: 'Morning', emoji: '🌅', hour: 9 },
  { label: 'Noon', emoji: '🥪', hour: 12 },
  { label: 'Afternoon', emoji: '☀️', hour: 14 },
  { label: 'Evening', emoji: '🌆', hour: 18 },
  { label: 'Night', emoji: '🌙', hour: 20 },
];

const STEP_MINUTES = 15;

export interface DueDateEditorProps {
  /** `null` means "Someday" — a reminder with no fixed time. */
  value: Date | null;
  onChange: (next: Date | null) => void;
  now: Date;
  /** Hides the "No specific time" escape hatch where it does not apply. */
  allowSomeday?: boolean;
}

/**
 * Quick date + time adjustment without a native picker.
 *
 * Shared by the confirmation sheet and the reminder detail screen so there is
 * exactly one way to change when something is due.
 */
export function DueDateEditor({ value, onChange, now, allowSomeday = true }: DueDateEditorProps) {
  const palette = usePalette();

  const days = useMemo(() => {
    const today = startOfDay(now);
    return Array.from({ length: 7 }, (_, offset) => {
      const date = addDays(today, offset);
      const label =
        offset === 0 ? 'Today' : offset === 1 ? 'Tomorrow' : (WEEKDAY_NAMES[date.getDay()] ?? '');
      return { date, label };
    });
  }, [now]);

  const setDay = (day: Date) => {
    const base = value ?? withTime(now, 9, 0);
    onChange(withTime(day, base.getHours(), base.getMinutes()));
  };

  const setHour = (hour: number) => {
    const base = value ?? now;
    onChange(withTime(base, hour, 0));
  };

  const step = (minutes: number) => {
    haptics.tap();
    onChange(addMinutes(value ?? now, minutes));
  };

  return (
    <View style={styles.container}>
      {value ? (
        <View style={[styles.display, { backgroundColor: palette.card, borderColor: palette.border }]}>
          <PressableScale
            onPress={() => step(-STEP_MINUTES)}
            haptic="none"
            activeScale={0.88}
            accessibilityLabel={`${STEP_MINUTES} minutes earlier`}
            style={[styles.stepper, { backgroundColor: palette.surface }]}
          >
            <Ionicons name="remove" size={20} color={palette.textSecondary} />
          </PressableScale>

          <View style={styles.displayText}>
            <AppText variant="title">{formatTimeShort(value)}</AppText>
            <AppText variant="caption" tone="secondary">
              {isSameDay(value, now) ? 'Today' : formatFullDate(value)}
            </AppText>
          </View>

          <PressableScale
            onPress={() => step(STEP_MINUTES)}
            haptic="none"
            activeScale={0.88}
            accessibilityLabel={`${STEP_MINUTES} minutes later`}
            style={[styles.stepper, { backgroundColor: palette.surface }]}
          >
            <Ionicons name="add" size={20} color={palette.textSecondary} />
          </PressableScale>
        </View>
      ) : (
        <View style={[styles.display, { backgroundColor: palette.card, borderColor: palette.border }]}>
          <View style={styles.displayText}>
            <AppText variant="title">Someday</AppText>
            <AppText variant="caption" tone="secondary">
              Saved, but Bump will not notify you
            </AppText>
          </View>
        </View>
      )}

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        {days.map((day) => (
          <QuickTimeButton
            key={day.label}
            label={day.label}
            selected={value !== null && isSameDay(value, day.date)}
            onPress={() => setDay(day.date)}
          />
        ))}
      </ScrollView>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        {TIME_PRESETS.map((preset) => (
          <QuickTimeButton
            key={preset.label}
            label={preset.label}
            emoji={preset.emoji}
            selected={value !== null && value.getHours() === preset.hour && value.getMinutes() === 0}
            onPress={() => setHour(preset.hour)}
          />
        ))}
      </ScrollView>

      {allowSomeday ? (
        <QuickTimeButton
          label={value ? 'No specific time' : 'Pick a time instead'}
          emoji={value ? '🫧' : '🕐'}
          onPress={() => onChange(value ? null : withTime(addDays(now, 1), 9, 0))}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
  },
  display: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  displayText: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  stepper: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: {
    gap: spacing.sm,
    paddingRight: spacing.lg,
  },
});
