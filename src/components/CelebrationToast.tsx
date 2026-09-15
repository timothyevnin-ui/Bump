import React from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, FadeOutDown } from 'react-native-reanimated';
import { radius, softShadow, spacing } from '@/constants/theme';
import { usePalette } from '@/hooks/useTheme';
import { Celebration } from '@/hooks/useReminders';
import { AppText } from '@/components/AppText';

/** The little "Done." puff that appears after completing something. */
export function CelebrationToast({ celebration }: { celebration: Celebration | null }) {
  const palette = usePalette();
  if (!celebration) return null;

  const success = celebration.tone === 'success';

  return (
    <View pointerEvents="none" style={styles.host}>
      <Animated.View
        key={celebration.id}
        entering={FadeInDown.springify().damping(18).stiffness(220)}
        exiting={FadeOutDown.duration(200)}
        style={[
          styles.toast,
          softShadow(palette, 2),
          { backgroundColor: success ? palette.successSoft : palette.card },
        ]}
      >
        <AppText variant="label" color={success ? palette.success : palette.text}>
          {celebration.message}
        </AppText>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: spacing.lg,
    alignItems: 'center',
  },
  toast: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.pill,
  },
});
