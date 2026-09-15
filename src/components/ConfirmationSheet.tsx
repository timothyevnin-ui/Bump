import React, { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { spacing } from '@/constants/theme';
import { usePalette } from '@/hooks/useTheme';
import { BumpInterval } from '@/types/reminder';
import { ParsedReminder } from '@/services/parser';
import { AppText } from '@/components/AppText';
import { BumpToggle } from '@/components/BumpToggle';
import { DueDateEditor } from '@/components/DueDateEditor';
import { PrimaryButton } from '@/components/PrimaryButton';
import { Sheet } from '@/components/Sheet';

export interface ConfirmationResult {
  dueAt: Date | null;
  bumpEnabled: boolean;
  bumpInterval: BumpInterval;
}

export interface ConfirmationSheetProps {
  visible: boolean;
  parsed: ParsedReminder | null;
  now: Date;
  defaultBumpEnabled: boolean;
  defaultBumpInterval: BumpInterval;
  onConfirm: (result: ConfirmationResult) => void;
  onCancel: () => void;
}

/**
 * Shown when the parser is not confident — it guessed a day but not a time, or
 * found no time signal at all. The guess is pre-filled and one tap away from
 * being accepted, so the uncertain path still takes about two seconds.
 */
export function ConfirmationSheet({
  visible,
  parsed,
  now,
  defaultBumpEnabled,
  defaultBumpInterval,
  onConfirm,
  onCancel,
}: ConfirmationSheetProps) {
  if (!parsed) return null;
  return (
    <Sheet visible={visible} onClose={onCancel}>
      {/* Keyed on the parse so each new draft starts from its own guess
          instead of inheriting the previous sheet's edits. */}
      <ConfirmationBody
        key={`${parsed.title}|${parsed.dueAt?.toISOString() ?? 'someday'}`}
        parsed={parsed}
        now={now}
        defaultBumpEnabled={defaultBumpEnabled}
        defaultBumpInterval={defaultBumpInterval}
        onConfirm={onConfirm}
        onCancel={onCancel}
      />
    </Sheet>
  );
}

function ConfirmationBody({
  parsed,
  now,
  defaultBumpEnabled,
  defaultBumpInterval,
  onConfirm,
  onCancel,
}: Omit<ConfirmationSheetProps, 'visible' | 'parsed'> & { parsed: ParsedReminder }) {
  const palette = usePalette();
  const [dueAt, setDueAt] = useState<Date | null>(parsed.dueAt);
  const [bumpEnabled, setBumpEnabled] = useState(defaultBumpEnabled);
  const [bumpInterval, setBumpInterval] = useState<BumpInterval>(defaultBumpInterval);

  const prompt =
    parsed.confidence === 'low'
      ? 'When should Bump remind you?'
      : 'Got the day — what time works?';

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={styles.content}
    >
      <View style={styles.header}>
        <AppText style={styles.emoji}>{parsed.emoji}</AppText>
        <View style={styles.headerText}>
          <AppText variant="title" numberOfLines={2}>
            {parsed.title}
          </AppText>
          <AppText variant="caption" tone="secondary">
            {prompt}
          </AppText>
        </View>
      </View>

      <DueDateEditor value={dueAt} onChange={setDueAt} now={now} />

      {dueAt ? (
        <BumpToggle
          enabled={bumpEnabled}
          interval={bumpInterval}
          onToggle={setBumpEnabled}
          onIntervalChange={setBumpInterval}
          compact
        />
      ) : null}

      <PrimaryButton
        label={dueAt ? 'Remind me' : 'Save for someday'}
        icon="checkmark"
        onPress={() => onConfirm({ dueAt, bumpEnabled: dueAt ? bumpEnabled : false, bumpInterval })}
      />
      <PrimaryButton label="Cancel" variant="quiet" onPress={onCancel} style={styles.cancel} />

      {parsed.matched.length > 0 ? (
        <AppText variant="caption" color={palette.textTertiary} style={styles.readAs}>
          Read “{parsed.matched.join('”, “')}” from what you typed
        </AppText>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.lg,
    paddingBottom: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  emoji: {
    fontSize: 34,
    lineHeight: 42,
  },
  headerText: {
    flex: 1,
    gap: 2,
  },
  cancel: {
    height: 46,
    marginTop: -spacing.sm,
  },
  readAs: {
    textAlign: 'center',
  },
});
