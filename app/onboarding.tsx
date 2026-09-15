import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useRef, useState } from 'react';
import {
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { radius, softShadow, spacing } from '@/constants/theme';
import { Personality } from '@/types/reminder';
import { requestNotificationPermission } from '@/services/notifications';
import { haptics } from '@/utils/haptics';
import { AppText } from '@/components/AppText';
import { PersonalitySelector } from '@/components/PersonalitySelector';
import { PressableScale } from '@/components/PressableScale';
import { PrimaryButton } from '@/components/PrimaryButton';
import { useSettings } from '@/hooks/useSettings';
import { usePalette } from '@/hooks/useTheme';

const PAGE_COUNT = 3;

export default function OnboardingScreen() {
  const palette = usePalette();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { settings, update } = useSettings();

  const scrollRef = useRef<ScrollView>(null);
  const [page, setPage] = useState(0);
  const [personality, setPersonality] = useState<Personality>(settings.personality);
  const [working, setWorking] = useState(false);

  const goTo = (next: number) => {
    const clamped = Math.max(0, Math.min(PAGE_COUNT - 1, next));
    scrollRef.current?.scrollTo({ x: clamped * width, animated: true });
    setPage(clamped);
  };

  const onScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const next = Math.round(event.nativeEvent.contentOffset.x / width);
    if (next !== page) {
      setPage(next);
      haptics.tap();
    }
  };

  const finish = async (askForNotifications: boolean) => {
    setWorking(true);
    let granted = false;
    if (askForNotifications) {
      granted = await requestNotificationPermission();
    }
    update({
      personality,
      notificationsEnabled: granted,
      onboardingComplete: true,
    });
    haptics.success();
    setWorking(false);
    router.replace('/');
  };

  return (
    <View style={[styles.flex, { backgroundColor: palette.background }]}>
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onScrollEnd}
        keyboardShouldPersistTaps="handled"
        style={styles.flex}
      >
        <Page width={width} topInset={insets.top}>
          <Hero emoji="🫧" />
          <AppText variant="hero" style={styles.title}>
            Remember things without managing a to-do list.
          </AppText>
          <AppText variant="bodySoft" tone="secondary" style={styles.body}>
            No projects, no folders, no priorities. Just the things you do not want to forget.
          </AppText>
        </Page>

        <Page width={width} topInset={insets.top}>
          <Hero emoji="✨" />
          <AppText variant="hero" style={styles.title}>
            Type naturally.
          </AppText>
          <View style={[styles.bubble, { backgroundColor: palette.card }, softShadow(palette, 1)]}>
            <AppText variant="body" tone="secondary">
              “Call Mom Sunday afternoon.”
            </AppText>
          </View>
          <View style={styles.arrowRow}>
            <Ionicons name="arrow-down" size={18} color={palette.textTertiary} />
          </View>
          <View style={[styles.resultCard, { backgroundColor: palette.pastels.sky }]}>
            <AppText style={styles.resultEmoji}>📞</AppText>
            <View>
              <AppText variant="body" color={palette.pastelInk.sky}>
                Call Mom
              </AppText>
              <AppText variant="caption" color={palette.pastelInk.sky}>
                Sunday · 2 PM
              </AppText>
            </View>
          </View>
          <AppText variant="bodySoft" tone="secondary" style={styles.body}>
            Bump figures out the rest.
          </AppText>
        </Page>

        <Page width={width} topInset={insets.top} scrollable>
          <Hero emoji="👀" />
          <AppText variant="hero" style={styles.title}>
            Want us to bug you?
          </AppText>
          <AppText variant="bodySoft" tone="secondary" style={styles.body}>
            Turn on <AppText variant="body">Bump me until I do it</AppText> and one notification
            becomes a polite campaign — every 30 minutes, hour, or 3 hours — until you mark it done.
          </AppText>

          <View style={styles.chain}>
            <ChainLine time="10:00" text="Pick up your prescription 💊" />
            <ChainLine time="11:00" text="Still need to grab your prescription." />
            <ChainLine time="12:00" text="👀 Prescription." />
            <ChainLine time="1:00" text="Okay. Seriously. Prescription." last />
          </View>

          <AppText variant="title" style={styles.sectionTitle}>
            How should Bump remind you?
          </AppText>
          <PersonalitySelector
            value={personality}
            onChange={(next) => {
              haptics.tap();
              setPersonality(next);
            }}
          />
        </Page>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.lg }]}>
        <View style={styles.dots}>
          {Array.from({ length: PAGE_COUNT }).map((_, index) => (
            <View
              key={index}
              style={[
                styles.dot,
                {
                  backgroundColor: index === page ? palette.accent : palette.border,
                  width: index === page ? 22 : 8,
                },
              ]}
            />
          ))}
        </View>

        {page < PAGE_COUNT - 1 ? (
          <PrimaryButton label="Continue" onPress={() => goTo(page + 1)} />
        ) : (
          <Animated.View entering={FadeInDown.duration(260)} style={styles.finishBlock}>
            <PrimaryButton
              label="Turn on notifications"
              icon="notifications"
              loading={working}
              onPress={() => void finish(true)}
            />
            <PressableScale
              onPress={() => void finish(false)}
              activeScale={0.97}
              haptic="none"
              accessibilityRole="button"
              style={styles.skip}
            >
              <AppText variant="caption" tone="tertiary">
                Not right now
              </AppText>
            </PressableScale>
          </Animated.View>
        )}
      </View>
    </View>
  );
}

