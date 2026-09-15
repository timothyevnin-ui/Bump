import {
  Nunito_500Medium,
  Nunito_600SemiBold,
  Nunito_700Bold,
  Nunito_800ExtraBold,
  useFonts,
} from '@expo-google-fonts/nunito';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import * as Notifications from 'expo-notifications';
import React, { useEffect } from 'react';
import { Platform, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { CelebrationToast } from '@/components/CelebrationToast';
import {
  configureNotificationHandler,
  prepareNotificationChannels,
  readNotificationData,
} from '@/services/notifications';
import { RemindersProvider, useReminders } from '@/hooks/useReminders';
import { SettingsProvider, useSettings } from '@/hooks/useSettings';
import { ThemeProvider, useTheme } from '@/hooks/useTheme';

// Notifications must be configured before the first one can arrive.
configureNotificationHandler();
void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Nunito_500Medium,
    Nunito_600SemiBold,
    Nunito_700Bold,
    Nunito_800ExtraBold,
  });

  useEffect(() => {
    void prepareNotificationChannels();
  }, []);

  if (!fontsLoaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <SettingsProvider>
          <ThemeProvider>
            <RemindersProvider>
              <AppShell />
            </RemindersProvider>
          </ThemeProvider>
        </SettingsProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

/**
 * Everything below the providers: the navigator, the onboarding gate, the
 * deep-link handler for notification taps, and the celebration toast that
 * needs to float above every screen.
 */
function AppShell() {
  const { palette, isDark } = useTheme();
  const { settings, ready: settingsReady } = useSettings();
  const { ready: remindersReady, celebration } = useReminders();
  const router = useRouter();
  const segments = useSegments();

  const ready = settingsReady && remindersReady;

  useEffect(() => {
    if (ready) void SplashScreen.hideAsync();
  }, [ready]);

  // Onboarding gate. Runs after hydration so a returning user never sees it.
  useEffect(() => {
    if (!ready) return;
    const onOnboarding = segments[0] === 'onboarding';
    if (!settings.onboardingComplete && !onOnboarding) {
      router.replace('/onboarding');
    } else if (settings.onboardingComplete && onOnboarding) {
      router.replace('/');
    }
  }, [ready, settings.onboardingComplete, segments, router]);

  // Tapping a notification (or its Done/Snooze button) opens the reminder.
  useEffect(() => {
    if (Platform.OS === 'web') return;
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = readNotificationData(response);
      if (!data) return;
      if (response.actionIdentifier === Notifications.DEFAULT_ACTION_IDENTIFIER) {
        router.push({ pathname: '/reminder/[id]', params: { id: data.reminderId } });
      }
    });
    return () => subscription.remove();
  }, [router]);

  if (!ready) return <View style={{ flex: 1, backgroundColor: palette.background }} />;

  return (
    <View style={{ flex: 1, backgroundColor: palette.background }}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: palette.background },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="onboarding" options={{ animation: 'fade', gestureEnabled: false }} />
        <Stack.Screen name="compose" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
        <Stack.Screen name="completed" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
        <Stack.Screen name="reminder/[id]" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
      </Stack>
      <CelebrationToast celebration={celebration} />
    </View>
  );
}
