import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeOut, LinearTransition } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { radius, spacing } from '@/constants/theme';
import { emptyState, greeting, rememberedSummary } from '@/services/copy';
import { Reminder } from '@/types/reminder';
import { haptics } from '@/utils/haptics';
import { AppText } from '@/components/AppText';
import { ConfirmationSheet } from '@/components/ConfirmationSheet';
import { EmptyState } from '@/components/EmptyState';
import { PressableScale } from '@/components/PressableScale';
import { ReminderCard } from '@/components/ReminderCard';
import { ReminderInput } from '@/components/ReminderInput';
import { SectionHeader } from '@/components/SectionHeader';
import { useComposer } from '@/hooks/useComposer';
import { useReminders } from '@/hooks/useReminders';
import { useSettings } from '@/hooks/useSettings';
import { usePalette } from '@/hooks/useTheme';

export default function TodayScreen() {
  const palette = usePalette();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { settings } = useSettings();
  const { sections, now, weeklyCount, complete, snooze, reminders } = useReminders();
  const composer = useComposer();

  // Re-rolled only when the list empties, so the copy does not flicker.
  const hasAnything = reminders.some((reminder) => reminder.status === 'active');
  const empty = useMemo(() => emptyState('all'), [hasAnything]); // eslint-disable-line react-hooks/exhaustive-deps

  const openReminder = (reminder: Reminder) => {
    router.push({ pathname: '/reminder/[id]', params: { id: reminder.id } });
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
    >
      <ScrollView
        style={styles.flex}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + spacing.lg, paddingBottom: spacing.xxl },
        ]}
      >
        <View style={styles.header}>
          <View style={styles.headerText}>
            <AppText variant="hero">{greeting(now)}</AppText>
            <AppText variant="bodySoft" tone="secondary" style={styles.subtitle}>
              What do you need to remember?
            </AppText>
          </View>

          <PressableScale
            onPress={() => router.push('/completed')}
            activeScale={0.92}
            accessibilityRole="button"
            accessibilityLabel={`Completed. ${rememberedSummary(weeklyCount)}`}
            style={[styles.completedButton, { backgroundColor: palette.successSoft }]}
          >
            <Ionicons name="checkmark-done" size={18} color={palette.success} />
            <AppText variant="micro" color={palette.success}>
              {weeklyCount}
            </AppText>
          </PressableScale>
        </View>

        <ReminderInput
          value={composer.text}
          onChangeText={composer.setText}
          onSubmit={composer.submit}
          onQuickTime={composer.submitWithQuickTime}
          preview={composer.preview}
        />

        {sections.length === 0 ? (
          <EmptyState emoji="🫧" title={empty.title} body={empty.body} />
        ) : (
          sections.map((section) => (
            <Animated.View
              key={section.key}
              layout={LinearTransition.springify().damping(20).stiffness(180)}
              entering={FadeIn.duration(220)}
              exiting={FadeOut.duration(160)}
            >
              <SectionHeader
                title={section.title}
                emoji={section.emoji}
                count={section.reminders.length}
                accent={section.key === 'now'}
              />
              {section.reminders.map((reminder) => (
                <Animated.View
                  key={reminder.id}
                  layout={LinearTransition.springify().damping(20).stiffness(180)}
                  entering={FadeIn.duration(240)}
                  exiting={FadeOut.duration(180)}
                >
                  <ReminderCard
                    reminder={reminder}
                    section={section.key}
                    now={now}
                    onPress={openReminder}
                    onComplete={(item) => complete(item.id)}
                    onSnooze={(item) => snooze(item.id)}
                  />
                </Animated.View>
              ))}
            </Animated.View>
          ))
        )}

        {sections.length > 0 ? (
          <PressableScale
            onPress={() => {
              haptics.tap();
              router.push('/completed');
            }}
            activeScale={0.98}
            accessibilityRole="button"
            style={[styles.completedRow, { backgroundColor: palette.surface }]}
          >
            <AppText variant="caption" tone="secondary">
              {rememberedSummary(weeklyCount)}
            </AppText>
            <Ionicons name="chevron-forward" size={15} color={palette.textTertiary} />
          </PressableScale>
        ) : null}
      </ScrollView>

      <ConfirmationSheet
        visible={composer.pending !== null}
        parsed={composer.pending}
        now={now}
        defaultBumpEnabled={settings.bumpByDefault}
        defaultBumpInterval={settings.defaultBumpInterval}
        onConfirm={composer.confirm}
        onCancel={composer.cancel}
      />
    </KeyboardAvoidingView>
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
    alignItems: 'flex-start',
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  headerText: {
    flex: 1,
  },
  subtitle: {
    marginTop: spacing.xs,
  },
  completedButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
  },
  completedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    marginTop: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radius.pill,
  },
});
