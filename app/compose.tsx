import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { spacing } from '@/constants/theme';
import { AppText } from '@/components/AppText';
import { ConfirmationSheet } from '@/components/ConfirmationSheet';
import { PressableScale } from '@/components/PressableScale';
import { ReminderInput } from '@/components/ReminderInput';
import { useComposer } from '@/hooks/useComposer';
import { useReminders } from '@/hooks/useReminders';
import { useSettings } from '@/hooks/useSettings';
import { usePalette } from '@/hooks/useTheme';

/**
 * The full-screen composer behind the middle tab. Same behaviour as the home
 * input, but it opens with the keyboard up and closes itself once something
 * has been created.
 */
export default function ComposeScreen() {
  const palette = usePalette();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { settings } = useSettings();
  const { now } = useReminders();
  const inputRef = useRef<TextInput>(null);

  const composer = useComposer(() => {
    if (router.canGoBack()) router.back();
  });

  useEffect(() => {
    const timer = setTimeout(() => inputRef.current?.focus(), 260);
    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={[styles.flex, { backgroundColor: palette.background }]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={[styles.content, { paddingTop: insets.top + spacing.md }]}>
          <View style={styles.header}>
            <View style={styles.headerText}>
              <AppText variant="title">Quick reminder</AppText>
              <AppText variant="caption" tone="secondary">
                Type it how you would say it.
              </AppText>
            </View>
            <PressableScale
              onPress={() => router.back()}
              activeScale={0.9}
              accessibilityRole="button"
              accessibilityLabel="Close"
              style={[styles.close, { backgroundColor: palette.surface }]}
            >
              <Ionicons name="close" size={20} color={palette.textSecondary} />
            </PressableScale>
          </View>

          <ReminderInput
            ref={inputRef}
            value={composer.text}
            onChangeText={composer.setText}
            onSubmit={composer.submit}
            onQuickTime={composer.submitWithQuickTime}
            preview={composer.preview}
          />

          <AppText variant="caption" tone="tertiary" style={styles.hint}>
            Try “cancel the trial next Thursday”, “gym at 6”, or “water plants every 3 days”.
          </AppText>
        </View>
      </KeyboardAvoidingView>

      <ConfirmationSheet
        visible={composer.pending !== null}
        parsed={composer.pending}
        now={now}
        defaultBumpEnabled={settings.bumpByDefault}
        defaultBumpInterval={settings.defaultBumpInterval}
        onConfirm={composer.confirm}
        onCancel={composer.cancel}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    gap: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  headerText: {
    flex: 1,
    gap: 2,
  },
  close: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hint: {
    textAlign: 'center',
    lineHeight: 19,
  },
});
