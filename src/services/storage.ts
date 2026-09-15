import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEFAULT_SETTINGS, Reminder, Settings } from '@/types/reminder';

/**
 * Persistence boundary. Everything is namespaced and versioned so a future
 * Supabase sync can migrate a known shape rather than guessing.
 */
const KEYS = {
  reminders: 'bump:v1:reminders',
  settings: 'bump:v1:settings',
} as const;

export async function loadReminders(): Promise<Reminder[]> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.reminders);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isReminderLike).map(normaliseReminder);
  } catch (error) {
    console.warn('[bump] could not load reminders', error);
    return [];
  }
}

export async function saveReminders(reminders: Reminder[]): Promise<void> {
  try {
    await AsyncStorage.setItem(KEYS.reminders, JSON.stringify(reminders));
  } catch (error) {
    console.warn('[bump] could not save reminders', error);
  }
}

export async function loadSettings(): Promise<Settings> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.settings);
    if (!raw) return { ...DEFAULT_SETTINGS };
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return { ...DEFAULT_SETTINGS };
    // Merge rather than replace so new settings get sensible defaults on upgrade.
    return { ...DEFAULT_SETTINGS, ...(parsed as Partial<Settings>) };
  } catch (error) {
    console.warn('[bump] could not load settings', error);
    return { ...DEFAULT_SETTINGS };
  }
}

export async function saveSettings(settings: Settings): Promise<void> {
  try {
    await AsyncStorage.setItem(KEYS.settings, JSON.stringify(settings));
  } catch (error) {
    console.warn('[bump] could not save settings', error);
  }
}

export async function clearAll(): Promise<void> {
  await AsyncStorage.multiRemove([KEYS.reminders, KEYS.settings]);
}

export async function clearReminders(): Promise<void> {
  await AsyncStorage.removeItem(KEYS.reminders);
}

function isReminderLike(value: unknown): value is Partial<Reminder> & { id: string; title: string } {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as { id?: unknown }).id === 'string' &&
    typeof (value as { title?: unknown }).title === 'string'
  );
}

/** Fills in any field a older/partial record is missing. */
function normaliseReminder(value: Partial<Reminder> & { id: string; title: string }): Reminder {
  return {
    id: value.id,
    title: value.title,
    notes: value.notes,
    createdAt: value.createdAt ?? new Date().toISOString(),
    dueAt: value.dueAt ?? null,
    completedAt: value.completedAt ?? null,
    status: value.status === 'completed' ? 'completed' : 'active',
    repeatRule: value.repeatRule ?? null,
    bumpEnabled: Boolean(value.bumpEnabled),
    bumpInterval: value.bumpInterval ?? null,
    personality: value.personality ?? DEFAULT_SETTINGS.personality,
    notificationIds: Array.isArray(value.notificationIds) ? value.notificationIds : [],
    emoji: value.emoji ?? '🔖',
    snoozeCount: typeof value.snoozeCount === 'number' ? value.snoozeCount : 0,
  };
}
