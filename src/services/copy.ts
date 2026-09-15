import { Personality } from '@/types/reminder';
import { pickDeterministic, pickRandom } from '@/utils/id';

/**
 * Every user-facing string that has a voice lives here.
 *
 * Notification lines are picked deterministically from a seed (reminder id +
 * nudge index) so a given nudge always reads the same — reschedules don't
 * reshuffle the wording — while consecutive nudges never repeat a sentence.
 */

/** Which rung of the escalation ladder a notification sits on. */
export type NudgeStage = 0 | 1 | 2 | 3 | 4;

type StageCopy = Record<NudgeStage, string[]>;

const NOTIFICATION_COPY: Record<Personality, StageCopy> = {
  normal: {
    0: ['{title}', 'Reminder: {title}', 'Time for {title}.'],
    1: ['Still on your list: {title}', '{title} is still open.', 'A nudge about {title}.'],
    2: ['{title} — not done yet.', 'Second nudge: {title}', 'Checking in on {title}.'],
    3: ['{title} is still waiting.', 'Another nudge: {title}', '{title}, when you get a moment.'],
    4: ['{title}. Still.', 'Last few nudges about {title}.', '{title} — this one keeps coming back.'],
  },
  friendly: {
    0: ['psst… {title} 🌿', 'gentle nudge: {title} ✨', 'hey — {title} 🫶'],
    1: ['still here about {title} 🙂', 'no rush, but… {title} 🌸', '{title}, whenever you can ☁️'],
    2: ['👀 {title}', 'quietly pointing at {title} 🫥', 'me again: {title} 🌼'],
    3: ['okay, nudge number four 😅 {title}', '{title}? 🥺', 'still thinking about {title} 🌙'],
    4: ['i believe in you. {title} 💪', '{title} — you have got this ✨', 'one day we will both be free of {title} 🫠'],
  },
  pushy: {
    0: ['{title}. Now.', '{title} — do it.', 'Handle {title}.'],
    1: ['You still have not done {title}.', '{title}. Still waiting.', 'Nope. {title} is not done.'],
    2: ['{title}. Seriously.', 'Still no {title}.', 'Third time: {title}.'],
    3: ['Okay. {title}. We are doing this.', '{title}. I am not going away.', 'We both know about {title}.'],
    4: ['{title}. I will keep doing this.', 'You know what this is about. {title}.', '{title}. Your move.'],
  },
  unhinged: {
    0: ['{title}. THE TIME IS NOW.', '🚨 {title} 🚨', 'IT IS {title} O_CLOCK.'],
    1: ['{title} HAS BEEN IGNORED.', 'THE {title} SITUATION IS ONGOING.', 'I HAVE NOT FORGOTTEN {title}.'],
    2: ['👁️ {title}', '{title}. I LIVE IN YOUR PHONE NOW.', 'THE {title} HAS HAD ENOUGH.'],
    3: ['WE ARE BOTH SUFFERING. {title}.', '{title}. I AM BEGGING.', 'IT IS PERSONAL NOW. {title}.'],
    4: ['{title}. THIS IS MY WHOLE PERSONALITY.', 'I WILL OUTLAST YOU. {title}.', '{title} 🫠'],
  },
};

/** Second line on later nudges — the first one stays clean. */
const SUBTITLES: Record<Personality, string[]> = {
  normal: ['Swipe to mark it done.', 'Tap to open Bump.'],
  friendly: ['tap when it is handled 🫶', 'i will stop once it is done ✨'],
  pushy: ['Mark it done and I stop.', 'Done? Prove it.'],
  unhinged: ['MARK IT DONE AND I VANISH.', 'I AM CONTRACTUALLY OBLIGATED TO CONTINUE.'],
};

/** Preview copy shown in onboarding and in Settings. */
export const PERSONALITY_PREVIEWS: Record<Personality, { label: string; sample: string; emoji: string; blurb: string }> = {
  normal: {
    label: 'Normal',
    emoji: '🤍',
    sample: 'Time to move your laundry.',
    blurb: 'Clear and out of the way.',
  },
  friendly: {
    label: 'Friendly',
    emoji: '🫶',
    sample: 'psst… your laundry is ready 🧺',
    blurb: 'Warm, soft, a little cute.',
  },
  pushy: {
    label: 'Pushy',
    emoji: '😤',
    sample: 'You still have not moved your laundry.',
    blurb: 'For things you will absolutely avoid.',
  },
  unhinged: {
    label: 'Unhinged',
    emoji: '🔥',
    sample: 'THE WASHING MACHINE HAS HAD ENOUGH.',
    blurb: 'Chaos. Effective chaos.',
  },
};

