import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { parseReminderText } from '../src/services/parser';

/** Monday 15 September 2025, 10:00 local time. */
const NOW = new Date(2025, 8, 15, 10, 0, 0, 0);

function parse(text: string, now: Date = NOW) {
  return parseReminderText(text, { now, startOfDayHour: 8 });
}

function iso(result: ReturnType<typeof parse>) {
  const due = result.dueAt;
  if (!due) return null;
  return `${due.getFullYear()}-${String(due.getMonth() + 1).padStart(2, '0')}-${String(
    due.getDate(),
  ).padStart(2, '0')} ${String(due.getHours()).padStart(2, '0')}:${String(due.getMinutes()).padStart(2, '0')}`;
}

describe('parseReminderText — the examples from the product spec', () => {
  it('Call Dad tomorrow at 2', () => {
    const result = parse('Call Dad tomorrow at 2');
    assert.equal(result.title, 'Call Dad');
    assert.equal(iso(result), '2025-09-16 14:00');
    assert.equal(result.confidence, 'high');
    assert.equal(result.emoji, '📞');
  });

  it('Gym at 5pm', () => {
    const result = parse('Gym at 5pm');
    assert.equal(result.title, 'Gym');
    assert.equal(iso(result), '2025-09-15 17:00');
    assert.equal(result.confidence, 'high');
  });

  it('Laundry in 45 minutes', () => {
    const result = parse('Laundry in 45 minutes');
    assert.equal(result.title, 'Laundry');
    assert.equal(iso(result), '2025-09-15 10:45');
    assert.equal(result.confidence, 'high');
  });

  it('Cancel subscription next Friday', () => {
    const result = parse('Cancel subscription next Friday');
    assert.equal(result.title, 'Cancel subscription');
    assert.equal(iso(result), '2025-09-19 09:00');
    assert.equal(result.confidence, 'medium', 'no time given, so we ask');
  });

  it('Text Sarah Monday morning', () => {
    const result = parse('Text Sarah Monday morning');
    assert.equal(result.title, 'Text Sarah');
    assert.equal(iso(result), '2025-09-22 09:00');
    assert.equal(result.confidence, 'high');
  });

  it('Take medication every morning at 8', () => {
    const result = parse('Take medication every morning at 8');
    assert.equal(result.title, 'Take medication');
    assert.deepEqual(result.repeatRule, { frequency: 'daily', interval: 1 });
    assert.equal(iso(result), '2025-09-16 08:00', '8am today has passed');
  });

  it('Pay rent on October 1st', () => {
    const result = parse('Pay rent on October 1st');
    assert.equal(result.title, 'Pay rent');
    assert.equal(iso(result), '2025-10-01 09:00');
    assert.equal(result.emoji, '💸');
  });
});

describe('parseReminderText — the rotating placeholders', () => {
  it('Call Mom Sunday afternoon', () => {
    const result = parse('Call Mom Sunday afternoon');
    assert.equal(result.title, 'Call Mom');
    assert.equal(iso(result), '2025-09-21 14:00');
    assert.equal(result.confidence, 'high');
  });

  it('Cancel Hulu next Thursday', () => {
    const result = parse('Cancel Hulu next Thursday');
    assert.equal(result.title, 'Cancel Hulu');
    assert.equal(iso(result), '2025-09-18 09:00');
  });

  it('Take chicken out at 4', () => {
    const result = parse('Take chicken out at 4');
    assert.equal(result.title, 'Take chicken out');
    assert.equal(iso(result), '2025-09-15 16:00');
  });

  it('Bring passport Friday morning', () => {
    const result = parse('Bring passport Friday morning');
    assert.equal(result.title, 'Bring passport');
    assert.equal(iso(result), '2025-09-19 09:00');
    assert.equal(result.emoji, '🛂');
  });

  it('Move laundry in 45 minutes', () => {
    const result = parse('Move laundry in 45 minutes');
    assert.equal(result.title, 'Move laundry');
    assert.equal(iso(result), '2025-09-15 10:45');
  });
});

