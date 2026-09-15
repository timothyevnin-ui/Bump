import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { radius, spacing } from '@/constants/theme';
import { usePalette } from '@/hooks/useTheme';
import { PERSONALITIES, Personality } from '@/types/reminder';
import { PERSONALITY_PREVIEWS } from '@/services/copy';
import { AppText } from '@/components/AppText';
import { PressableScale } from '@/components/PressableScale';

export interface PersonalitySelectorProps {
  value: Personality;
  onChange: (personality: Personality) => void;
  /** Drops the descriptions to fit inside Settings. */
  compact?: boolean;
}

/**
 * Picks the voice Bump uses everywhere. Each option previews its own copy,
 * because describing a tone never lands as well as showing it.
 */
export function PersonalitySelector({ value, onChange, compact = false }: PersonalitySelectorProps) {
  const palette = usePalette();

  return (
    <View style={styles.list}>
      {PERSONALITIES.map((personality) => {
        const preview = PERSONALITY_PREVIEWS[personality];
        const selected = personality === value;
        return (
          <PressableScale
            key={personality}
            onPress={() => onChange(personality)}
            activeScale={0.98}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            accessibilityLabel={`${preview.label}. ${preview.sample}`}
            style={[
              styles.option,
              {
                backgroundColor: selected ? palette.accentSoft : palette.card,
                borderColor: selected ? palette.accent : palette.border,
              },
            ]}
          >
            <AppText style={styles.emoji}>{preview.emoji}</AppText>
            <View style={styles.text}>
              <View style={styles.headerRow}>
                <AppText variant="label">{preview.label}</AppText>
                {!compact ? (
                  <AppText variant="caption" tone="tertiary">
                    {preview.blurb}
                  </AppText>
                ) : null}
              </View>
              <AppText variant="caption" tone="secondary" style={styles.sample}>
                “{preview.sample}”
              </AppText>
            </View>
            <Ionicons
              name={selected ? 'checkmark-circle' : 'ellipse-outline'}
              size={22}
              color={selected ? palette.accent : palette.border}
            />
          </PressableScale>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: spacing.sm,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1.5,
  },
  emoji: {
    fontSize: 24,
    lineHeight: 30,
  },
  text: {
    flex: 1,
    gap: 2,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.sm,
  },
  sample: {
    fontStyle: 'italic',
  },
});
