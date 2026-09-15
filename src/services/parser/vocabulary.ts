import { RepeatFrequency } from '@/types/reminder';

export const NUMBER_WORDS: Record<string, number> = {
  a: 1,
  an: 1,
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
  fifteen: 15,
  twenty: 20,
  thirty: 30,
  forty: 40,
  fortyfive: 45,
  'forty five': 45,
  'forty-five': 45,
  sixty: 60,
  ninety: 90,
};

export const NUMBER_WORD_PATTERN = Object.keys(NUMBER_WORDS)
  .sort((a, b) => b.length - a.length)
  .map((word) => word.replace(/[-\s]/g, '[-\\s]'))
  .join('|');

export function toNumber(raw: string): number | null {
  const trimmed = raw.trim().toLowerCase();
  if (/^\d+$/.test(trimmed)) return Number.parseInt(trimmed, 10);
  const normalised = trimmed.replace(/[-\s]+/g, ' ');
  const direct = NUMBER_WORDS[normalised] ?? NUMBER_WORDS[normalised.replace(/\s/g, '')];
  return direct ?? null;
}

export const WEEKDAY_LOOKUP: Record<string, number> = {
  sunday: 0,
  sun: 0,
  sundays: 0,
  monday: 1,
  mon: 1,
  mondays: 1,
  tuesday: 2,
  tue: 2,
  tues: 2,
  tuesdays: 2,
  wednesday: 3,
  wed: 3,
  weds: 3,
  wednesdays: 3,
  thursday: 4,
  thu: 4,
  thur: 4,
  thurs: 4,
  thursdays: 4,
  friday: 5,
  fri: 5,
  fridays: 5,
  saturday: 6,
  sat: 6,
  saturdays: 6,
};

export const WEEKDAY_PATTERN = Object.keys(WEEKDAY_LOOKUP)
  .sort((a, b) => b.length - a.length)
  .join('|');

export const MONTH_LOOKUP: Record<string, number> = {
  january: 0,
  jan: 0,
  february: 1,
  feb: 1,
  march: 2,
  mar: 2,
  april: 3,
  apr: 3,
  may: 4,
  june: 5,
  jun: 5,
  july: 6,
  jul: 6,
  august: 7,
  aug: 7,
  september: 8,
  sept: 8,
  sep: 8,
  october: 9,
  oct: 9,
  november: 10,
  nov: 10,
  december: 11,
  dec: 11,
};

export const MONTH_PATTERN = Object.keys(MONTH_LOOKUP)
  .sort((a, b) => b.length - a.length)
  .join('|');

export type DayPart = 'morning' | 'afternoon' | 'evening' | 'night';

/**
 * Hours a vague time-of-day maps to. `morning` is derived from the user's
 * start-of-day setting; the rest are fixed because "evening" means evening.
 */
export function dayPartHour(part: DayPart, startOfDayHour: number): number {
  switch (part) {
    case 'morning':
      return Math.min(11, startOfDayHour + 1);
    case 'afternoon':
      return 14;
    case 'evening':
      return 18;
    case 'night':
      return 20;
  }
}

export const DURATION_UNITS: Record<string, 'minute' | 'hour' | 'day' | 'week' | 'month'> = {
  min: 'minute',
  mins: 'minute',
  minute: 'minute',
  minutes: 'minute',
  hr: 'hour',
  hrs: 'hour',
  hour: 'hour',
  hours: 'hour',
  day: 'day',
  days: 'day',
  week: 'week',
  weeks: 'week',
  month: 'month',
  months: 'month',
};

export const REPEAT_UNIT_TO_FREQUENCY: Record<string, RepeatFrequency> = {
  day: 'daily',
  days: 'daily',
  morning: 'daily',
  afternoon: 'daily',
  evening: 'daily',
  night: 'daily',
  week: 'weekly',
  weeks: 'weekly',
  month: 'monthly',
  months: 'monthly',
  year: 'yearly',
  years: 'yearly',
};

/**
 * Lead-ins people type without meaning them as part of the task. Stripped
 * from the title so "remind me to call dad" becomes "Call dad".
 */
export const TITLE_PREFIXES = [
  "don'?t let me forget to",
  "don'?t let me forget",
  "don'?t forget to",
  "don'?t forget",
  'remind me to',
  'remind me',
  'remember to',
  'remember',
  'make sure to',
  'make sure i',
  'i need to',
  'i have to',
  'i gotta',
  'i should',
  'need to',
  'gotta',
  'please',
];

/** Words left dangling once a date/time phrase is lifted out of the middle. */
export const DANGLING_WORDS = [
  'at',
  'on',
  'by',
  'in',
  'this',
  'next',
  'the',
  'of',
  'for',
  'until',
  'till',
  'around',
  'about',
  'and',
  'a',
  'an',
];
