import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { PERSONALITIES } from '../src/types/reminder';
import { buildNotificationCopy, greeting, rememberedSummary } from '../src/services/copy';

describe('buildNotificationCopy', () => {
  it('is deterministic for a given reminder and nudge', () => {
    const a = buildNotificationCopy('Move laundry', 'friendly', 2, 'r_abc');
    const b = buildNotificationCopy('Move laundry', 'friendly', 2, 'r_abc');
    assert.deepEqual(a, b, 'rescheduling must not reshuffle the wording');
  });

  it('never repeats the same sentence across a chain', () => {
    for (const personality of PERSONALITIES) {
      const lines = Array.from({ length: 6 }, (_, index) =>
        buildNotificationCopy('Move laundry', personality, index, 'r_abc').title,
      );
      assert.equal(new Set(lines).size, lines.length, `${personality} repeated itself`);
    }
  });

  it('varies between reminders at the same nudge', () => {
    const seeds = ['r_1', 'r_2', 'r_3', 'r_4', 'r_5', 'r_6'];
    const lines = seeds.map((seed) => buildNotificationCopy('Thing', 'pushy', 1, seed).title);
    assert.ok(new Set(lines).size > 1, 'every reminder got identical copy');
  });

  it('always includes the reminder title', () => {
    for (const personality of PERSONALITIES) {
      for (let index = 0; index < 6; index += 1) {
        const copy = buildNotificationCopy('Pick up prescription', personality, index, 'seed');
        assert.ok(
          copy.title.includes('Pick up prescription'),
          `${personality} #${index} lost the title: ${copy.title}`,
        );
      }
    }
  });

  it('keeps the first notification clean and adds a hint to follow-ups', () => {
    assert.equal(buildNotificationCopy('Thing', 'normal', 0, 's').body, undefined);
    assert.ok(buildNotificationCopy('Thing', 'normal', 1, 's').body);
  });

  it('clamps past the last escalation stage instead of throwing', () => {
    const copy = buildNotificationCopy('Thing', 'unhinged', 99, 's');
    assert.ok(copy.title.includes('Thing'));
  });
});

describe('greeting', () => {
  it('matches the time of day', () => {
    assert.match(greeting(new Date(2025, 0, 1, 9)), /morning/);
    assert.match(greeting(new Date(2025, 0, 1, 14)), /afternoon/);
    assert.match(greeting(new Date(2025, 0, 1, 19)), /evening/);
    assert.match(greeting(new Date(2025, 0, 1, 23)), /night/i);
    assert.match(greeting(new Date(2025, 0, 1, 2)), /Still up/);
  });
});

describe('rememberedSummary', () => {
  it('handles zero, one and many', () => {
    assert.match(rememberedSummary(0), /Nothing remembered/);
    assert.match(rememberedSummary(1), /^1 thing /);
    assert.match(rememberedSummary(7), /^7 things /);
  });
});