function Page({
  width,
  topInset,
  scrollable = false,
  children,
}: {
  width: number;
  topInset: number;
  scrollable?: boolean;
  children: React.ReactNode;
}) {
  if (!scrollable) {
    return (
      <View style={[styles.page, styles.pageCentered, { width, paddingTop: topInset + spacing.xl }]}>
        {children}
      </View>
    );
  }
  return (
    <ScrollView
      style={{ width }}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={[styles.page, { paddingTop: topInset + spacing.xl }]}
    >
      {children}
    </ScrollView>
  );
}

function Hero({ emoji }: { emoji: string }) {
  return (
    <Animated.View entering={FadeIn.duration(420)}>
      <AppText style={styles.heroEmoji}>{emoji}</AppText>
    </Animated.View>
  );
}

function ChainLine({ time, text, last = false }: { time: string; text: string; last?: boolean }) {
  const palette = usePalette();
  return (
    <View style={styles.chainRow}>
      <AppText variant="micro" tone="tertiary" style={styles.chainTime}>
        {time}
      </AppText>
      <View
        style={[
          styles.chainBubble,
          { backgroundColor: last ? palette.accentSoft : palette.surface },
        ]}
      >
        <AppText variant="caption" tone={last ? 'primary' : 'secondary'}>
          {text}
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  page: {
    paddingHorizontal: spacing.lg,
    // Enough room for the pinned footer to never cover the last option.
    paddingBottom: 190,
    gap: spacing.md,
  },
  pageCentered: {
    flex: 1,
    justifyContent: 'center',
    paddingBottom: 150,
  },
  heroEmoji: {
    fontSize: 52,
    lineHeight: 64,
  },
  title: {
    marginTop: spacing.sm,
  },
  body: {
    lineHeight: 24,
  },
  sectionTitle: {
    marginTop: spacing.lg,
    marginBottom: spacing.xs,
  },
  bubble: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
    borderBottomLeftRadius: spacing.sm,
    marginTop: spacing.sm,
  },
  arrowRow: {
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  resultCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
  },
  resultEmoji: {
    fontSize: 24,
    lineHeight: 30,
  },
  chain: {
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  chainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  chainTime: {
    width: 42,
  },
  chainBubble: {
    flex: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    gap: spacing.md,
  },
  dots: {
    flexDirection: 'row',
    alignSelf: 'center',
    gap: 6,
    marginBottom: spacing.xs,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  finishBlock: {
    gap: spacing.xs,
  },
  skip: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
});
