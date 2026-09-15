import { useCallback, useMemo, useState } from 'react';
import { QuickTime } from '@/constants/quickTimes';
import { ParsedReminder, parseReminderText } from '@/services/parser';
import { Reminder } from '@/types/reminder';
import { describeRepeat, formatDueLabel } from '@/utils/date';
import { haptics } from '@/utils/haptics';
import { ConfirmationResult } from '@/components/ConfirmationSheet';
import { useReminders } from '@/hooks/useReminders';
import { useSettings } from '@/hooks/useSettings';

/**
 * Wires the input box to the parser and the store.
 *
 * Confident parses become reminders immediately; anything less opens the
 * confirmation sheet with the guess pre-filled. Shared by the home screen and
 * the full-screen composer so both behave identically.
 */
export function useComposer(onCreated?: (reminder: Reminder) => void) {
  const { settings } = useSettings();
  const { add } = useReminders();
  const [text, setText] = useState('');
  const [pending, setPending] = useState<ParsedReminder | null>(null);

  const parseNow = useCallback(
    (value: string) =>
      parseReminderText(value, { now: new Date(), startOfDayHour: settings.startOfDayHour }),
    [settings.startOfDayHour],
  );

  // Live hint under the input. Only shown when we would create without asking,
  // so it never promises something the confirmation sheet might change.
  const preview = useMemo(() => {
    if (text.trim().length < 3) return null;
    const parsed = parseReminderText(text, {
      now: new Date(),
      startOfDayHour: settings.startOfDayHour,
    });
    if (parsed.confidence !== 'high' || !parsed.dueAt) return null;
    const when = formatDueLabel(parsed.dueAt.toISOString());
    return parsed.repeatRule ? `${when} · ${describeRepeat(parsed.repeatRule)}` : when;
  }, [text, settings.startOfDayHour]);

  const create = useCallback(
    (parsed: ParsedReminder, overrides: Partial<ConfirmationResult> = {}) => {
      const dueAt = overrides.dueAt !== undefined ? overrides.dueAt : parsed.dueAt;
      const bumpEnabled = overrides.bumpEnabled ?? (dueAt ? settings.bumpByDefault : false);
      const reminder = add({
        title: parsed.title,
        dueAt,
        repeatRule: parsed.repeatRule,
        emoji: parsed.emoji,
        bumpEnabled,
        bumpInterval: overrides.bumpInterval ?? settings.defaultBumpInterval,
      });
      setText('');
      setPending(null);
      haptics.success();
      onCreated?.(reminder);
      return reminder;
    },
    [add, onCreated, settings.bumpByDefault, settings.defaultBumpInterval],
  );

  const submit = useCallback(() => {
    const trimmed = text.trim();
    if (!trimmed) return;
    const parsed = parseNow(trimmed);
    if (parsed.confidence === 'high') {
      create(parsed);
      return;
    }
    haptics.tap();
    setPending(parsed);
  }, [text, parseNow, create]);

  /** "Laundry" + "In 30 min" — the preset wins over anything in the text. */
  const submitWithQuickTime = useCallback(
    (quick: QuickTime) => {
      const trimmed = text.trim();
      if (!trimmed) return;
      const parsed = parseNow(trimmed);
      create(parsed, { dueAt: quick.resolve(new Date(), settings.startOfDayHour) });
    },
    [text, parseNow, create, settings.startOfDayHour],
  );

  const confirm = useCallback(
    (result: ConfirmationResult) => {
      if (!pending) return;
      create(pending, result);
    },
    [pending, create],
  );

  const cancel = useCallback(() => setPending(null), []);

  return {
    text,
    setText,
    preview,
    pending,
    submit,
    submitWithQuickTime,
    confirm,
    cancel,
  };
}
