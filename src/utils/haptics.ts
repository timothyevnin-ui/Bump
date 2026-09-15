import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

/**
 * Thin wrapper so every call site can respect the user's haptics setting and
 * so web (where the module is a no-op) never throws.
 */
let enabled = true;

export function setHapticsEnabled(next: boolean) {
  enabled = next;
}

function supported() {
  return enabled && Platform.OS !== 'web';
}

export const haptics = {
  /** Light tick for taps on chips, toggles and list rows. */
  tap() {
    if (!supported()) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  },
  /** Medium thud for committing something (creating, snoozing). */
  commit() {
    if (!supported()) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  },
  /** The satisfying one — completing a reminder. */
  success() {
    if (!supported()) return;
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  },
  warning() {
    if (!supported()) return;
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  },
  /** Fires as a swipe crosses its action threshold. */
  threshold() {
    if (!supported()) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Rigid);
  },
};
