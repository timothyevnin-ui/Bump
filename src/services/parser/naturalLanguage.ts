import { RepeatRule } from '@/types/reminder';
import {
  addDays,
  addMinutes,
  addMonths,
  daysInMonth,
  isSameDay,
  nextWeekday,
  startOfDay,
  withTime,
} from '@/utils/date';
import { pickEmoji } from '@/utils/emoji';
import { Scanner } from './scanner';
import {
  DANGLING_WORDS,
  DURATION_UNITS,
  DayPart,
  MONTH_LOOKUP,
  MONTH_PATTERN,
  NUMBER_WORD_PATTERN,
  REPEAT_UNIT_TO_FREQUENCY,
  TITLE_PREFIXES,
  WEEKDAY_LOOKUP,
  WEEKDAY_PATTERN,
  dayPartHour,
  toNumber,
} from './vocabulary';

/**
 * How sure we are that the user would recognise the result as what they meant.
 *
 * - `high`   — they gave us a time (or a relative duration). Create it silently.
 * - `medium` — they gave us a day but no time; we guessed one. Confirm first.
 * - `low`    — no temporal signal at all. Offer "Someday" or a quick time.
 */
export type ParseConfidence = 'high' | 'medium' | 'low';

export interface ParsedReminder {
  title: string;
  dueAt: Date | null;
  repeatRule: RepeatRule | null;
  confidence: ParseConfidence;
  emoji: string;
  /** The phrases we interpreted, for the "we read this as…" hint in the sheet. */
  matched: string[];
}

export interface ParseOptions {
  /** Injectable clock — the unit tests freeze this. */
  now?: Date;
  /** The user's "start of day" setting; shifts what "morning" means. */
  startOfDayHour?: number;
}

const HOUR_WORDS: Record<string, number> = {
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
};

const HOUR_WORD_PATTERN = Object.keys(HOUR_WORDS).join('|');
const MERIDIEM = '((?:a|p)\\.?m\\.?(?![a-z]))';

interface Draft {
  offsetMinutes: number | null;
  anchorDay: Date | null;
  /** True when the day came from the text rather than defaulting to today. */
  anchorExplicit: boolean;
  /**
   * A bare weekday ("Monday", "every Friday") whose resolution depends on the
   * time: today counts only if the time has not passed yet.
   */
  pendingWeekday: number | null;
  hour: number | null;
  minute: number;
  /** Set when the hour had no am/pm and needs disambiguating. */
  hourIsBare: boolean;
  dayPart: DayPart | null;
  repeatRule: RepeatRule | null;
  matched: string[];
}

/**
 * Turns "Call Dad tomorrow at 2" into a structured reminder.
 *
 * This is the only place natural language is interpreted. Swapping it for an
 * LLM later means reimplementing `parseReminderText` with the same signature —
 * nothing else in the app reaches into these internals.
 */
export function parseReminderText(input: string, options: ParseOptions = {}): ParsedReminder {
  const now = options.now ?? new Date();
  const startOfDayHour = options.startOfDayHour ?? 8;
  const text = input.trim().replace(/\s+/g, ' ');

  if (!text) {
    return { title: '', dueAt: null, repeatRule: null, confidence: 'low', emoji: '🔖', matched: [] };
  }

  const scanner = new Scanner(text);
  const draft: Draft = {
    offsetMinutes: null,
    anchorDay: null,
    anchorExplicit: false,
    pendingWeekday: null,
    hour: null,
    minute: 0,
    hourIsBare: false,
    dayPart: null,
    repeatRule: null,
    matched: [],
  };

  readRecurrence(scanner, draft, now);
  readDuration(scanner, draft);
  readCalendarDate(scanner, draft, now);
  readDayReference(scanner, draft, now);
  readClockTime(scanner, draft);
  readDayPart(scanner, draft);

  const title = extractTitle(scanner.remainder()) || fallbackTitle(text);
  const { dueAt, confidence } = resolveDueDate(draft, now, startOfDayHour);

  return {
    title,
    dueAt,
    repeatRule: draft.repeatRule,
    confidence,
    emoji: pickEmoji(title || text),
    matched: draft.matched,
  };
}

/* ------------------------------------------------------------------ rules */

