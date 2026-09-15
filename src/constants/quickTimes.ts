import { addDays, addMinutes, startOfDay, withTime } from '@/utils/date';

/**
 * The one-tap times under the main input. Between these and the parser, most
 * reminders never need a date picker.
 */
export interface QuickTime {
  id: string;
  label: string;
  emoji: string;
  resolve: (now: Date, startOfDayHour: number) => Date;
}

export const QUICK_TIMES: QuickTime[] = [
  { id: 'min10', label: 'In 10 min', emoji: '⏱', resolve: (now) => addMinutes(now, 10) },
  { id: 'min30', label: 'In 30 min', emoji: '🫧', resolve: (now) => addMinutes(now, 30) },
  { id: 'hour1', label: 'In 1 hour', emoji: '🕐', resolve: (now) => addMinutes(now, 60) },
  {
    id: 'tonight',
    label: 'Tonight',
    emoji: '🌙',
    resolve: (now) => {
      const tonight = withTime(now, 20, 0);
      // Already past 8pm? "Tonight" can only mean soon.
      return tonight.getTime() > now.getTime() ? tonight : addMinutes(now, 60);
    },
  },
  {
    id: 'tomorrow',
    label: 'Tomorrow',
    emoji: '☀️',
    resolve: (now, startOfDayHour) =>
      withTime(addDays(startOfDay(now), 1), Math.min(11, startOfDayHour + 1), 0),
  },
];
