import { useEffect, useState } from 'react';
import { Animated, Easing } from 'react-native';
import { INPUT_PLACEHOLDERS } from '@/services/copy';

/**
 * Cycles the example text in the main input so the app teaches its own syntax.
 * Pauses while the user is typing — a moving target is distracting.
 */
export function useRotatingPlaceholder(paused: boolean, intervalMs = 3400) {
  const [index, setIndex] = useState(() => Math.floor(Math.random() * INPUT_PLACEHOLDERS.length));
  const [opacity] = useState(() => new Animated.Value(1));

  useEffect(() => {
    if (paused) return;
    const timer = setInterval(() => {
      Animated.timing(opacity, {
        toValue: 0,
        duration: 260,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (!finished) return;
        setIndex((current) => (current + 1) % INPUT_PLACEHOLDERS.length);
        Animated.timing(opacity, {
          toValue: 1,
          duration: 320,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }).start();
      });
    }, intervalMs);
    return () => clearInterval(timer);
  }, [paused, intervalMs, opacity]);

  return {
    placeholder: INPUT_PLACEHOLDERS[index] ?? INPUT_PLACEHOLDERS[0] ?? '',
    opacity,
  };
}
