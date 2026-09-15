import { Ionicons } from '@expo/vector-icons';
import React, { useCallback } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { PastelName, radius, softShadow, spacing, type } from '@/constants/theme';
import { usePalette } from '@/hooks/useTheme';
import { Reminder, SectionKey } from '@/types/reminder';
import { isOverdue } from '@/services/reminders';
import { describeRepeat, formatDueLabel, formatRelative } from '@/utils/date';
import { haptics } from '@/utils/haptics';
import { AppText } from '@/components/AppText';

/** Distance a swipe must travel before it commits. */
const ACTION_THRESHOLD = 92;

const SECTION_PASTEL: Record<SectionKey, PastelName> = {
  now: 'blush',
  laterToday: 'peach',
  upcoming: 'sky',
  someday: 'lilac',
};

export interface ReminderCardProps {
  reminder: Reminder;
  section: SectionKey;
  now: Date;
  onPress: (reminder: Reminder) => void;
  onComplete: (reminder: Reminder) => void;
  onSnooze: (reminder: Reminder) => void;
}

/**
 * A reminder as a soft pastel card.
 *
 * Swipe right to complete, swipe left to snooze. The gesture reveals a
 * coloured action layer underneath and ticks the taptic engine the moment it
 * crosses the commit threshold, so the outcome is known before you let go.
 */
