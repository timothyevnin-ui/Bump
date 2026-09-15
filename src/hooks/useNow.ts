import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

/**
 * A clock that re-renders its consumer on a tick and whenever the app returns
 * to the foreground — so a reminder slides from "Later Today" into "Now"
 * without the user pulling to refresh.
 */
export function useNow(intervalMs = 30_000): Date {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), intervalMs);
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') setNow(new Date());
    });
    return () => {
      clearInterval(timer);
      subscription.remove();
    };
  }, [intervalMs]);

  return now;
}
