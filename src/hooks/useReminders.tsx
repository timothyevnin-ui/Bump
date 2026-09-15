import * as Notifications from 'expo-notifications';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { AppState, Platform } from 'react-native';
import { Reminder, ReminderSection, Settings } from '@/types/reminder';
import { completionCheer } from '@/services/copy';
import {
  ACTION_COMPLETE,
  ACTION_SNOOZE,
  SNOOZE_MINUTES,
  readNotificationData,
  syncSchedule,
} from '@/services/notifications';
import {
  CreateReminderInput,
  completeReminder,
  completedReminders,
  completedThisWeek,
  createReminder,
  groupReminders,
  snoozeReminder,
  uncompleteReminder,
} from '@/services/reminders';
import { buildSeedReminders } from '@/services/seed';
import { clearReminders, loadReminders, saveReminders } from '@/services/storage';
import { useNow } from '@/hooks/useNow';
import { useSettings } from '@/hooks/useSettings';

/** A short-lived message shown after a completion or snooze. */
export interface Celebration {
  id: number;
  message: string;
  tone: 'success' | 'neutral';
}

interface RemindersContextValue {
  reminders: Reminder[];
  sections: ReminderSection[];
  completed: Reminder[];
  weeklyCount: number;
  ready: boolean;
  celebration: Celebration | null;
  now: Date;
  add: (input: CreateReminderInput) => Reminder;
  update: (id: string, patch: Partial<Reminder>) => void;
  complete: (id: string) => void;
  uncomplete: (id: string) => void;
  snooze: (id: string, minutes?: number) => void;
  remove: (id: string) => void;
  getById: (id: string) => Reminder | undefined;
  loadSampleData: () => void;
  clearEverything: () => void;
  /** Number of OS notifications currently scheduled, for the Settings screen. */
  scheduledCount: number;
}

const RemindersContext = createContext<RemindersContextValue | null>(null);

/**
 * Fields that, when changed, mean the OS schedule is stale. Writing the
 * resulting notification ids back into state must NOT re-trigger a sync, which
 * is why this signature deliberately ignores `notificationIds`.
 */
function scheduleSignature(reminders: Reminder[], settings: Settings): string {
  const parts = reminders
    .filter((reminder) => reminder.status === 'active')
    .map((reminder) =>
      [
        reminder.id,
        reminder.dueAt ?? '-',
        reminder.title,
        reminder.emoji,
        reminder.bumpEnabled ? reminder.bumpInterval : '-',
        reminder.repeatRule ? `${reminder.repeatRule.frequency}:${reminder.repeatRule.interval}` : '-',
      ].join('|'),
    );
  parts.push(`::${settings.personality}:${settings.notificationsEnabled}`);
  return parts.join('\n');
}

