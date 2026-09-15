import React from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { spacing } from '@/constants/theme';
import { AppText } from '@/components/AppText';

export interface EmptyStateProps {
  emoji: string;
  title: string;
  body: string;
  action?: React.ReactNode;
}

/** Charming rather than apologetic — an empty Bump is a good outcome. */
export function EmptyState({ emoji, title, body, action }: EmptyStateProps) {
  return (
    <Animated.View entering={FadeIn.duration(320)} style={styles.container}>
      <AppText style={styles.emoji}>{emoji}</AppText>
      <AppText variant="title" style={styles.title}>
        {title}
      </AppText>
      <AppText variant="bodySoft" tone="secondary" style={styles.body}>
        {body}
      </AppText>
      {action ? <View style={styles.action}>{action}</View> : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.lg,
  },
  emoji: {
    fontSize: 44,
    lineHeight: 54,
    marginBottom: spacing.md,
  },
  title: {
    textAlign: 'center',
  },
  body: {
    textAlign: 'center',
    marginTop: spacing.sm,
    maxWidth: 280,
  },
  action: {
    marginTop: spacing.lg,
  },
});
