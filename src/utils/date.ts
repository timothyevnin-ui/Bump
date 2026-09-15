/**
 * Date helpers. Deliberately dependency-free and pure so the parser can be
 * unit-tested against a frozen "now".
 */

export const MINUTE_MS = 60 * 1000;
export const HOUR_MS = 60 * MINUTE_MS;
export const DAY_MS = 24 * HOUR_MS;

export const WEEKDAY_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
] as const;

export const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const;

export function startOfDay(date: Date): Date {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

export function endOfDay(date: Date): Date {
  const next = new Date(date);
  next.setHours(23, 59, 59, 999);
  return next;
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * MINUTE_MS);
}

export function addMonths(date: Date, months: number): Date {
  const next = new Date(date);
  const targetDay = next.getDate();
  next.setDate(1);
  next.setMonth(next.getMonth() + months);
  // Clamp: "Jan 31 + 1 month" should land on the last day of February.
  next.setDate(Math.min(targetDay, daysInMonth(next.getFullYear(), next.getMonth())));
  return next;
}

export function daysInMonth(year: number, monthIndex: number): number {
  return new Date(year, monthIndex + 1, 0).getDate();
}

export function withTime(date: Date, hour: number, minute = 0): Date {
  const next = new Date(date);
  next.setHours(hour, minute, 0, 0);
  return next;
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function isToday(date: Date, now = new Date()): boolean {
  return isSameDay(date, now);
}

export function isTomorrow(date: Date, now = new Date()): boolean {
  return isSameDay(date, addDays(now, 1));
}

/**
 * The next occurrence of `weekday` strictly after `from`, unless
 * `allowToday` is set and `from` already falls on that weekday.
 */
export function nextWeekday(from: Date, weekday: number, allowToday = false): Date {
  const base = startOfDay(from);
  const diff = (weekday - base.getDay() + 7) % 7;
  const offset = diff === 0 && !allowToday ? 7 : diff;
  return addDays(base, offset);
}

export function formatTime(date: Date): string {
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const suffix = hours >= 12 ? 'PM' : 'AM';
  const displayHour = hours % 12 === 0 ? 12 : hours % 12;
  return `${displayHour}:${String(minutes).padStart(2, '0')} ${suffix}`;
}

/** "2 PM" rather than "2:00 PM" when the minutes are zero — reads calmer. */
export function formatTimeShort(date: Date): string {
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const suffix = hours >= 12 ? 'PM' : 'AM';
  const displayHour = hours % 12 === 0 ? 12 : hours % 12;
  return minutes === 0
    ? `${displayHour} ${suffix}`
    : `${displayHour}:${String(minutes).padStart(2, '0')} ${suffix}`;
}

export function formatDay(date: Date, now = new Date()): string {
  if (isToday(date, now)) return 'Today';
  if (isTomorrow(date, now)) return 'Tomorrow';

  const withinAWeek = date.getTime() - startOfDay(now).getTime() < 7 * DAY_MS;
  if (withinAWeek && date.getTime() > now.getTime()) {
    return WEEKDAY_NAMES[date.getDay()] ?? '';
  }

  const month = MONTH_NAMES[date.getMonth()] ?? '';
  const sameYear = date.getFullYear() === now.getFullYear();
  return sameYear
    ? `${month.slice(0, 3)} ${date.getDate()}`
    : `${month.slice(0, 3)} ${date.getDate()}, ${date.getFullYear()}`;
}

/** The line shown on a reminder card: "2 PM", "Tomorrow · 9 AM", "Sep 30". */
export function formatDueLabel(dueAt: string | null, now = new Date()): string {
  if (!dueAt) return 'Someday';
  const date = new Date(dueAt);
  if (isToday(date, now)) return formatTimeShort(date);
  return `${formatDay(date, now)} · ${formatTimeShort(date)}`;
}

/** "in 12 min", "in 3 hours", "2 days ago" — used for the Now section. */
export function formatRelative(target: Date, now = new Date()): string {
  const deltaMs = target.getTime() - now.getTime();
  const past = deltaMs < 0;
  const abs = Math.abs(deltaMs);

  const minutes = Math.round(abs / MINUTE_MS);
  if (minutes < 1) return past ? 'just now' : 'now';
  if (minutes < 60) return past ? `${minutes} min ago` : `in ${minutes} min`;

  const hours = Math.round(abs / HOUR_MS);
  if (hours < 24) {
    const unit = hours === 1 ? 'hour' : 'hours';
    return past ? `${hours} ${unit} ago` : `in ${hours} ${unit}`;
  }

  const days = Math.round(abs / DAY_MS);
  const unit = days === 1 ? 'day' : 'days';
  return past ? `${days} ${unit} ago` : `in ${days} ${unit}`;
}

export function formatFullDate(date: Date): string {
  const month = MONTH_NAMES[date.getMonth()] ?? '';
  return `${WEEKDAY_NAMES[date.getDay()]}, ${month} ${date.getDate()}`;
}

export function describeRepeat(rule: { frequency: string; interval: number; weekday?: number }): string {
  const every = rule.interval > 1 ? `Every ${rule.interval} ` : 'Every ';
  switch (rule.frequency) {
    case 'daily':
      return rule.interval > 1 ? `${every}days` : 'Every day';
    case 'weekly': {
      const day = rule.weekday !== undefined ? WEEKDAY_NAMES[rule.weekday] : undefined;
      if (rule.interval > 1) return `${every}weeks`;
      return day ? `Every ${day}` : 'Every week';
    }
    case 'monthly':
      return rule.interval > 1 ? `${every}months` : 'Every month';
    case 'yearly':
      return rule.interval > 1 ? `${every}years` : 'Every year';
    default:
      return 'Repeats';
  }
}
