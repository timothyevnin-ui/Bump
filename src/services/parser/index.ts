/**
 * Public surface of the parsing layer.
 *
 * Everything in the app imports from here, never from the implementation
 * files, so this can be swapped for an LLM-backed parser (same signature,
 * async) without touching a single screen.
 */
export { parseReminderText, advanceByRule } from './naturalLanguage';
export type { ParsedReminder, ParseConfidence, ParseOptions } from './naturalLanguage';
