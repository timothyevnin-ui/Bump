import { advanceByRule, ParsedReminder } from '@/services/parser';
import {
  BumpInterval,
  Reminder,
  ReminderSection,
  Settings,
} from '@/types/reminder';
import { DAY_MS, HOUR_MS, endOfDay, startOfDay } from '@/utils/date';
import { createId } from '@/utils/id';

/**
 * Pure domain logic over reminders. No storage, no notifications, no React —
 * so the rules stay easy to follow and easy to test.
 */

/** Anything due within this window counts as "Now". */
export const NOW_WINDOW_MS = HOUR_MS;

export interface CreateReminderInput {
  title: string;
  dueAt: Date | null;
  repeatRule?: Reminder['repeatRule'];
  emoji?: string;
  notes?: string;
  bumpEnabled?: boolean;
  bumpInterval?: BumpInterval | null;
}

export function createReminder(input: CreateReminderInput, settings: Settings): Reminder {
  const bumpEnabled = input.bumpEnabled ?? false;
  return {
    id: createId(),
    title: input.title.trim() || 'Reminder',
    notes: input.notes,
    createdAt: new Date().toISOString(),
    dueAt: input.dueAt ? input.dueAt.toISOString() : null,
    completedAt: null,
    status: 'active',
    repeatRule: input.repeatRule ?? null,
    bumpEnabled,
    bumpInterval: bumpEnabled ? input.bumpInterval ?? settings.defaultBumpInterval : null,
    personality: settings.personality,
    notificationIds: [],
    emoji: input.emoji ?? '🔖',
    snoozeCount: 0,
  };
}

/** Bridges the parser's output into a stored reminder. */
export function reminderFromParse(
  parsed: ParsedReminder,
  settings: Settings,
  overrides: Partial<CreateReminderInput> = {},
): Reminder {
  return createReminder(
    {
      title: parsed.title,
      dueAt: parsed.dueAt,
      repeatRule: parsed.repeatRule,
      emoji: parsed.emoji,
      bumpEnabled: settings.bumpByDefault,
      bumpInterval: settings.defaultBumpInterval,
      ...overrides,
    },
    settings,
  );
}

export function isOverdue(reminder: Reminder, now = new Date()): boolean {
  if (reminder.status !== 'active' || !reminder.dueAt) return false;
  return new Date(reminder.dueAt).getTime() < now.getTime();
}

export function sectionFor(reminder: Reminder, now = new Date()): ReminderSection['key'] {
  if (!reminder.dueAt) return 'someday';
  const due = new Date(reminder.dueAt).getTime();
  if (due <= now.getTime() + NOW_WINDOW_MS) return 'now';
  if (due <= endOfDay(now).getTime()) return 'laterToday';
  return 'upcoming';
}

const SECTION_META: Record<ReminderSection['key'], { title: string; emoji: string }> = {
  now: { title: 'Now', emoji: '⚡️' },
  laterToday: { title: 'Later Today', emoji: '🌤' },
  upcoming: { title: 'Upcoming', emoji: '🗓' },
  someday: { title: 'Someday', emoji: '🫧' },
};

const SECTION_ORDER: ReminderSection['key'][] = ['now', 'laterToday', 'upcoming', 'someday'];

/** Groups active reminders for the Today screen. Empty sections are dropped. */
export function groupReminders(reminders: Reminder[], now = new Date()): ReminderSection[] {
  const buckets: Record<ReminderSection['key'], Reminder[]> = {
    now: [],
    laterToday: [],
    upcoming: [],
    someday: [],
  };

  for (const reminder of reminders) {
    if (reminder.status !== 'active') continue;
    buckets[sectionFor(reminder, now)].push(reminder);
  }

  for (const key of SECTION_ORDER) {
    buckets[key].sort(compareByDue);
  }

  return SECTION_ORDER.filter((key) => buckets[key].length > 0).map((key) => ({
    key,
    title: SECTION_META[key].title,
    emoji: SECTION_META[key].emoji,
    reminders: buckets[key],
  }));
}

function compareByDue(a: Reminder, b: Reminder): number {
  if (!a.dueAt && !b.dueAt) return b.createdAt.localeCompare(a.createdAt);
  if (!a.dueAt) return 1;
  if (!b.dueAt) return -1;
  return new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime();
}

/**
 * Completing a reminder.
 *
 * A repeating reminder produces two records: the completed occurrence (so the
 * Completed screen and the weekly count stay honest) and a fresh active one
 * for the next occurrence.
 */
export function completeReminder(reminder: Reminder, now = new Date()): Reminder[] {
  const completed: Reminder = {
    ...reminder,
    status: 'completed',
    completedAt: now.toISOString(),
    notificationIds: [],
  };

  if (!reminder.repeatRule || !reminder.dueAt) return [completed];

  let nextDue = advanceByRule(new Date(reminder.dueAt), reminder.repeatRule);
  // If the app was closed for a while, skip the occurrences that already went by.
  let guard = 0;
  while (nextDue.getTime() <= now.getTime() && guard < 500) {
    nextDue = advanceByRule(nextDue, reminder.repeatRule);
    guard += 1;
  }

  const next: Reminder = {
    ...reminder,
    id: createId(),
    createdAt: now.toISOString(),
    dueAt: nextDue.toISOString(),
    completedAt: null,
    status: 'active',
    notificationIds: [],
    snoozeCount: 0,
  };

  return [completed, next];
}

export function uncompleteReminder(reminder: Reminder): Reminder {
  return { ...reminder, status: 'active', completedAt: null };
}

/** Pushes a reminder back. Someday reminders get a concrete time instead. */
export function snoozeReminder(reminder: Reminder, minutes: number, now = new Date()): Reminder {
  const base = reminder.dueAt ? new Date(reminder.dueAt) : now;
  const from = base.getTime() > now.getTime() ? base : now;
  return {
    ...reminder,
    dueAt: new Date(from.getTime() + minutes * 60 * 1000).toISOString(),
    snoozeCount: reminder.snoozeCount + 1,
    notificationIds: [],
  };
}

export function completedThisWeek(reminders: Reminder[], now = new Date()): number {
  const weekAgo = startOfDay(now).getTime() - 6 * DAY_MS;
  return reminders.filter(
    (reminder) =>
      reminder.status === 'completed' &&
      reminder.completedAt !== null &&
      new Date(reminder.completedAt).getTime() >= weekAgo,
  ).length;
}

/** Completed reminders, newest first. */
export function completedReminders(reminders: Reminder[]): Reminder[] {
  return reminders
    .filter((reminder) => reminder.status === 'completed')
    .sort((a, b) => (b.completedAt ?? '').localeCompare(a.completedAt ?? ''));
}

export function activeCount(reminders: Reminder[]): number {
  return reminders.filter((reminder) => reminder.status === 'active').length;
}
