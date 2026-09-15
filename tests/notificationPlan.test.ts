import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { DEFAULT_SETTINGS, Reminder } from '../src/types/reminder';
import { createReminder } from '../src/services/reminders';
import {
  MAX_BUMPS_PER_REMINDER,
  MAX_SCHEDULED,
  buildPlan,
  canRepeatNatively,
} from '../src/services/notificationPlan';

const NOW = new Date(2025, 8, 15, 10, 0, 0, 0);

function make(overrides: Partial<Reminder> & { title: string }): Reminder {
  return {
    ...createReminder({ title: overrides.title, dueAt: null }, DEFAULT_SETTINGS),
    ...overrides,
  };
}

function inHours(hours: number): string {
  return new Date(NOW.getTime() + hours * 3600_000).toISOString();
}

describe('buildPlan — the reminders themselves', () => {
  it('schedules one notification per timed, active reminder', () => {
    const plan = buildPlan(
      [make({ title: 'a', dueAt: inHours(1) }), make({ title: 'b', dueAt: inHours(2) })],
      NOW,
    );
    assert.equal(plan.scheduled.length, 2);
    assert.ok(plan.scheduled.every((item) => item.nudgeIndex === 0));
  });

  it('skips Someday, completed, and already-passed reminders', () => {
    const plan = buildPlan(
      [
        make({ title: 'someday', dueAt: null }),
        make({ title: 'done', dueAt: inHours(1), status: 'completed' }),
        make({ title: 'passed', dueAt: inHours(-1) }),
        make({ title: 'real', dueAt: inHours(1) }),
      ],
      NOW,
    );
    assert.deepEqual(plan.scheduled.map((item) => item.reminder.title), ['real']);
  });

  it('keeps a repeating reminder scheduled even once its first time has passed', () => {
    const plan = buildPlan(
      [
        make({
          title: 'meds',
          dueAt: inHours(-2),
          repeatRule: { frequency: 'daily', interval: 1 },
        }),
      ],
      NOW,
    );
    assert.equal(plan.scheduled.length, 1);
    assert.equal(plan.scheduled[0]?.repeating, true);
  });
});

describe('buildPlan — Bump chains', () => {
  it('queues the full chain at the chosen interval', () => {
    const plan = buildPlan(
      [make({ title: 'rx', dueAt: inHours(1), bumpEnabled: true, bumpInterval: 60 })],
      NOW,
    );
    assert.equal(plan.scheduled.length, 1 + MAX_BUMPS_PER_REMINDER);

    const offsets = plan.scheduled.map(
      (item) => (item.fireAt.getTime() - new Date(inHours(1)).getTime()) / 3600_000,
    );
    assert.deepEqual(offsets, [0, 1, 2, 3, 4, 5, 6, 7, 8]);
  });

  it('escalates the nudge index so copy can get progressively more insistent', () => {
    const plan = buildPlan(
      [make({ title: 'rx', dueAt: inHours(1), bumpEnabled: true, bumpInterval: 30 })],
      NOW,
    );
    assert.deepEqual(
      plan.scheduled.map((item) => item.nudgeIndex),
      [0, 1, 2, 3, 4, 5, 6, 7, 8],
    );
  });

  it('never bumps a reminder that did not ask for it', () => {
    const plan = buildPlan([make({ title: 'plain', dueAt: inHours(1) })], NOW);
    assert.equal(plan.scheduled.length, 1);
  });

  it('drops bump nudges that would fire in the past', () => {
    const plan = buildPlan(
      [
        make({
          title: 'overdue repeat',
          dueAt: inHours(-5),
          repeatRule: { frequency: 'daily', interval: 1 },
          bumpEnabled: true,
          bumpInterval: 30,
        }),
      ],
      NOW,
    );
    assert.ok(plan.scheduled.every((item) => item.fireAt.getTime() > NOW.getTime() || item.repeating));
  });
});

describe('buildPlan — the iOS 64-notification budget', () => {
  const many = Array.from({ length: 20 }, (_, index) =>
    make({
      title: `r${index}`,
      dueAt: inHours(index + 1),
      bumpEnabled: true,
      bumpInterval: 60,
    }),
  );

  it('never exceeds the budget', () => {
    const plan = buildPlan(many, NOW);
    assert.equal(plan.scheduled.length, MAX_SCHEDULED);
    assert.ok(plan.droppedBumps > 0);
  });

  it('schedules every reminder before any follow-up', () => {
    const plan = buildPlan(many, NOW);
    const primaries = plan.scheduled.filter((item) => item.nudgeIndex === 0);
    assert.equal(primaries.length, many.length, 'all 20 reminders got their own notification');
  });

  it('spreads the remaining budget across reminders instead of draining it on one', () => {
    const plan = buildPlan(many, NOW);
    const bumpsPerReminder = new Map<string, number>();
    for (const item of plan.scheduled) {
      if (item.nudgeIndex === 0) continue;
      bumpsPerReminder.set(item.reminderId, (bumpsPerReminder.get(item.reminderId) ?? 0) + 1);
    }
    const counts = [...bumpsPerReminder.values()];
    assert.equal(counts.length, many.length, 'every reminder got at least one follow-up');
    assert.ok(Math.max(...counts) - Math.min(...counts) <= 1, 'chains differ by at most one nudge');
  });

  it('caps the primaries themselves when there are more reminders than slots', () => {
    const tooMany = Array.from({ length: 80 }, (_, index) =>
      make({ title: `r${index}`, dueAt: inHours(index + 1) }),
    );
    const plan = buildPlan(tooMany, NOW);
    assert.equal(plan.scheduled.length, MAX_SCHEDULED);
    // The soonest reminders are the ones that survive.
    assert.equal(plan.scheduled[0]?.reminder.title, 'r0');
  });
});

describe('canRepeatNatively', () => {
  it('accepts only intervals the OS trigger can express', () => {
    assert.equal(
      canRepeatNatively(make({ title: 'a', repeatRule: { frequency: 'daily', interval: 1 } })),
      true,
    );
    assert.equal(
      canRepeatNatively(make({ title: 'b', repeatRule: { frequency: 'weekly', interval: 2 } })),
      false,
    );
    assert.equal(canRepeatNatively(make({ title: 'c' })), false);
  });
});
