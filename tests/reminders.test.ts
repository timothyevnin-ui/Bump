import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { DEFAULT_SETTINGS, Reminder, Settings } from '../src/types/reminder';
import {
  completeReminder,
  completedThisWeek,
  createReminder,
  groupReminders,
  isOverdue,
  sectionFor,
  snoozeReminder,
} from '../src/services/reminders';

const NOW = new Date(2025, 8, 15, 10, 0, 0, 0);
const settings: Settings = { ...DEFAULT_SETTINGS };

function make(overrides: Partial<Reminder> & { title: string }): Reminder {
  return {
    ...createReminder({ title: overrides.title, dueAt: null }, settings),
    ...overrides,
  };
}

function at(hours: number, minutes = 0): string {
  return new Date(NOW.getTime() + hours * 3600_000 + minutes * 60_000).toISOString();
}

describe('sectionFor', () => {
  it('puts anything within the hour — including overdue — in Now', () => {
    assert.equal(sectionFor(make({ title: 'a', dueAt: at(-3) }), NOW), 'now');
    assert.equal(sectionFor(make({ title: 'b', dueAt: at(0.5) }), NOW), 'now');
  });

  it('separates later today from upcoming at midnight', () => {
    assert.equal(sectionFor(make({ title: 'c', dueAt: at(5) }), NOW), 'laterToday');
    assert.equal(sectionFor(make({ title: 'd', dueAt: at(20) }), NOW), 'upcoming');
  });

  it('files untimed reminders under Someday', () => {
    assert.equal(sectionFor(make({ title: 'e', dueAt: null }), NOW), 'someday');
  });
});

describe('groupReminders', () => {
  const reminders = [
    make({ title: 'Upcoming', dueAt: at(30) }),
    make({ title: 'Someday', dueAt: null }),
    make({ title: 'Overdue', dueAt: at(-2) }),
    make({ title: 'Soon', dueAt: at(0.25) }),
    make({ title: 'Later', dueAt: at(6) }),
    make({ title: 'Done', dueAt: at(1), status: 'completed', completedAt: at(0) }),
  ];

  it('drops empty sections and keeps the fixed order', () => {
    const sections = groupReminders(reminders, NOW);
    assert.deepEqual(
      sections.map((section) => section.key),
      ['now', 'laterToday', 'upcoming', 'someday'],
    );
  });

  it('sorts each section by due time, oldest first', () => {
    const [now] = groupReminders(reminders, NOW);
    assert.deepEqual(now?.reminders.map((reminder) => reminder.title), ['Overdue', 'Soon']);
  });

  it('excludes completed reminders', () => {
    const titles = groupReminders(reminders, NOW).flatMap((section) =>
      section.reminders.map((reminder) => reminder.title),
    );
    assert.ok(!titles.includes('Done'));
  });
});

describe('completeReminder', () => {
  it('marks a one-off as completed and clears its notifications', () => {
    const reminder = make({ title: 'Once', dueAt: at(1), notificationIds: ['n1', 'n2'] });
    const produced = completeReminder(reminder, NOW);
    assert.equal(produced.length, 1);
    assert.equal(produced[0]?.status, 'completed');
    assert.deepEqual(produced[0]?.notificationIds, []);
  });

  it('keeps a repeating reminder alive at its next occurrence', () => {
    const reminder = make({
      title: 'Meds',
      dueAt: at(-1),
      repeatRule: { frequency: 'daily', interval: 1 },
    });
    const [completed, next] = completeReminder(reminder, NOW);
    assert.equal(completed?.status, 'completed');
    assert.equal(next?.status, 'active');
    assert.notEqual(next?.id, reminder.id, 'the next occurrence is its own record');
    assert.equal(new Date(next?.dueAt as string).getTime(), new Date(at(23)).getTime());
  });

  it('skips occurrences missed while the app was closed', () => {
    const reminder = make({
      title: 'Meds',
      dueAt: new Date(NOW.getTime() - 5 * 24 * 3600_000).toISOString(),
      repeatRule: { frequency: 'daily', interval: 1 },
    });
    const [, next] = completeReminder(reminder, NOW);
    assert.ok(new Date(next?.dueAt as string).getTime() > NOW.getTime());
  });
});

describe('snoozeReminder', () => {
  it('pushes a future reminder back from its own due time', () => {
    const reminder = make({ title: 'Later', dueAt: at(2) });
    const snoozed = snoozeReminder(reminder, 15, NOW);
    assert.equal(new Date(snoozed.dueAt as string).getTime(), new Date(at(2, 15)).getTime());
    assert.equal(snoozed.snoozeCount, 1);
  });

  it('pushes an overdue reminder back from now, not from the past', () => {
    const reminder = make({ title: 'Missed', dueAt: at(-3) });
    const snoozed = snoozeReminder(reminder, 15, NOW);
    assert.equal(new Date(snoozed.dueAt as string).getTime(), new Date(at(0, 15)).getTime());
  });

  it('gives a Someday reminder a real time', () => {
    const snoozed = snoozeReminder(make({ title: 'Vague', dueAt: null }), 30, NOW);
    assert.equal(new Date(snoozed.dueAt as string).getTime(), new Date(at(0, 30)).getTime());
  });
});

describe('completedThisWeek', () => {
  it('counts the last seven days only', () => {
    const reminders = [
      make({ title: 'a', status: 'completed', completedAt: at(-2) }),
      make({ title: 'b', status: 'completed', completedAt: at(-24 * 3) }),
      make({ title: 'c', status: 'completed', completedAt: at(-24 * 9) }),
      make({ title: 'd', status: 'active' }),
    ];
    assert.equal(completedThisWeek(reminders, NOW), 2);
  });
});

describe('isOverdue', () => {
  it('ignores completed and untimed reminders', () => {
    assert.equal(isOverdue(make({ title: 'a', dueAt: at(-1) }), NOW), true);
    assert.equal(isOverdue(make({ title: 'b', dueAt: at(1) }), NOW), false);
    assert.equal(isOverdue(make({ title: 'c', dueAt: null }), NOW), false);
    assert.equal(
      isOverdue(make({ title: 'd', dueAt: at(-1), status: 'completed' }), NOW),
      false,
    );
  });
});
