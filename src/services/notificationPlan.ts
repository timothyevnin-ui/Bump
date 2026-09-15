import { BumpInterval, Reminder } from '@/types/reminder';
import { MINUTE_MS } from '@/utils/date';

/**
 * Deciding *what* to schedule, with no reference to the OS.
 *
 * iOS keeps only 64 pending local notifications per app and silently drops the
 * rest. "Bump me until I do it" wants a chain of nudges per reminder, so slots
 * are treated as a budget:
 *
 *   1. Every timed reminder gets its own notification first — those are
 *      non-negotiable.
 *   2. What is left goes to Bump chains round-robin *by nudge index*, soonest
 *      reminder first. Under pressure everyone gets nudge #1 before anyone
 *      gets nudge #2, instead of one reminder eating the whole budget.
 *
 * Kept pure and separate from `notifications.ts` so the policy is testable.
 */

/** Leave headroom under the iOS 64-notification ceiling. */
export const MAX_SCHEDULED = 58;

/** How many follow-ups a single reminder may queue up. */
export const MAX_BUMPS_PER_REMINDER = 8;

export interface PlannedNotification {
  reminderId: string;
  /** 0 is the reminder itself; 1+ are Bump follow-ups. */
  nudgeIndex: number;
  fireAt: Date;
  reminder: Reminder;
  /** True when the OS repeat trigger can carry this one on its own. */
  repeating: boolean;
}

export interface NotificationPlan {
  scheduled: PlannedNotification[];
  /** Bumps we wanted but could not fit inside the budget. */
  droppedBumps: number;
}

/**
 * The OS can only express "every N units" for N = 1. Anything else (every
 * other Friday, every 3 days) falls back to a one-shot for the next
 * occurrence, which the next sync re-creates.
 */
export function canRepeatNatively(reminder: Reminder): boolean {
  return reminder.repeatRule !== null && reminder.repeatRule.interval === 1;
}

export function buildPlan(reminders: Reminder[], now: Date = new Date()): NotificationPlan {
  const candidates = reminders
    .filter((reminder) => reminder.status === 'active' && reminder.dueAt !== null)
    .sort((a, b) => new Date(a.dueAt as string).getTime() - new Date(b.dueAt as string).getTime());

  const scheduled: PlannedNotification[] = [];

  // Pass 1 — the reminders themselves.
  for (const reminder of candidates) {
    if (scheduled.length >= MAX_SCHEDULED) break;
    const dueAt = new Date(reminder.dueAt as string);
    const repeating = canRepeatNatively(reminder);
    // A one-shot whose moment has passed is already "overdue" in the UI; there
    // is nothing useful left to deliver.
    if (!repeating && dueAt.getTime() <= now.getTime()) continue;
    scheduled.push({ reminderId: reminder.id, nudgeIndex: 0, fireAt: dueAt, reminder, repeating });
  }

  // Pass 2 — Bump chains, round-robin by nudge index so the budget spreads.
  const bumpable = candidates.filter(
    (reminder) =>
      reminder.bumpEnabled &&
      reminder.bumpInterval !== null &&
      scheduled.some((item) => item.reminderId === reminder.id && item.nudgeIndex === 0),
  );

  let droppedBumps = 0;
  for (let nudgeIndex = 1; nudgeIndex <= MAX_BUMPS_PER_REMINDER; nudgeIndex += 1) {
    for (const reminder of bumpable) {
      const interval = reminder.bumpInterval as BumpInterval;
      const base = new Date(reminder.dueAt as string).getTime();
      const fireAt = new Date(base + nudgeIndex * interval * MINUTE_MS);
      if (fireAt.getTime() <= now.getTime()) continue;

      if (scheduled.length >= MAX_SCHEDULED) {
        droppedBumps += 1;
        continue;
      }
      scheduled.push({ reminderId: reminder.id, nudgeIndex, fireAt, reminder, repeating: false });
    }
  }

  return { scheduled, droppedBumps };
}