function readRecurrence(scanner: Scanner, draft: Draft, now: Date) {
  // "every Monday", "every other Friday"
  const weekly = scanner.consume(new RegExp(`\\bevery\\s+(other\\s+)?(${WEEKDAY_PATTERN})\\b`));
  if (weekly) {
    const weekday = WEEKDAY_LOOKUP[weekly[2] ?? ''] ?? 1;
    draft.repeatRule = { frequency: 'weekly', interval: weekly[1] ? 2 : 1, weekday };
    draft.pendingWeekday = weekday;
    draft.anchorExplicit = true;
    draft.matched.push(weekly[0]);
    return;
  }

  // "every 2 weeks", "every three days"
  const counted = scanner.consume(
    new RegExp(`\\bevery\\s+(\\d+|${NUMBER_WORD_PATTERN})\\s+(days|weeks|months|years)\\b`),
  );
  if (counted) {
    const interval = toNumber(counted[1] ?? '') ?? 1;
    const frequency = REPEAT_UNIT_TO_FREQUENCY[counted[2] ?? ''];
    if (frequency) {
      draft.repeatRule = { frequency, interval: Math.max(1, interval) };
      draft.matched.push(counted[0]);
      return;
    }
  }

  // "every day", "every other week", "every morning"
  const simple = scanner.consume(
    /\bevery\s+(other\s+)?(day|morning|afternoon|evening|night|week|month|year)\b/,
  );
  if (simple) {
    const unit = simple[2] ?? 'day';
    const frequency = REPEAT_UNIT_TO_FREQUENCY[unit] ?? 'daily';
    draft.repeatRule = { frequency, interval: simple[1] ? 2 : 1 };
    if (unit === 'morning' || unit === 'afternoon' || unit === 'evening' || unit === 'night') {
      draft.dayPart = unit;
    }
    draft.matched.push(simple[0]);
    return;
  }

  const adverb = scanner.consume(/\b(everyday|daily|nightly|weekly|monthly|yearly|annually)\b/);
  if (adverb) {
    const word = adverb[1] ?? 'daily';
    const frequency =
      word === 'weekly' ? 'weekly' : word === 'monthly' ? 'monthly' : word === 'yearly' || word === 'annually' ? 'yearly' : 'daily';
    draft.repeatRule = { frequency, interval: 1 };
    if (word === 'nightly') draft.dayPart = 'night';
    draft.matched.push(adverb[0]);
  }
}

function readDuration(scanner: Scanner, draft: Draft) {
  const half = scanner.consume(/\bin\s+half\s+an?\s+hour\b/);
  if (half) {
    draft.offsetMinutes = 30;
    draft.matched.push(half[0]);
    return;
  }

  const unitPattern = Object.keys(DURATION_UNITS)
    .sort((a, b) => b.length - a.length)
    .join('|');
  const match = scanner.consume(
    new RegExp(
      `\\bin\\s+(?:about\\s+|around\\s+|like\\s+)?(\\d+|${NUMBER_WORD_PATTERN})\\s*(${unitPattern})\\b`,
    ),
  );
  if (!match) return;

  const amount = toNumber(match[1] ?? '');
  const unit = DURATION_UNITS[match[2] ?? ''];
  if (amount === null || !unit) return;

  const minutes = {
    minute: 1,
    hour: 60,
    day: 60 * 24,
    week: 60 * 24 * 7,
    month: 60 * 24 * 30,
  }[unit];

  draft.offsetMinutes = amount * minutes;
  draft.matched.push(match[0]);
}

