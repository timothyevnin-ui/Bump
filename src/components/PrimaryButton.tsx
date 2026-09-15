import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { ActivityIndicator, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { radius, softShadow, spacing } from '@/constants/theme';
import { usePalette } from '@/hooks/useTheme';
import { AppText } from '@/components/AppText';
import { PressableScale } from '@/components/PressableScale';

export interface PrimaryButtonProps {
  label: string;
  onPress: () => void;
  icon?: React.ComponentProps<typeof Ionicons>['name'];
  disabled?: boolean;
  loading?: boolean;
  variant?: 'solid' | 'quiet';
  style?: StyleProp<ViewStyle>;
}

/** The single obvious button. Solid by default, quiet for secondary actions. */
export function PrimaryButton({
  label,
  onPress,
  icon,
  disabled = false,
  loading = false,
  variant = 'solid',
  style,
}: PrimaryButtonProps) {
  const palette = usePalette();
  const solid = variant === 'solid';
  const background = solid ? palette.accent : palette.surface;
  const foreground = solid ? palette.accentText : palette.textSecondary;

  return (
    <PressableScale
      onPress={onPress}
      disabled={disabled || loading}
      haptic="commit"
      activeScale={0.97}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: disabled || loading }}
      style={[
        styles.button,
        { backgroundColor: background, opacity: disabled ? 0.45 : 1 },
        solid ? softShadow(palette, 2) : null,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={foreground} />
      ) : (
        <View style={styles.content}>
          {icon ? <Ionicons name={icon} size={18} color={foreground} /> : null}
          <AppText variant="label" color={foreground}>
            {label}
          </AppText>
        </View>
      )}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  button: {
    height: 54,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
});
