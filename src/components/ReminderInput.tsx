import { Ionicons } from '@expo/vector-icons';
import React, { forwardRef, useState } from 'react';
import { Animated, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import Reanimated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { radius, softShadow, spacing, type } from '@/constants/theme';
import { usePalette } from '@/hooks/useTheme';
import { QUICK_TIMES, QuickTime } from '@/constants/quickTimes';
import { useRotatingPlaceholder } from '@/hooks/useRotatingPlaceholder';
import { AppText } from '@/components/AppText';
import { PressableScale } from '@/components/PressableScale';
import { QuickTimeButton } from '@/components/QuickTimeButton';

export interface ReminderInputProps {
  value: string;
  onChangeText: (value: string) => void;
  /** Create using whatever the parser found in the text. */
  onSubmit: () => void;
  /** Create using an explicit one-tap time, ignoring any parsed time. */
  onQuickTime: (quick: QuickTime) => void;
  autoFocus?: boolean;
  /** Live "we read this as…" hint, e.g. "Tomorrow · 2 PM". */
  preview?: string | null;
}

/**
 * The one thing on the home screen that matters: type a sentence, press the
 * button. The preset row underneath means a bare "Laundry" is still two taps.
 */
export const ReminderInput = forwardRef<TextInput, ReminderInputProps>(function ReminderInput(
  { value, onChangeText, onSubmit, onQuickTime, autoFocus = false, preview = null },
  ref,
) {
  const palette = usePalette();
  const [focused, setFocused] = useState(false);
  const { placeholder, opacity } = useRotatingPlaceholder(focused || value.length > 0);

  const canSubmit = value.trim().length > 0;

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.field,
          softShadow(palette, 2),
          {
            backgroundColor: palette.card,
            borderColor: focused ? palette.accent : palette.border,
          },
        ]}
      >
        <View style={styles.inputRow}>
          <View style={styles.inputWrap}>
            <TextInput
              ref={ref}
              value={value}
              onChangeText={onChangeText}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              onSubmitEditing={() => canSubmit && onSubmit()}
              autoFocus={autoFocus}
              multiline
              blurOnSubmit
              returnKeyType="done"
              accessibilityLabel="What do you need to remember?"
              selectionColor={palette.accent}
              style={[styles.input, type.body, { color: palette.text }]}
              placeholder=""
            />
            {value.length === 0 ? (
              // Rendered separately so the example text can cross-fade.
              <Animated.View pointerEvents="none" style={[styles.placeholder, { opacity }]}>
                <AppText variant="body" tone="tertiary" numberOfLines={1}>
                  {placeholder}
                </AppText>
              </Animated.View>
            ) : null}
          </View>

          <PressableScale
            onPress={onSubmit}
            disabled={!canSubmit}
            haptic="commit"
            activeScale={0.9}
            accessibilityRole="button"
            accessibilityLabel="Create reminder"
            accessibilityState={{ disabled: !canSubmit }}
            style={[
              styles.submit,
              {
                backgroundColor: canSubmit ? palette.accent : palette.surface,
              },
            ]}
          >
            <Ionicons
              name="arrow-up"
              size={22}
              color={canSubmit ? palette.accentText : palette.textTertiary}
            />
          </PressableScale>
        </View>

        {preview ? (
          <Reanimated.View
            entering={FadeIn.duration(180)}
            exiting={FadeOut.duration(120)}
            style={[styles.preview, { borderTopColor: palette.border }]}
          >
            <Ionicons name="sparkles" size={13} color={palette.accent} />
            <AppText variant="caption" color={palette.accent}>
              {preview}
            </AppText>
          </Reanimated.View>
        ) : null}
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.presets}
      >
        {QUICK_TIMES.map((quick) => (
          <QuickTimeButton
            key={quick.id}
            label={quick.label}
            emoji={quick.emoji}
            disabled={!canSubmit}
            onPress={() => onQuickTime(quick)}
          />
        ))}
      </ScrollView>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
  },
  field: {
    borderRadius: radius.lg,
    borderWidth: 1.5,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    padding: spacing.md,
  },
  inputWrap: {
    flex: 1,
    justifyContent: 'center',
    minHeight: 46,
  },
  input: {
    paddingTop: 12,
    paddingBottom: 12,
    paddingHorizontal: spacing.xs,
    maxHeight: 120,
  },
  placeholder: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'center',
    paddingHorizontal: spacing.xs,
  },
  submit: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
  },
  preview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderTopWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  presets: {
    gap: spacing.sm,
    paddingRight: spacing.lg,
  },
});