export function ReminderCard({
  reminder,
  section,
  now,
  onPress,
  onComplete,
  onSnooze,
}: ReminderCardProps) {
  const palette = usePalette();
  const { width } = useWindowDimensions();

  const translateX = useSharedValue(0);
  const armed = useSharedValue(0);
  const pressed = useSharedValue(0);

  const overdue = isOverdue(reminder, now);
  const pastel = SECTION_PASTEL[section];
  const background = overdue ? palette.dangerSoft : palette.pastels[pastel];
  const ink = overdue ? palette.danger : palette.pastelInk[pastel];

  const handleComplete = useCallback(() => {
    haptics.success();
    onComplete(reminder);
  }, [onComplete, reminder]);

  const handleSnooze = useCallback(() => {
    haptics.commit();
    onSnooze(reminder);
  }, [onSnooze, reminder]);

  const handlePress = useCallback(() => {
    haptics.tap();
    onPress(reminder);
  }, [onPress, reminder]);

  const pan = Gesture.Pan()
    // Only take over once the movement is clearly horizontal, so the list
    // still scrolls normally.
    .activeOffsetX([-14, 14])
    .failOffsetY([-12, 12])
    .onUpdate((event) => {
      translateX.set(event.translationX);
      const past = Math.abs(event.translationX) > ACTION_THRESHOLD ? 1 : 0;
      if (past !== armed.get()) {
        armed.set(past);
        if (past === 1) runOnJS(haptics.threshold)();
      }
    })
    .onEnd((event) => {
      const distance = event.translationX;
      armed.set(0);

      if (distance > ACTION_THRESHOLD) {
        translateX.set(
          withTiming(width, { duration: 220 }, () => {
            runOnJS(handleComplete)();
          }),
        );
        return;
      }

      if (distance < -ACTION_THRESHOLD) {
        translateX.set(withSpring(0, { damping: 18, stiffness: 220 }));
        runOnJS(handleSnooze)();
        return;
      }

      translateX.set(withSpring(0, { damping: 20, stiffness: 260 }));
    });

  const tap = Gesture.Tap()
    .maxDistance(12)
    .onBegin(() => {
      pressed.set(withSpring(1, { damping: 20, stiffness: 400 }));
    })
    .onEnd((_event, success) => {
      if (success) runOnJS(handlePress)();
    })
    .onFinalize(() => {
      pressed.set(withSpring(0, { damping: 18, stiffness: 300 }));
    });

  // Exclusive gives the pan priority: once a swipe starts, the tap can no
  // longer fire, so completing a reminder never also opens it.
  const gesture = Gesture.Exclusive(pan, tap);

  const cardStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.get() },
      { scale: 1 - pressed.get() * 0.02 },
    ],
  }));

  const completeStyle = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.get(), [0, ACTION_THRESHOLD], [0, 1], 'clamp'),
    transform: [
      { scale: interpolate(translateX.get(), [0, ACTION_THRESHOLD], [0.7, 1], 'clamp') },
    ],
  }));

  const snoozeStyle = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.get(), [0, -ACTION_THRESHOLD], [0, 1], 'clamp'),
    transform: [
      { scale: interpolate(translateX.get(), [0, -ACTION_THRESHOLD], [0.7, 1], 'clamp') },
    ],
  }));

  const timeLabel =
    section === 'now' && reminder.dueAt
      ? formatRelative(new Date(reminder.dueAt), now)
      : formatDueLabel(reminder.dueAt, now);

  return (
    <View style={styles.wrapper}>
      {/* Action layers sit behind the card and are revealed by the swipe. */}
      <View style={[styles.actions, { backgroundColor: palette.successSoft }]}>
        <Animated.View style={[styles.actionBadge, completeStyle]}>
          <Ionicons name="checkmark-circle" size={26} color={palette.success} />
          <AppText variant="caption" color={palette.success}>
            Done
          </AppText>
        </Animated.View>
        <Animated.View style={[styles.actionBadge, snoozeStyle]}>
          <Ionicons name="time" size={26} color={palette.danger} />
          <AppText variant="caption" color={palette.danger}>
            Snooze
          </AppText>
        </Animated.View>
      </View>

      <GestureDetector gesture={gesture}>
        <Animated.View style={cardStyle}>
          <View
            accessible
            accessibilityRole="button"
            accessibilityLabel={`${reminder.title}, ${timeLabel}`}
            accessibilityHint="Opens the reminder. Swipe right to complete, left to snooze."
            onAccessibilityTap={handlePress}
            style={[styles.card, { backgroundColor: background }, softShadow(palette, 1)]}
          >
            <View style={[styles.emojiBubble, { backgroundColor: palette.card }]}>
              <AppText style={styles.emoji}>{reminder.emoji}</AppText>
            </View>

            <View style={styles.body}>
              <AppText variant="body" color={ink} numberOfLines={2} style={type.body}>
                {reminder.title}
              </AppText>
              <View style={styles.metaRow}>
                <AppText variant="caption" color={ink} style={styles.meta}>
                  {timeLabel}
                </AppText>
                {reminder.repeatRule ? (
                  <>
                    <AppText variant="caption" color={ink} style={styles.dot}>
                      ·
                    </AppText>
                    <AppText variant="caption" color={ink} style={styles.meta}>
                      {describeRepeat(reminder.repeatRule)}
                    </AppText>
                  </>
                ) : null}
              </View>
            </View>

            {reminder.bumpEnabled ? (
              <View style={[styles.bumpPill, { backgroundColor: palette.card }]}>
                <Ionicons name="notifications" size={12} color={ink} />
                <AppText variant="micro" color={ink}>
                  {formatBumpInterval(reminder.bumpInterval)}
                </AppText>
              </View>
            ) : null}
          </View>
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

function formatBumpInterval(minutes: number | null): string {
  if (!minutes) return 'BUMP';
  if (minutes < 60) return `${minutes}M`;
  return `${minutes / 60}H`;
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: spacing.md,
  },
  actions: {
    ...StyleSheet.absoluteFill,
    borderRadius: radius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
  },
  actionBadge: {
    alignItems: 'center',
    gap: 2,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    paddingRight: spacing.lg,
    borderRadius: radius.lg,
  },
  emojiBubble: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: {
    fontSize: 22,
    lineHeight: 28,
  },
  body: {
    flex: 1,
    gap: 2,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  meta: {
    opacity: 0.75,
  },
  dot: {
    opacity: 0.5,
  },
  bumpPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
});