function stageFor(nudgeIndex: number): NudgeStage {
  return Math.min(4, Math.max(0, nudgeIndex)) as NudgeStage;
}

export interface NotificationCopy {
  title: string;
  body?: string;
}

/**
 * Builds the text for one scheduled notification.
 *
 * @param nudgeIndex 0 is the original reminder; 1+ are Bump follow-ups.
 */
export function buildNotificationCopy(
  reminderTitle: string,
  personality: Personality,
  nudgeIndex: number,
  seed: string,
): NotificationCopy {
  const stage = stageFor(nudgeIndex);
  const variants = NOTIFICATION_COPY[personality][stage];
  const line = pickDeterministic(variants, `${seed}:${nudgeIndex}`).replace(
    /\{title\}/g,
    reminderTitle,
  );

  if (nudgeIndex === 0) return { title: line };

  const subtitles = SUBTITLES[personality];
  return { title: line, body: pickDeterministic(subtitles, `${seed}:sub:${nudgeIndex}`) };
}

/* ------------------------------------------------------------ in-app copy */

export function greeting(now = new Date()): string {
  const hour = now.getHours();
  if (hour < 5) return 'Still up 🌙';
  if (hour < 12) return 'Good morning 👋';
  if (hour < 17) return 'Good afternoon ☀️';
  if (hour < 21) return 'Good evening 🌆';
  return 'Good night 🌙';
}

export const INPUT_PLACEHOLDERS = [
  'Call Mom Sunday afternoon',
  'Cancel Hulu next Thursday',
  'Take chicken out at 4',
  'Bring passport Friday morning',
  'Move laundry in 45 minutes',
  'Pay rent on the 1st',
  'Text Sarah Monday morning',
  'Water the plants every 3 days',
];

const EMPTY_ALL: { title: string; body: string }[] = [
  { title: 'Nothing to remember right now.', body: 'Nice.' },
  { title: 'Your brain is officially off duty.', body: 'Enjoy it.' },
  { title: 'Completely empty in here.', body: 'Suspiciously peaceful.' },
  { title: 'No reminders, no notes, no pressure.', body: 'Type something above when it comes to you.' },
];

const EMPTY_TODAY: { title: string; body: string }[] = [
  { title: 'Today is clear.', body: 'Anything later is tucked away in Upcoming.' },
  { title: 'Nothing left for today.', body: 'You are ahead of it.' },
  { title: 'All done for today.', body: 'The rest can wait.' },
];

const EMPTY_COMPLETED: { title: string; body: string }[] = [
  { title: 'Nothing finished yet.', body: 'The first one is the fun one.' },
  { title: 'This is where done things land.', body: 'Go complete something ✨' },
];

export function emptyState(kind: 'all' | 'today' | 'completed') {
  const pool = kind === 'all' ? EMPTY_ALL : kind === 'today' ? EMPTY_TODAY : EMPTY_COMPLETED;
  return pickRandom(pool);
}

const COMPLETION_CHEERS: Record<Personality, string[]> = {
  normal: ['Done.', 'Nice.', 'Handled.', 'That is off your plate.'],
  friendly: ['love that ✨', 'look at you 🫶', 'one less thing 🌿', 'done and dusted 🌸'],
  pushy: ['Finally.', 'Was that so hard?', 'Good.', 'See? Easy.'],
  unhinged: ['I AM AT PEACE.', 'THE PROPHECY IS FULFILLED.', 'WE DID IT.', 'MY WORK HERE IS DONE.'],
};

export function completionCheer(personality: Personality): string {
  return pickRandom(COMPLETION_CHEERS[personality]);
}

export function rememberedSummary(count: number): string {
  if (count === 0) return 'Nothing remembered yet this week';
  if (count === 1) return '1 thing remembered this week ✨';
  return `${count} things remembered this week ✨`;
}

const SNOOZE_NOTES: Record<Personality, string[]> = {
  normal: ['Pushed back 15 minutes.', 'Moved to later.'],
  friendly: ['okay, later 🌿', 'no problem — 15 more minutes ☁️'],
  pushy: ['Fine. 15 minutes.', 'Delaying the inevitable.'],
  unhinged: ['I WILL RETURN.', 'THIS CHANGES NOTHING.'],
};

export function snoozeNote(personality: Personality): string {
  return pickRandom(SNOOZE_NOTES[personality]);
}