describe('parseReminderText — time disambiguation', () => {
  it('prefers the afternoon for small bare hours', () => {
    assert.equal(iso(parse('Coffee at 3')), '2025-09-15 15:00');
  });

  it('prefers the next occurrence for ambiguous hours', () => {
    assert.equal(iso(parse('Standup at 9')), '2025-09-15 21:00', '9am already passed');
    assert.equal(
      iso(parse('Standup at 9', new Date(2025, 8, 15, 6, 0))),
      '2025-09-15 09:00',
      'still morning',
    );
  });

  it('understands noon and midnight', () => {
    assert.equal(iso(parse('Lunch at noon')), '2025-09-15 12:00');
    assert.equal(iso(parse('Log off at midnight')), '2025-09-16 00:00');
  });

  it('understands 24-hour and minute-precise times', () => {
    assert.equal(iso(parse('Call at 17:30')), '2025-09-15 17:30');
    assert.equal(iso(parse('Call at 7:05am')), '2025-09-16 07:05');
  });

  it('rolls an implied day forward when the time has passed', () => {
    assert.equal(iso(parse('Gym at 7am')), '2025-09-16 07:00');
  });

  it('respects an explicit day even when the time has passed', () => {
    assert.equal(iso(parse('Gym today at 7am')), '2025-09-15 07:00');
  });
});

describe('parseReminderText — durations', () => {
  it('handles spelled-out amounts', () => {
    assert.equal(iso(parse('Tea in ten minutes')), '2025-09-15 10:10');
    assert.equal(iso(parse('Stretch in an hour')), '2025-09-15 11:00');
    assert.equal(iso(parse('Check oven in half an hour')), '2025-09-15 10:30');
  });

  it('handles longer units', () => {
    assert.equal(iso(parse('Follow up in 3 days')), '2025-09-18 10:00');
    assert.equal(iso(parse('Renew in 2 weeks')), '2025-09-29 10:00');
  });
});

describe('parseReminderText — recurrence', () => {
  it('every Monday', () => {
    const result = parse('Standup every Monday at 9:30am');
    assert.deepEqual(result.repeatRule, { frequency: 'weekly', interval: 1, weekday: 1 });
    assert.equal(iso(result), '2025-09-22 09:30', 'today 9:30 already passed');
    assert.equal(result.title, 'Standup');
  });

  it('every other Friday', () => {
    const result = parse('Payday every other Friday');
    assert.deepEqual(result.repeatRule, { frequency: 'weekly', interval: 2, weekday: 5 });
  });

  it('every 2 weeks', () => {
    const result = parse('Water plants every 2 weeks');
    assert.deepEqual(result.repeatRule, { frequency: 'weekly', interval: 2 });
    assert.equal(result.title, 'Water plants');
  });

  it('daily adverb', () => {
    const result = parse('Journal daily at 9pm');
    assert.deepEqual(result.repeatRule, { frequency: 'daily', interval: 1 });
    assert.equal(iso(result), '2025-09-15 21:00');
  });
});

describe('parseReminderText — titles', () => {
  it('strips conversational lead-ins', () => {
    assert.equal(parse('remind me to call the dentist tomorrow').title, 'Call the dentist');
    assert.equal(parse("don't let me forget to pay rent on the 1st").title, 'Pay rent');
    assert.equal(parse('I need to book a haircut').title, 'Book a haircut');
  });

  it('leaves untimed text alone and marks it Someday', () => {
    const result = parse('Book haircut');
    assert.equal(result.title, 'Book haircut');
    assert.equal(result.dueAt, null);
    assert.equal(result.confidence, 'low');
  });

  it('never returns an empty title', () => {
    assert.equal(parse('tomorrow at 5').title, 'Tomorrow at 5');
  });

  it('handles an empty input safely', () => {
    const result = parse('   ');
    assert.equal(result.title, '');
    assert.equal(result.dueAt, null);
  });
});
