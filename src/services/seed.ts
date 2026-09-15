import { Reminder, Settings } from '@/types/reminder';
import { createReminder } from '@/services/reminders';
import { addDays, addMinutes, startOfDay, withTime } from '@/utils/date';

/**
 * Sample data for development. Loaded from Settings (dev builds only) so the
 * finished interface can be seen in one tap without typing eight reminders.
 */
export function buildSeedReminders(settings: Settings, now = new Date()): Reminder[] {
  const tomorrow = addDays(startOfDay(now), 1);
  const inThreeDays = addDays(startOfDay(now), 3);

  const drafts: Parameters<typeof createReminder>[0][] = [
    {
      title: 'Move laundry',
      dueAt: addMinutes(now, 12),
      emoji: '🧺',
      bumpEnabled: true,
      bumpInterval: 30,
    },
    {
      title: 'Call Dad',
      dueAt: withTime(new Date(now), Math.min(23, Math.max(now.getHours() + 3, 14)), 0),
      emoji: '📞',
    },
    {
      title: 'Take chicken out',
      dueAt: withTime(new Date(now), Math.min(23, Math.max(now.getHours() + 5, 16)), 0),
      emoji: '🍗',
    },
    {
      title: 'Cancel free trial',
      dueAt: withTime(tomorrow, 9, 0),
      emoji: '🚫',
      bumpEnabled: true,
      bumpInterval: 60,
      notes: 'The one that renews at $14.99.',
    },
    {
      title: 'Bring passport',
      dueAt: withTime(inThreeDays, 7, 30),
      emoji: '🛂',
    },
    {
      title: 'Take medication',
      dueAt: withTime(tomorrow, 8, 0),
      emoji: '💊',
      repeatRule: { frequency: 'daily', interval: 1 },
      bumpEnabled: true,
      bumpInterval: 30,
    },
    {
      title: 'Book haircut',
      dueAt: null,
      emoji: '💇',
    },
    {
      title: 'Find that blue jacket',
      dueAt: null,
      emoji: '🔖',
    },
  ];

  const active = drafts.map((draft) => createReminder(draft, settings));

  // A couple of finished ones so the Completed screen is not empty either.
  const done: Reminder[] = [
    { title: 'Water the plants', emoji: '🪴', hoursAgo: 4 },
    { title: 'Pay the electric bill', emoji: '💸', hoursAgo: 28 },
    { title: 'Reply to Sam', emoji: '💬', hoursAgo: 52 },
  ].map((item) => {
    const completedAt = new Date(now.getTime() - item.hoursAgo * 60 * 60 * 1000);
    const base = createReminder({ title: item.title, dueAt: completedAt, emoji: item.emoji }, settings);
    return {
      ...base,
      createdAt: new Date(completedAt.getTime() - 60 * 60 * 1000).toISOString(),
      status: 'completed' as const,
      completedAt: completedAt.toISOString(),
    };
  });

  return [...active, ...done];
}
