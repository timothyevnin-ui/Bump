import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { radius, spacing, type } from '@/constants/theme';
import { BumpInterval } from '@/types/reminder';
import { EMOJI_CHOICES } from '@/utils/emoji';
import { describeRepeat } from '@/utils/date';
import { haptics } from '@/utils/haptics';
import { AppText } from '@/components/AppText';
import { BumpToggle } from '@/components/BumpToggle';
import { Card } from '@/components/Card';
import { DueDateEditor } from '@/components/DueDateEditor';
import { PressableScale } from '@/components/PressableScale';
import { PrimaryButton } from '@/components/PrimaryButton';
import { useReminders } from '@/hooks/useReminders';
import { useSettings } from '@/hooks/useSettings';
import { usePalette } from '@/hooks/useTheme';

/**
 * Detail + edit for one reminder. Everything saves as you change it — there is
 * no Save button to forget to press.
 */
export default function ReminderDetailScreen() {
  const palette = usePalette();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getById, update, complete, remove, now } = useReminders();
  const { settings } = useSettings();
  const [emojiOpen, setEmojiOpen] = useState(false);

  const reminder = id ? getById(id) : undefined;

  if (!reminder) {
    return (
      <View style={[styles.missing, { backgroundColor: palette.background }]}>
        <AppText variant="title">That one is gone.</AppText>
        <AppText variant="bodySoft" tone="secondary" style={styles.missingBody}>
          It was completed or deleted.
        </AppText>
        <PrimaryButton label="Back to Today" onPress={() => router.back()} />
      </View>
    );
  }

  const dueAt = reminder.dueAt ? new Date(reminder.dueAt) : null;

  const confirmDelete = () => {
    Alert.alert('Delete this reminder?', reminder.title, [
      { text: 'Keep it', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          haptics.warning();
          remove(reminder.id);
          router.back();
        },
      },
    ]);
  };

  return (
    <KeyboardAvoidingView
      style={[styles.flex, { backgroundColor: palette.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + spacing.md, paddingBottom: insets.bottom + spacing.xxl },
        ]}
      >
        <View style={styles.header}>
          <PressableScale
            onPress={() => setEmojiOpen((open) => !open)}
            activeScale={0.9}
            accessibilityRole="button"
            accessibilityLabel="Change emoji"
            style={[styles.emojiBubble, { backgroundColor: palette.accentSoft }]}
          >
            <AppText style={styles.emoji}>{reminder.emoji}</AppText>
          </PressableScale>

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

        {emojiOpen ? (
          <View style={styles.emojiGrid}>
            {EMOJI_CHOICES.map((choice) => (
              <PressableScale
                key={choice}
                onPress={() => {
                  update(reminder.id, { emoji: choice });
                  setEmojiOpen(false);
                }}
                activeScale={0.85}
                accessibilityRole="button"
                accessibilityLabel={`Use ${choice}`}
                style={[
                  styles.emojiChoice,
                  {
                    backgroundColor:
                      choice === reminder.emoji ? palette.accentSoft : palette.surface,
                  },
                ]}
              >
                <AppText style={styles.emojiChoiceText}>{choice}</AppText>
              </PressableScale>
            ))}
          </View>
        ) : null}

        <TextInput
          value={reminder.title}
          onChangeText={(text) => update(reminder.id, { title: text })}
          multiline
          selectionColor={palette.accent}
          accessibilityLabel="Reminder title"
          style={[type.hero, styles.titleInput, { color: palette.text }]}
        />

        <Card padded={false} style={styles.card}>
          <View style={styles.cardInner}>
            <AppText variant="section" tone="tertiary" style={styles.cardLabel}>
              WHEN
            </AppText>
            <DueDateEditor
              value={dueAt}
              onChange={(next) =>
                update(reminder.id, { dueAt: next ? next.toISOString() : null })
              }
              now={now}
            />
            {reminder.repeatRule ? (
              <View style={[styles.repeatRow, { backgroundColor: palette.surface }]}>
                <Ionicons name="repeat" size={15} color={palette.textSecondary} />
                <AppText variant="caption" tone="secondary" style={styles.flex}>
                  {describeRepeat(reminder.repeatRule)}
                </AppText>
                <PressableScale
                  onPress={() => update(reminder.id, { repeatRule: null })}
                  activeScale={0.9}
                  accessibilityRole="button"
                  accessibilityLabel="Stop repeating"
                >
                  <AppText variant="caption" color={palette.accent}>
                    Stop
                  </AppText>
                </PressableScale>
              </View>
            ) : null}
          </View>
        </Card>

        {dueAt ? (
          <BumpToggle
            enabled={reminder.bumpEnabled}
            interval={(reminder.bumpInterval ?? settings.defaultBumpInterval) as BumpInterval}
            onToggle={(enabled) =>
              update(reminder.id, {
                bumpEnabled: enabled,
                bumpInterval: enabled
                  ? reminder.bumpInterval ?? settings.defaultBumpInterval
                  : null,
              })
            }
            onIntervalChange={(interval) => update(reminder.id, { bumpInterval: interval })}
          />
        ) : null}

        <Card padded={false} style={styles.card}>
          <View style={styles.cardInner}>
            <AppText variant="section" tone="tertiary" style={styles.cardLabel}>
              NOTES
            </AppText>
            <TextInput
              value={reminder.notes ?? ''}
              onChangeText={(text) => update(reminder.id, { notes: text })}
              placeholder="Anything else worth keeping with this?"
              placeholderTextColor={palette.textTertiary}
              multiline
              selectionColor={palette.accent}
              accessibilityLabel="Notes"
              style={[type.bodySoft, styles.notes, { color: palette.text }]}
            />
          </View>
        </Card>

        {reminder.bumpEnabled && reminder.notificationIds.length > 0 ? (
          <AppText variant="caption" tone="tertiary" style={styles.scheduleNote}>
            {reminder.notificationIds.length} nudge
            {reminder.notificationIds.length === 1 ? '' : 's'} queued. They stop the moment you mark
            this done.
          </AppText>
        ) : null}

        <PrimaryButton
          label="Mark as done"
          icon="checkmark-circle"
          onPress={() => {
            haptics.success();
            complete(reminder.id);
            router.back();
          }}
        />

        <PressableScale
          onPress={confirmDelete}
          activeScale={0.97}
          haptic="none"
          accessibilityRole="button"
          accessibilityLabel="Delete reminder"
          style={styles.delete}
        >
          <AppText variant="caption" color={palette.danger}>
            Delete reminder
          </AppText>
        </PressableScale>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  content: {
    paddingHorizontal: spacing.lg,
    gap: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  emojiBubble: {
    width: 62,
    height: 62,
    borderRadius: 31,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: {
    fontSize: 30,
    lineHeight: 38,
  },
  close: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emojiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  emojiChoice: {
    width: 44,
    height: 44,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emojiChoiceText: {
    fontSize: 20,
    lineHeight: 26,
  },
  titleInput: {
    padding: 0,
    marginBottom: -spacing.xs,
  },
  card: {
    overflow: 'hidden',
  },
  cardInner: {
    padding: spacing.md,
    gap: spacing.md,
  },
  cardLabel: {
    letterSpacing: 1,
  },
  repeatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
  },
  notes: {
    minHeight: 64,
    textAlignVertical: 'top',
    padding: 0,
  },
  scheduleNote: {
    textAlign: 'center',
    lineHeight: 18,
    marginTop: -spacing.sm,
  },
  delete: {
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  missing: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    padding: spacing.xl,
  },
  missingBody: {
    textAlign: 'center',
    marginBottom: spacing.md,
  },
});
