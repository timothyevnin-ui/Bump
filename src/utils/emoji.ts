/**
 * Picks a small, tasteful emoji for a reminder based on its wording.
 *
 * Keyword order matters: the first matching rule wins, so put specific
 * phrases ("dry cleaning") above generic ones ("clean").
 */
const RULES: { emoji: string; keywords: string[] }[] = [
  { emoji: '💊', keywords: ['prescription', 'pharmacy', 'medication', 'medicine', 'pills', 'vitamin', 'refill'] },
  { emoji: '🧺', keywords: ['laundry', 'washing', 'dryer', 'wash', 'fold clothes'] },
  { emoji: '🧼', keywords: ['dishes', 'dishwasher', 'clean', 'tidy', 'vacuum'] },
  { emoji: '📞', keywords: ['call', 'ring', 'phone', 'facetime', 'dial'] },
  { emoji: '💬', keywords: ['text', 'message', 'dm', 'reply', 'respond', 'email back'] },
  { emoji: '✉️', keywords: ['email', 'inbox', 'send a note'] },
  { emoji: '💸', keywords: ['pay', 'rent', 'bill', 'invoice', 'venmo', 'transfer', 'tax', 'mortgage'] },
  { emoji: '🚫', keywords: ['cancel', 'unsubscribe', 'free trial', 'downgrade'] },
  { emoji: '🛒', keywords: ['buy', 'grocer', 'groceries', 'shop', 'order', 'pick up milk', 'target', 'costco'] },
  { emoji: '🍗', keywords: ['chicken', 'defrost', 'thaw', 'take out the chicken'] },
  { emoji: '🍳', keywords: ['cook', 'dinner', 'lunch', 'breakfast', 'meal', 'oven', 'bake'] },
  { emoji: '☕️', keywords: ['coffee', 'espresso', 'tea'] },
  { emoji: '🐕', keywords: ['dog', 'walk the', 'puppy', 'vet'] },
  { emoji: '🐈', keywords: ['cat', 'litter', 'kitten'] },
  { emoji: '🪴', keywords: ['plant', 'water the', 'garden', 'flowers'] },
  { emoji: '🏋️', keywords: ['gym', 'workout', 'run', 'lift', 'yoga', 'pilates', 'training', 'exercise'] },
  { emoji: '💇', keywords: ['haircut', 'hair', 'barber', 'salon', 'nails'] },
  { emoji: '🩺', keywords: ['doctor', 'dentist', 'appointment', 'checkup', 'therapy', 'therapist'] },
  { emoji: '🛫', keywords: ['flight', 'airport', 'plane', 'check in', 'boarding'] },
  { emoji: '🛂', keywords: ['passport', 'visa', 'id card', 'license'] },
  { emoji: '🎁', keywords: ['gift', 'present', 'birthday', 'anniversary', 'card for'] },
  { emoji: '🚗', keywords: ['car', 'oil change', 'gas', 'parking', 'drive', 'uber'] },
  { emoji: '🗑️', keywords: ['trash', 'garbage', 'bins', 'recycling'] },
  { emoji: '📦', keywords: ['package', 'return', 'ship', 'mail', 'amazon', 'delivery'] },
  { emoji: '💼', keywords: ['work', 'meeting', 'standup', 'report', 'deck', 'slides', 'deadline'] },
  { emoji: '📚', keywords: ['read', 'book', 'study', 'homework', 'class', 'lecture'] },
  { emoji: '🎟️', keywords: ['tickets', 'book a table', 'reservation', 'concert', 'show'] },
  { emoji: '🎂', keywords: ['cake', 'party', 'celebrate'] },
  { emoji: '💤', keywords: ['sleep', 'bed', 'nap', 'wind down'] },
  { emoji: '🚿', keywords: ['shower', 'bath', 'skincare', 'brush'] },
  { emoji: '💧', keywords: ['drink water', 'hydrate'] },
];

const DEFAULT_EMOJI = '🔖';

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Whole-word matching matters more than it looks: without it "bring passport"
 * matches "ring" and gets a telephone.
 */
const COMPILED = RULES.map((rule) => ({
  emoji: rule.emoji,
  pattern: new RegExp(`\\b(?:${rule.keywords.map(escapeRegExp).join('|')})\\b`, 'i'),
}));

export function pickEmoji(text: string): string {
  for (const rule of COMPILED) {
    if (rule.pattern.test(text)) return rule.emoji;
  }
  return DEFAULT_EMOJI;
}

/** Emoji offered in the detail screen when the auto-pick guesses wrong. */
export const EMOJI_CHOICES = [
  '🔖', '📞', '💬', '💸', '🧺', '💊', '🛒', '🏋️', '🩺', '🎁',
  '📦', '🚗', '🪴', '🐕', '🍳', '☕️', '📚', '💼', '🛫', '✨',
];
