/**
 * Small, collision-resistant-enough id generator. Local-only for now; when
 * Supabase lands these become client-generated UUIDs instead.
 */
export function createId(prefix = 'r'): string {
  const time = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 10);
  return `${prefix}_${time}${rand}`;
}

/**
 * Deterministic 32-bit hash. Used to pick copy variants so a given reminder
 * always gets the same phrasing for a given nudge — stable across reschedules,
 * but different between reminders.
 */
export function hashString(value: string): number {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash);
}

/** Picks an item from `items` deterministically from `seed`. */
export function pickDeterministic<T>(items: readonly T[], seed: string): T {
  if (items.length === 0) throw new Error('pickDeterministic called with an empty list');
  const index = hashString(seed) % items.length;
  return items[index] as T;
}

export function pickRandom<T>(items: readonly T[]): T {
  if (items.length === 0) throw new Error('pickRandom called with an empty list');
  return items[Math.floor(Math.random() * items.length)] as T;
}
