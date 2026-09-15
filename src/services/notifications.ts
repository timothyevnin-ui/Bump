import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { Reminder, Settings } from '@/types/reminder';
import { buildNotificationCopy } from '@/services/copy';
import {
  NotificationPlan,
  PlannedNotification,
  buildPlan,
} from '@/services/notificationPlan';

/**
 * The OS-facing half of notification scheduling: permissions, channels,
 * categories, and turning a plan (see `notificationPlan.ts`) into real
 * scheduled notifications.
 *
 * The whole schedule is rebuilt from scratch on every change and on every
 * foreground. Rebuilding is cheap at this size and removes every class of
 * drift bug that incremental cancel/reschedule logic produces.
 */

export { buildPlan, canRepeatNatively, MAX_SCHEDULED, MAX_BUMPS_PER_REMINDER } from '@/services/notificationPlan';

export const ANDROID_CHANNEL_ID = 'bump-reminders';

export const NOTIFICATION_CATEGORY = 'bump-reminder';
export const ACTION_COMPLETE = 'bump-complete';
export const ACTION_SNOOZE = 'bump-snooze';

/** Minutes a notification-initiated snooze pushes a reminder back by. */
export const SNOOZE_MINUTES = 15;

/** Payload attached to every notification we schedule. */
export interface BumpNotificationData extends Record<string, unknown> {
  reminderId: string;
  nudgeIndex: number;
}

export function configureNotificationHandler() {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

/** Android channel + the Done/Snooze buttons. Safe to call more than once. */
export async function prepareNotificationChannels() {
  if (Platform.OS === 'web') return;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
      name: 'Reminders',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 200, 120, 200],
      lightColor: '#E8859B',
    });
  }

  await Notifications.setNotificationCategoryAsync(NOTIFICATION_CATEGORY, [
    {
      identifier: ACTION_COMPLETE,
      buttonTitle: 'Done ✓',
      options: { opensAppToForeground: true },
    },
    {
      identifier: ACTION_SNOOZE,
      buttonTitle: `Snooze ${SNOOZE_MINUTES}m`,
      options: { opensAppToForeground: true },
    },
  ]);
}

export async function getPermissionGranted(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  const { status } = await Notifications.getPermissionsAsync();
  return status === 'granted';
}

/**
 * Asks for permission if we do not already have it. Returns whether we ended
 * up with it — callers use this to keep the settings toggle honest.
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  if (!Device.isDevice) {
    // Simulators can register but never actually deliver; still worth asking so
    // the UI flow is testable.
    console.info('[bump] notifications are unreliable on simulators');
  }

  const existing = await Notifications.getPermissionsAsync();
  if (existing.status === 'granted') return true;
  if (!existing.canAskAgain) return false;

  const requested = await Notifications.requestPermissionsAsync({
    ios: {
      allowAlert: true,
      allowBadge: false,
      allowSound: true,
    },
  });
  return requested.status === 'granted';
}

export async function cancelAllScheduled() {
  if (Platform.OS === 'web') return;
  await Notifications.cancelAllScheduledNotificationsAsync();
}

/* ------------------------------------------------------------- scheduling */

/** Result of a sync: which notification ids now belong to which reminder. */
export type ScheduleMap = Record<string, string[]>;

export interface SyncResult {
  map: ScheduleMap;
  scheduledCount: number;
  /** Bumps we wanted but could not fit inside the OS budget. */
  droppedBumps: number;
}

/**
 * Rebuilds the entire OS-level schedule from the current reminders.
 *
 * Returns the new notification ids per reminder so the caller can persist
 * them (they are shown in the detail screen and make debugging tractable).
 */
export async function syncSchedule(
  reminders: Reminder[],
  settings: Settings,
  now: Date = new Date(),
): Promise<SyncResult> {
  const empty: SyncResult = { map: {}, scheduledCount: 0, droppedBumps: 0 };
  if (Platform.OS === 'web') return empty;

  await cancelAllScheduled();

  if (!settings.notificationsEnabled) return empty;
  if (!(await getPermissionGranted())) return empty;

  const plan: NotificationPlan = buildPlan(reminders, now);
  const map: ScheduleMap = {};
  let scheduledCount = 0;

  for (const item of plan.scheduled) {
    try {
      const id = await scheduleOne(item, settings, now);
      if (!id) continue;
      (map[item.reminderId] ??= []).push(id);
      scheduledCount += 1;
    } catch (error) {
      console.warn('[bump] failed to schedule a notification', error);
    }
  }

  return { map, scheduledCount, droppedBumps: plan.droppedBumps };
}

async function scheduleOne(
  item: PlannedNotification,
  settings: Settings,
  now: Date,
): Promise<string | null> {
  const { reminder, nudgeIndex } = item;
  // Personality is snapshotted per reminder, but the live setting wins so
  // changing it in Settings retunes everything on the next sync.
  const personality = settings.personality;
  const copy = buildNotificationCopy(
    `${reminder.emoji} ${reminder.title}`.trim(),
    personality,
    nudgeIndex,
    reminder.id,
  );

  const data: BumpNotificationData = { reminderId: reminder.id, nudgeIndex };

  const trigger = item.repeating
    ? repeatingTrigger(item)
    : ({
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: item.fireAt,
        channelId: ANDROID_CHANNEL_ID,
      } as Notifications.DateTriggerInput);

  if (!trigger) return null;
  if (!item.repeating && item.fireAt.getTime() <= now.getTime()) return null;

  return Notifications.scheduleNotificationAsync({
    content: {
      title: copy.title,
      body: copy.body,
      data,
      sound: true,
      categoryIdentifier: NOTIFICATION_CATEGORY,
      interruptionLevel: nudgeIndex > 2 ? 'timeSensitive' : 'active',
    },
    trigger,
  });
}

function repeatingTrigger(
  item: PlannedNotification,
): Notifications.SchedulableNotificationTriggerInput | null {
  const rule = item.reminder.repeatRule;
  if (!rule) return null;
  const at = item.fireAt;

  switch (rule.frequency) {
    case 'daily':
      return {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: at.getHours(),
        minute: at.getMinutes(),
        channelId: ANDROID_CHANNEL_ID,
      };
    case 'weekly':
      return {
        type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
        // expo-notifications counts weekdays 1–7 with Sunday as 1.
        weekday: (rule.weekday ?? at.getDay()) + 1,
        hour: at.getHours(),
        minute: at.getMinutes(),
        channelId: ANDROID_CHANNEL_ID,
      };
    case 'monthly':
      return {
        type: Notifications.SchedulableTriggerInputTypes.MONTHLY,
        day: at.getDate(),
        hour: at.getHours(),
        minute: at.getMinutes(),
        channelId: ANDROID_CHANNEL_ID,
      };
    case 'yearly':
      return {
        type: Notifications.SchedulableTriggerInputTypes.YEARLY,
        day: at.getDate(),
        month: at.getMonth(),
        hour: at.getHours(),
        minute: at.getMinutes(),
        channelId: ANDROID_CHANNEL_ID,
      };
    default:
      return null;
  }
}

/** Reads our payload back off a delivered notification, if it is one of ours. */
export function readNotificationData(
  response: Notifications.NotificationResponse,
): BumpNotificationData | null {
  const data = response.notification.request.content.data as Partial<BumpNotificationData> | undefined;
  if (!data || typeof data.reminderId !== 'string') return null;
  return {
    reminderId: data.reminderId,
    nudgeIndex: typeof data.nudgeIndex === 'number' ? data.nudgeIndex : 0,
  };
}

export async function getScheduledCount(): Promise<number> {
  if (Platform.OS === 'web') return 0;
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  return scheduled.length;
}
