import React, { useCallback } from 'react';
import { Pressable, PressableProps, StyleProp, ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { haptics } from '@/utils/haptics';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export interface PressableScaleProps extends Omit<PressableProps, 'style'> {
  style?: StyleProp<ViewStyle>;
  /** How far it squishes. Smaller elements want a gentler value. */
  activeScale?: number;
  haptic?: 'none' | 'tap' | 'commit';
  children?: React.ReactNode;
}

/**
 * The standard tap target: springs down under the finger and ticks the taptic
 * engine. Used for every button, chip and card in the app.
 */
export function PressableScale({
  style,
  activeScale = 0.96,
  haptic = 'tap',
  onPressIn,
  children,
  ...rest
}: PressableScaleProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }] }));

  const handlePressIn = useCallback<NonNullable<PressableProps['onPressIn']>>(
    (event) => {
      scale.set(withSpring(activeScale, { damping: 18, stiffness: 320 }));
      if (haptic === 'tap') haptics.tap();
      if (haptic === 'commit') haptics.commit();
      onPressIn?.(event);
    },
    [activeScale, haptic, onPressIn, scale],
  );

  const handlePressOut = useCallback(() => {
    scale.set(withSpring(1, { damping: 16, stiffness: 260 }));
  }, [scale]);

  return (
    <AnimatedPressable
      {...rest}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[style, animatedStyle]}
    >
      {children}
    </AnimatedPressable>
  );
}