function readCalendarDate(scanner: Scanner, draft: Draft, now: Date) {
  // "October 1st", "on Oct 1 2026"
  const monthFirst = scanner.consume(
    new RegExp(`\\b(?:on\\s+)?(${MONTH_PATTERN})\\s+(\\d{1,2})(?:st|nd|rd|th)?(?:,?\\s+(\\d{4}))?\\b`),
  );
  if (monthFirst) {
    applyCalendarDate(
      draft,
      now,
      MONTH_LOOKUP[monthFirst[1] ?? ''] ?? 0,
      Number.parseInt(monthFirst[2] ?? '1', 10),
      monthFirst[3] ? Number.parseInt(monthFirst[3], 10) : null,
      monthFirst[0],
    );
    return;
  }

  // "1st of October", "3 March"
  const dayFirst = scanner.consume(
    new RegExp(`\\b(?:on\\s+)?(\\d{1,2})(?:st|nd|rd|th)?\\s+(?:of\\s+)?(${MONTH_PATTERN})\\b`),
  );
  if (dayFirst) {
    applyCalendarDate(
      draft,
      now,
      MONTH_LOOKUP[dayFirst[2] ?? ''] ?? 0,
      Number.parseInt(dayFirst[1] ?? '1', 10),
      null,
      dayFirst[0],
    );
    return;
  }

  // "10/1", "10/1/26" — month/day, US ordering.
  const numeric = scanner.consume(/\b(?:on\s+)?(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/);
  if (numeric) {
    const rawYear = numeric[3] ? Number.parseInt(numeric[3], 10) : null;
    applyCalendarDate(
      draft,
      now,
      Math.max(0, Math.min(11, Number.parseInt(numeric[1] ?? '1', 10) - 1)),
      Number.parseInt(numeric[2] ?? '1', 10),
      rawYear === null ? null : rawYear < 100 ? 2000 + rawYear : rawYear,
      numeric[0],
    );
    return;
  }

  // "on the 15th" — the next month containing that day number.
  const ordinal = scanner.consume(/\bon\s+the\s+(\d{1,2})(?:st|nd|rd|th)\b/);
  if (ordinal) {
    const day = Number.parseInt(ordinal[1] ?? '1', 10);
    let candidate = new Date(now.getFullYear(), now.getMonth(), Math.min(day, daysInMonth(now.getFullYear(), now.getMonth())));
    if (candidate.getTime() < startOfDay(now).getTime()) candidate = addMonths(candidate, 1);
    draft.anchorDay = startOfDay(candidate);
    draft.anchorExplicit = true;
    draft.matched.push(ordinal[0]);
  }
}

function applyCalendarDate(
  draft: Draft,
  now: Date,
  monthIndex: number,
  day: number,
  year: number | null,
  raw: string,
) {
  const resolvedYear = year ?? now.getFullYear();
  const clampedDay = Math.max(1, Math.min(day, daysInMonth(resolvedYear, monthIndex)));
  let candidate = new Date(resolvedYear, monthIndex, clampedDay);

  // A bare "October 1st" typed in November means next October.
  if (year === null && candidate.getTime() < startOfDay(now).getTime()) {
    candidate = new Date(resolvedYear + 1, monthIndex, clampedDay);
  }

  draft.anchorDay = startOfDay(candidate);
  draft.anchorExplicit = true;
  draft.matched.push(raw);
}

function readDayReference(scanner: Scanner, draft: Draft, now: Date) {
  if (draft.anchorExplicit) return;

  const dayAfter = scanner.consume(/\bthe\s+day\s+after\s+tomorrow\b/);
  if (dayAfter) {
    setAnchor(draft, addDays(now, 2), dayAfter[0]);
    return;
  }

  const tonight = scanner.consume(/\b(tonight|tonite)\b/);
  if (tonight) {
    setAnchor(draft, now, tonight[0]);
    draft.dayPart = 'night';
    return;
  }

  const today = scanner.consume(/\btoday\b/);
  if (today) {
    setAnchor(draft, now, today[0]);
    return;
  }

  const tomorrow = scanner.consume(/\b(tomorrow|tmrw|tmr|2morrow)\b/);
  if (tomorrow) {
    setAnchor(draft, addDays(now, 1), tomorrow[0]);
    return;
  }

  // "next Friday" / "this Monday" — always the next occurrence of that weekday.
  const qualifiedWeekday = scanner.consume(
    new RegExp(`\\b(?:on\\s+)?(?:this|next|coming)\\s+(${WEEKDAY_PATTERN})\\b`),
  );
  if (qualifiedWeekday) {
    const weekday = WEEKDAY_LOOKUP[qualifiedWeekday[1] ?? ''] ?? 1;
    setAnchor(draft, nextWeekday(now, weekday, false), qualifiedWeekday[0]);
    return;
  }

  const weekend = scanner.consume(/\b(?:this|next)?\s*weekend\b/);
  if (weekend) {
    setPendingWeekday(draft, 6, weekend[0].trim());
    return;
  }

  const nextUnit = scanner.consume(/\bnext\s+(week|month|year)\b/);
  if (nextUnit) {
    const unit = nextUnit[1];
    const target =
      unit === 'week' ? addDays(now, 7) : unit === 'month' ? addMonths(now, 1) : addMonths(now, 12);
    setAnchor(draft, target, nextUnit[0]);
    return;
  }

  const bareWeekday = scanner.consume(new RegExp(`\\b(?:on\\s+)?(${WEEKDAY_PATTERN})\\b`));
  if (bareWeekday) {
    setPendingWeekday(draft, WEEKDAY_LOOKUP[bareWeekday[1] ?? ''] ?? 1, bareWeekday[0]);
  }
}

function setPendingWeekday(draft: Draft, weekday: number, raw: string) {
  draft.pendingWeekday = weekday;
  draft.anchorExplicit = true;
  draft.matched.push(raw);
}

function setAnchor(draft: Draft, date: Date, raw: string) {
  draft.anchorDay = startOfDay(date);
  draft.anchorExplicit = true;
  draft.matched.push(raw);
}

function readClockTime(scanner: Scanner, draft: Draft) {
  // "at 5:30pm", "17:00", "5.30"
  const withMinutes = scanner.consume(
    new RegExp(`(?:\\bat\\s+|@\\s*)?\\b(\\d{1,2})[:.](\\d{2})\\s*${MERIDIEM}?`),
  );
  if (withMinutes) {
    const hour = Number.parseInt(withMinutes[1] ?? '0', 10);
    draft.minute = Math.min(59, Number.parseInt(withMinutes[2] ?? '0', 10));
    applyMeridiem(draft, hour, withMinutes[3]);
    draft.matched.push(withMinutes[0].trim());
    return;
  }

  // "5pm", "at 9 a.m."
  const withMeridiem = scanner.consume(new RegExp(`(?:\\bat\\s+|@\\s*)?\\b(\\d{1,2})\\s*${MERIDIEM}`));
  if (withMeridiem) {
    applyMeridiem(draft, Number.parseInt(withMeridiem[1] ?? '0', 10), withMeridiem[2]);
    draft.matched.push(withMeridiem[0].trim());
    return;
  }

  const named = scanner.consume(/\b(noon|midday|midnight)\b/);
  if (named) {
    draft.hour = named[1] === 'midnight' ? 0 : 12;
    draft.minute = 0;
    draft.hourIsBare = false;
    draft.matched.push(named[0]);
    return;
  }

  // "at 4" — needs the preposition, otherwise every number is a time.
  const bare = scanner.consume(/\bat\s+(\d{1,2})\b/);
  if (bare) {
    draft.hour = Number.parseInt(bare[1] ?? '0', 10);
    draft.minute = 0;
    draft.hourIsBare = true;
    draft.matched.push(bare[0]);
    return;
  }

  const spelled = scanner.consume(new RegExp(`\\bat\\s+(${HOUR_WORD_PATTERN})\\b`));
  if (spelled) {
    draft.hour = HOUR_WORDS[spelled[1] ?? ''] ?? 12;
    draft.minute = 0;
    draft.hourIsBare = true;
    draft.matched.push(spelled[0]);
  }
}

function applyMeridiem(draft: Draft, hour: number, meridiem: string | undefined) {
  if (!meridiem) {
    draft.hour = hour;
    draft.hourIsBare = hour <= 12;
    return;
  }
  const isPm = meridiem.startsWith('p');
  const normalised = hour % 12;
  draft.hour = isPm ? normalised + 12 : normalised;
  draft.hourIsBare = false;
}

function readDayPart(scanner: Scanner, draft: Draft) {
  if (draft.dayPart) return;
  const match = scanner.consume(
    /\b(?:in\s+the\s+|this\s+|that\s+)?(morning|afternoon|evening|night)\b/,
  );
  if (!match) return;
  draft.dayPart = match[1] as DayPart;
  draft.matched.push(match[0]);
}

/* -------------------------------------------------------------- assembly */

function resolveDueDate(
  draft: Draft,
  now: Date,
  startOfDayHour: number,
): { dueAt: Date | null; confidence: ParseConfidence } {
  if (draft.offsetMinutes !== null) {
    return { dueAt: addMinutes(now, draft.offsetMinutes), confidence: 'high' };
  }

  const hasTimeSignal = draft.hour !== null || draft.dayPart !== null;
  if (!draft.anchorExplicit && !hasTimeSignal && !draft.repeatRule) {
    return { dueAt: null, confidence: 'low' };
  }

  // A deferred weekday provisionally means today, so that "Monday at 9" typed
  // on a Monday morning can still land today.
  const provisionalAnchor =
    draft.anchorDay ??
    (draft.pendingWeekday !== null ? nextWeekday(now, draft.pendingWeekday, true) : startOfDay(now));

  let hour: number;
  let minute = draft.minute;
  if (draft.hour !== null) {
    if (!draft.hourIsBare) {
      hour = draft.hour;
    } else if (draft.dayPart) {
      // "every morning at 8" is 8 AM, never 8 PM.
      hour = applyDayPartToBareHour(draft.hour, draft.dayPart);
    } else {
      hour = resolveBareHour(draft.hour, provisionalAnchor, now, startOfDayHour);
    }
  } else if (draft.dayPart) {
    hour = dayPartHour(draft.dayPart, startOfDayHour);
    minute = 0;
  } else {
    hour = dayPartHour('morning', startOfDayHour);
    minute = 0;
  }

  let anchor = provisionalAnchor;
  if (draft.pendingWeekday !== null && withTime(anchor, hour, minute).getTime() <= now.getTime()) {
    anchor = addDays(anchor, 7);
  }

  let due = withTime(anchor, hour, minute);

  // If the day was only implied, a time that has already passed means the
  // user meant the next one: "gym at 7" typed at 9pm is tomorrow morning.
  if (!draft.anchorExplicit && due.getTime() <= now.getTime()) {
    if (hasTimeSignal) {
      due = withTime(addDays(anchor, 1), hour, minute);
    } else {
      due = roundUpToQuarterHour(addMinutes(now, 60));
      return { dueAt: due, confidence: 'medium' };
    }
  }

  // A repeating reminder whose first occurrence already passed starts next cycle.
  if (draft.repeatRule && draft.anchorExplicit && due.getTime() <= now.getTime()) {
    due = advanceByRule(due, draft.repeatRule);
  }

  return { dueAt: due, confidence: hasTimeSignal ? 'high' : 'medium' };
}

/** "at 8" + "morning" removes the ambiguity the other rule has to guess at. */
function applyDayPartToBareHour(hour: number, part: DayPart): number {
  if (part === 'morning') return hour === 12 ? 0 : hour;
  if (hour === 12) return 12;
  return hour < 12 ? hour + 12 : hour;
}

/**
 * "at 8" is genuinely ambiguous. Prefer a reading inside the user's waking
 * hours, and among those, the one that is still ahead of them.
 */
function resolveBareHour(hour: number, anchor: Date, now: Date, startOfDayHour: number): number {
  if (hour === 0 || hour > 12) return Math.min(23, hour);
  if (hour === 12) return 12;

  const candidates = [hour, hour + 12].filter((h) => h >= startOfDayHour && h <= 23);
  if (candidates.length === 0) return hour;
  const first = candidates[0] as number;
  if (candidates.length === 1) return first;

  if (!isSameDay(anchor, now)) return first;
  return candidates.find((h) => withTime(anchor, h).getTime() > now.getTime()) ?? first;
}

/** Shared with the notification scheduler so both agree on "the next one". */
export function advanceByRule(from: Date, rule: RepeatRule): Date {
  switch (rule.frequency) {
    case 'daily':
      return addDays(from, rule.interval);
    case 'weekly':
      return addDays(from, 7 * rule.interval);
    case 'monthly':
      return addMonths(from, rule.interval);
    case 'yearly':
      return addMonths(from, 12 * rule.interval);
  }
}

function roundUpToQuarterHour(date: Date): Date {
  const next = new Date(date);
  next.setSeconds(0, 0);
  const remainder = next.getMinutes() % 15;
  if (remainder !== 0) next.setMinutes(next.getMinutes() + (15 - remainder));
  return next;
}

/* ----------------------------------------------------------------- title */

function extractTitle(remainder: string): string {
  let title = remainder.replace(/\s+/g, ' ').trim();
  title = title.replace(/^[,\-–—:;]+|[,\-–—:;]+$/g, '').trim();

  const prefix = new RegExp(`^(?:${TITLE_PREFIXES.join('|')})\\s+`, 'i');
  let previous: string;
  do {
    previous = title;
    title = title.replace(prefix, '').trim();
  } while (title !== previous);

  const dangling = new RegExp(`\\s+(?:${DANGLING_WORDS.join('|')})$`, 'i');
  do {
    previous = title;
    title = title.replace(dangling, '').trim();
    title = title.replace(/[,\-–—:;]+$/g, '').trim();
  } while (title !== previous);

  const leadingDangling = new RegExp(`^(?:${DANGLING_WORDS.join('|')})\\s+`, 'i');
  do {
    previous = title;
    title = title.replace(leadingDangling, '').trim();
  } while (title !== previous);

  if (!title) return '';
  const firstChar = title[0] ?? '';
  return /[a-z]/.test(firstChar) ? firstChar.toUpperCase() + title.slice(1) : title;
}

function fallbackTitle(original: string): string {
  const trimmed = original.trim();
  if (!trimmed) return 'Reminder';
  const firstChar = trimmed[0] ?? '';
  return /[a-z]/.test(firstChar) ? firstChar.toUpperCase() + trimmed.slice(1) : trimmed;
}
