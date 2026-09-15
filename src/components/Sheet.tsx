import React from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeOut, SlideInDown, SlideOutDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { radius, softShadow, spacing } from '@/constants/theme';
import { usePalette } from '@/hooks/useTheme';

export interface SheetProps {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

/**
 * The bottom sheet used for confirmations and quick edits. Backdrop tap
 * dismisses; content is laid out by the caller.
 */
export function Sheet({ visible, onClose, children }: SheetProps) {
  const palette = usePalette();
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      {visible ? (
        <View style={styles.root}>
          <Animated.View
            entering={FadeIn.duration(200)}
            exiting={FadeOut.duration(180)}
            style={StyleSheet.absoluteFill}
          >
            <Pressable
              accessibilityLabel="Dismiss"
              onPress={onClose}
              style={[StyleSheet.absoluteFill, { backgroundColor: palette.scrim }]}
            />
          </Animated.View>

          <Animated.View
            entering={SlideInDown.springify().damping(20).stiffness(190)}
            exiting={SlideOutDown.duration(200)}
            style={[
              styles.sheet,
              softShadow(palette, 3),
              {
                backgroundColor: palette.background,
                paddingBottom: Math.max(insets.bottom, spacing.lg) + spacing.sm,
              },
            ]}
          >
            <View style={[styles.grabber, { backgroundColor: palette.border }]} />
            {children}
          </Animated.View>
        </View>
      ) : null}
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  grabber: {
    width: 38,
    height: 5,
    borderRadius: 3,
    alignSelf: 'center',
    marginBottom: spacing.md,
  },
});