export function RemindersProvider({ children }: { children: React.ReactNode }) {
  const { settings, ready: settingsReady } = useSettings();
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [ready, setReady] = useState(false);
  const [celebration, setCelebration] = useState<Celebration | null>(null);
  const [scheduledCount, setScheduledCount] = useState(0);
  const now = useNow();

  const hydrated = useRef(false);
  const lastSignature = useRef<string | null>(null);
  const celebrationId = useRef(0);
  const latest = useRef<Reminder[]>([]);

  /* ------------------------------------------------------------ hydration */

  useEffect(() => {
    let cancelled = false;
    void loadReminders().then((stored) => {
      if (cancelled) return;
      setReminders(stored);
      hydrated.current = true;
      setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    latest.current = reminders;
    if (!hydrated.current) return;
    void saveReminders(reminders);
  }, [reminders]);

  /* --------------------------------------------------------- notifications */

  const runSync = useCallback(
    async (list: Reminder[], force = false) => {
      if (!settingsReady) return;
      const signature = scheduleSignature(list, settings);
      if (!force && signature === lastSignature.current) return;
      lastSignature.current = signature;

      const result = await syncSchedule(list, settings);
      setScheduledCount(result.scheduledCount);

      // Record which notifications belong to which reminder. This does not
      // change the signature, so it cannot loop.
      setReminders((current) =>
        current.map((reminder) => {
          const ids = result.map[reminder.id] ?? [];
          if (
            ids.length === reminder.notificationIds.length &&
            ids.every((id, index) => id === reminder.notificationIds[index])
          ) {
            return reminder;
          }
          return { ...reminder, notificationIds: ids };
        }),
      );
    },
    [settings, settingsReady],
  );

  useEffect(() => {
    if (!ready || !settingsReady) return;
    void runSync(reminders);
  }, [ready, settingsReady, reminders, runSync]);

  // Repeating rules the OS cannot express natively, and Bump chains beyond the
  // scheduling budget, are refreshed every time the app comes back.
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state !== 'active') return;
      void runSync(latest.current, true);
    });
    return () => subscription.remove();
  }, [runSync]);

  /* -------------------------------------------------------------- actions */

  const pushCelebration = useCallback((message: string, tone: Celebration['tone'] = 'success') => {
    celebrationId.current += 1;
    setCelebration({ id: celebrationId.current, message, tone });
  }, []);

  useEffect(() => {
    if (!celebration) return;
    const timer = setTimeout(() => setCelebration(null), 2400);
    return () => clearTimeout(timer);
  }, [celebration]);

  const add = useCallback(
    (input: CreateReminderInput) => {
      const reminder = createReminder(input, settings);
      setReminders((current) => [reminder, ...current]);
      return reminder;
    },
    [settings],
  );

  const update = useCallback((id: string, patch: Partial<Reminder>) => {
    setReminders((current) =>
      current.map((reminder) => (reminder.id === id ? { ...reminder, ...patch } : reminder)),
    );
  }, []);

  const complete = useCallback(
    (id: string) => {
      const target = latest.current.find((reminder) => reminder.id === id);
      if (!target || target.status === 'completed') return;
      // A repeating reminder yields two records: the finished occurrence and
      // a fresh one for the next cycle.
      const produced = completeReminder(target);
      setReminders((current) =>
        current.flatMap((reminder) => (reminder.id === id ? produced : [reminder])),
      );
      pushCelebration(completionCheer(settings.personality));
    },
    [pushCelebration, settings.personality],
  );

  const uncomplete = useCallback((id: string) => {
    setReminders((current) =>
      current.map((reminder) => (reminder.id === id ? uncompleteReminder(reminder) : reminder)),
    );
  }, []);

  const snooze = useCallback(
    (id: string, minutes: number = SNOOZE_MINUTES) => {
      setReminders((current) =>
        current.map((reminder) =>
          reminder.id === id ? snoozeReminder(reminder, minutes) : reminder,
        ),
      );
    },
    [],
  );

  const remove = useCallback((id: string) => {
    setReminders((current) => current.filter((reminder) => reminder.id !== id));
  }, []);

  const loadSampleData = useCallback(() => {
    setReminders(buildSeedReminders(settings));
    pushCelebration('Sample reminders loaded ✨', 'neutral');
  }, [settings, pushCelebration]);

  const clearEverything = useCallback(() => {
    setReminders([]);
    void clearReminders();
    pushCelebration('All clear.', 'neutral');
  }, [pushCelebration]);

  /* ------------------------------------------ notification action handling */

  useEffect(() => {
    if (Platform.OS === 'web') return;
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = readNotificationData(response);
      if (!data) return;
      if (response.actionIdentifier === ACTION_COMPLETE) {
        complete(data.reminderId);
      } else if (response.actionIdentifier === ACTION_SNOOZE) {
        snooze(data.reminderId, SNOOZE_MINUTES);
      }
    });
    return () => subscription.remove();
  }, [complete, snooze]);

  /* --------------------------------------------------------------- derived */

  const sections = useMemo(() => groupReminders(reminders, now), [reminders, now]);
  const completed = useMemo(() => completedReminders(reminders), [reminders]);
  const weeklyCount = useMemo(() => completedThisWeek(reminders, now), [reminders, now]);

  const getById = useCallback(
    (id: string) => reminders.find((reminder) => reminder.id === id),
    [reminders],
  );

  const value = useMemo<RemindersContextValue>(
    () => ({
      reminders,
      sections,
      completed,
      weeklyCount,
      ready,
      celebration,
      now,
      add,
      update,
      complete,
      uncomplete,
      snooze,
      remove,
      getById,
      loadSampleData,
      clearEverything,
      scheduledCount,
    }),
    [
      reminders,
      sections,
      completed,
      weeklyCount,
      ready,
      celebration,
      now,
      add,
      update,
      complete,
      uncomplete,
      snooze,
      remove,
      getById,
      loadSampleData,
      clearEverything,
      scheduledCount,
    ],
  );

  return <RemindersContext.Provider value={value}>{children}</RemindersContext.Provider>;
}

export function useReminders(): RemindersContextValue {
  const context = useContext(RemindersContext);
  if (!context) throw new Error('useReminders must be used inside a RemindersProvider');
  return context;
}
