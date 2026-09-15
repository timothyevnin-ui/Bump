import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, LinearTransition } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { radius, spacing } from '@/constants/theme';
import { emptyState, rememberedSummary } from '@/services/copy';
import { formatDay, formatTimeShort } from '@/utils/date';
import { haptics } from '@/utils/haptics';
import { AppText } from '@/components/AppText';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { PressableScale } from '@/components/PressableScale';
import { useReminders } from '@/hooks/useReminders';
import { usePalette } from '@/hooks/useTheme';

/** Quiet by design — a record, not a scoreboard. */
export default function CompletedScreen() {
  const palette = usePalette();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { completed, weeklyCount, uncomplete, now } = useReminders();

  const empty = useMemo(() => emptyState('completed'), []);

  return (
    <View style={[styles.flex, { backgroundColor: palette.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + spacing.md, paddingBottom: insets.bottom + spacing.xxl },
        ]}
      >
        <View style={styles.header}>
          <View style={styles.headerText}>
            <AppText variant="title">Remembered</AppText>
            <AppText variant="caption" tone="secondary">
              {rememberedSummary(weeklyCount)}
            </AppText>
          </View>
          <PressableScale
            onPress={() => router.back()}
            activeScale={0.9}
            accessibilityRole="button"
            accessibilityLabel="Close"
            style={[styles.close, { backgroundColor: palette.surface }]}
          >
            <Ionicons name="close" size={20} color={palette.textSecondary} />
          </PressableScale>
        </View>

        {completed.length === 0 ? (
          <EmptyState emoji="✨" title={empty.title} body={empty.body} />
        ) : (
          completed.map((reminder) => (
            <Animated.View
              key={reminder.id}
              layout={LinearTransition.springify().damping(20).stiffness(180)}
              entering={FadeIn.duration(220)}
            >
              <Card style={styles.row} padded={false}>
                <View style={styles.rowInner}>
                  <View style={[styles.check, { backgroundColor: palette.successSoft }]}>
                    <Ionicons name="checkmark" size={16} color={palette.success} />
                  </View>
                  <View style={styles.rowText}>
                    <AppText variant="body" tone="secondary" numberOfLines={1}>
                      {reminder.emoji}{' '}
                      {/* Only the words get struck through — a crossed-out
                          emoji just looks broken. */}
                      <AppText variant="body" tone="secondary" style={styles.title}>
                        {reminder.title}
                      </AppText>
                    </AppText>
                    {reminder.completedAt ? (
                      <AppText variant="caption" tone="tertiary">
                        {formatDay(new Date(reminder.completedAt), now)} ·{' '}
                        {formatTimeShort(new Date(reminder.completedAt))}
                      </AppText>
                    ) : null}
                  </View>
                  <PressableScale
                    onPress={() => {
                      haptics.commit();
                      uncomplete(reminder.id);
                    }}
                    activeScale={0.88}
                    haptic="none"
                    accessibilityRole="button"
                    accessibilityLabel={`Put ${reminder.title} back`}
                    style={styles.undo}
                  >
                    <Ionicons name="arrow-undo" size={16} color={palette.textTertiary} />
                  </PressableScale>
                </View>
              </Card>
            </Animated.View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  content: {
    paddingHorizontal: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  headerText: {
    flex: 1,
    gap: 2,
  },
  close: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: {
    marginBottom: spacing.sm,
  },
  rowInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
  },
  check: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: {
    flex: 1,
    gap: 1,
  },
  title: {
    textDecorationLine: 'line-through',
  },
  undo: {
    width: 32,
    height: 32,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
