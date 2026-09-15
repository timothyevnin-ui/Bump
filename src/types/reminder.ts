/**
 * Core domain types for Bump.
 *
 * These are intentionally serialisable (dates are ISO strings) so the same
 * objects can move from AsyncStorage to a Supabase row later without a
 * migration of the app layer.
 */

/** How chatty Bump is when it pings you. Chosen during onboarding. */
export type Personality = 'normal' | 'friendly' | 'pushy' | 'unhinged';

export const PERSONALITIES: Personality[] = ['normal', 'friendly', 'pushy', 'unhinged'];

/** Minutes between follow-up nudges when "Bump me until I do it" is on. */
export type BumpInterval = 30 | 60 | 180;

export const BUMP_INTERVALS: BumpInterval[] = [30, 60, 180];

export type ReminderStatus = 'active' | 'completed';

export type RepeatFrequency = 'daily' | 'weekly' | 'monthly' | 'yearly';

export interface RepeatRule {
  frequency: RepeatFrequency;
  /** Every N units. `1` for "every day", `2` for "every other week". */
  interval: number;
  /** 0 = Sunday … 6 = Saturday. Only meaningful for weekly rules. */
  weekday?: number;
}

export interface Reminder {
  id: string;
  title: string;
  notes?: string;
  /** ISO timestamp. */
  createdAt: string;
  /** ISO timestamp, or `null` for a "Someday" reminder with no fixed time. */
  dueAt: string | null;
  /** ISO timestamp, or `null` while still active. */
  completedAt: string | null;
  status: ReminderStatus;
  repeatRule: RepeatRule | null;
  bumpEnabled: boolean;
  /** Only meaningful when `bumpEnabled` is true. */
  bumpInterval: BumpInterval | null;
  /** Snapshot of the personality at creation time, so copy stays consistent. */
  personality: Personality;
  /** Identifiers of every OS notification currently scheduled for this reminder. */
  notificationIds: string[];
  emoji: string;
  /** How many times the user has snoozed this one. Purely for copy flavour. */
  snoozeCount: number;
}

/**
 * The buckets the Today screen groups reminders into. Overdue reminders sit at
 * the top of `now` rather than in a section of their own — four groups is the
 * most the home screen can show and still be readable at a glance.
 */
export type SectionKey = 'now' | 'laterToday' | 'upcoming' | 'someday';

export interface ReminderSection {
  key: SectionKey;
  title: string;
  emoji: string;
  reminders: Reminder[];
}

export type ThemePreference = 'system' | 'light' | 'dark';

export interface Settings {
  personality: Personality;
  /** Pre-selected bump cadence for new reminders. */
  defaultBumpInterval: BumpInterval;
  /** Whether new reminders default to "Bump me until I do it". */
  bumpByDefault: boolean;
  notificationsEnabled: boolean;
  hapticsEnabled: boolean;
  theme: ThemePreference;
  /** Hour (0–23) the user considers "morning". Drives vague-time parsing. */
  startOfDayHour: number;
  onboardingComplete: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  personality: 'friendly',
  defaultBumpInterval: 60,
  bumpByDefault: false,
  notificationsEnabled: false,
  hapticsEnabled: true,
  theme: 'system',
  startOfDayHour: 8,
  onboardingComplete: false,
};
