import Constants from 'expo-constants';
import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Linking, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { spacing } from '@/constants/theme';
import { BUMP_INTERVALS, ThemePreference } from '@/types/reminder';
import {
  getPermissionGranted,
  requestNotificationPermission,
} from '@/services/notifications';
import { haptics } from '@/utils/haptics';
import { AppText } from '@/components/AppText';
import { PersonalitySelector } from '@/components/PersonalitySelector';
import { PrimaryButton } from '@/components/PrimaryButton';
import { QuickTimeButton } from '@/components/QuickTimeButton';
import {
  SettingsChoiceRow,
  SettingsDivider,
  SettingsGroup,
  SettingsSwitchRow,
} from '@/components/SettingsGroup';
import { bumpIntervalLabel } from '@/components/BumpToggle';
import { useReminders } from '@/hooks/useReminders';
import { useSettings } from '@/hooks/useSettings';
import { usePalette } from '@/hooks/useTheme';

const THEME_OPTIONS: { value: ThemePreference; label: string; emoji: string }[] = [
  { value: 'system', label: 'Automatic', emoji: '🌗' },
  { value: 'light', label: 'Light', emoji: '☀️' },
  { value: 'dark', label: 'Dark', emoji: '🌙' },
];

const START_OF_DAY_OPTIONS = [6, 7, 8, 9, 10];

export default function SettingsScreen() {
  const palette = usePalette();
  const insets = useSafeAreaInsets();
  const { settings, update } = useSettings();
  const { loadSampleData, clearEverything, scheduledCount, reminders } = useReminders();
  const [permissionGranted, setPermissionGranted] = useState<boolean | null>(null);

  useEffect(() => {
    void getPermissionGranted().then(setPermissionGranted);
  }, []);

  const toggleNotifications = useCallback(
    async (next: boolean) => {
      if (!next) {
        update({ notificationsEnabled: false });
        return;
      }
      const granted = await requestNotificationPermission();
      setPermissionGranted(granted);
      update({ notificationsEnabled: granted });
      if (!granted) {
        Alert.alert(
          'Notifications are off',
          'Bump can only nudge you if notifications are allowed. You can turn them on in Settings.',
          [
            { text: 'Not now', style: 'cancel' },
            { text: 'Open Settings', onPress: () => void Linking.openSettings() },
          ],
        );
      }
    },
    [update],
  );

  const confirmClear = () => {
    Alert.alert('Delete every reminder?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete all', style: 'destructive', onPress: clearEverything },
    ]);
  };

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + spacing.lg, paddingBottom: spacing.xxl },
      ]}
    >
      <AppText variant="hero" style={styles.heading}>
        Settings
      </AppText>

      <SettingsGroup
        title="Reminder personality"
        caption="Changes how every notification is worded, including the ones already scheduled."
      >
        <View style={styles.personality}>
          <PersonalitySelector
            value={settings.personality}
            onChange={(personality) => {
              haptics.tap();
              update({ personality });
            }}
            compact
          />
        </View>
      </SettingsGroup>

      <SettingsGroup
        title="Bump until done"
        caption="How often Bump follows up when a reminder is still not done."
      >
        <SettingsChoiceRow label="Default Bump frequency">
          {BUMP_INTERVALS.map((interval) => (
            <QuickTimeButton
              key={interval}
              label={bumpIntervalLabel(interval)}
              selected={settings.defaultBumpInterval === interval}
              onPress={() => update({ defaultBumpInterval: interval })}
            />
          ))}
        </SettingsChoiceRow>
        <SettingsDivider />
        <SettingsSwitchRow
          label="Bump new reminders by default"
          description="Turn this on if you want follow-ups without ticking the box every time."
          value={settings.bumpByDefault}
          onChange={(bumpByDefault) => update({ bumpByDefault })}
        />
      </SettingsGroup>

      <SettingsGroup
        title="Notifications"
        caption={
          settings.notificationsEnabled
            ? `${scheduledCount} notification${scheduledCount === 1 ? '' : 's'} queued with the system.`
            : 'Without notifications Bump is just a list.'
        }
      >
        <SettingsSwitchRow
          label="Allow notifications"
          description={
            permissionGranted === false ? 'Permission is currently denied on this device.' : undefined
          }
          value={settings.notificationsEnabled}
          onChange={(next) => void toggleNotifications(next)}
        />
      </SettingsGroup>

      <SettingsGroup title="Feel">
        <SettingsSwitchRow
          label="Haptics"
          description="The little taps when you complete or snooze something."
          value={settings.hapticsEnabled}
          onChange={(hapticsEnabled) => update({ hapticsEnabled })}
        />
        <SettingsDivider />
        <SettingsChoiceRow label="Appearance">
          {THEME_OPTIONS.map((option) => (
            <QuickTimeButton
              key={option.value}
              label={option.label}
              emoji={option.emoji}
              selected={settings.theme === option.value}
              onPress={() => update({ theme: option.value })}
            />
          ))}
        </SettingsChoiceRow>
        <SettingsDivider />
        <SettingsChoiceRow
          label="Start of day"
          description="Bump uses this to decide what “morning” means when you do not give a time."
        >
          {START_OF_DAY_OPTIONS.map((hour) => (
            <QuickTimeButton
              key={hour}
              label={`${hour} AM`}
              selected={settings.startOfDayHour === hour}
              onPress={() => update({ startOfDayHour: hour })}
            />
          ))}
        </SettingsChoiceRow>
      </SettingsGroup>

      <SettingsGroup title="About Bump">
        <View style={styles.about}>
          <AppText variant="body">Bump {Constants.expoConfig?.version ?? '1.0.0'}</AppText>
          <AppText variant="caption" tone="secondary" style={styles.aboutBody}>
            Tell Bump what you do not want to forget. It figures out when, reminds you, and keeps
            reminding you until it is done.
          </AppText>
          <AppText variant="caption" tone="tertiary">
            {reminders.filter((reminder) => reminder.status === 'active').length} active ·{' '}
            {reminders.filter((reminder) => reminder.status === 'completed').length} completed ·
            stored on this device only
          </AppText>
        </View>
      </SettingsGroup>

      {__DEV__ ? (
        <SettingsGroup
          title="Developer"
          caption="Only visible in development builds."
        >
          <View style={styles.dev}>
            <PrimaryButton
              label="Load sample reminders"
              icon="sparkles"
              variant="quiet"
              onPress={loadSampleData}
            />
            <PrimaryButton label="Delete all reminders" variant="quiet" onPress={confirmClear} />
          </View>
        </SettingsGroup>
      ) : null}

      <AppText variant="caption" color={palette.textTertiary} style={styles.footer}>
        Made for people who hate reminder apps.
      </AppText>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: spacing.lg,
    gap: spacing.xl,
  },
  heading: {
    marginBottom: -spacing.sm,
  },
  personality: {
    padding: spacing.md,
  },
  about: {
    padding: spacing.md,
    gap: spacing.xs,
  },
  aboutBody: {
    lineHeight: 18,
  },
  dev: {
    padding: spacing.md,
    gap: spacing.sm,
  },
  footer: {
    textAlign: 'center',
  },
});
