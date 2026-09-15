import React from 'react';
import { StyleSheet, Switch, View } from 'react-native';
import { radius, spacing } from '@/constants/theme';
import { usePalette } from '@/hooks/useTheme';
import { haptics } from '@/utils/haptics';
import { AppText } from '@/components/AppText';

export function SettingsGroup({
  title,
  caption,
  children,
}: {
  title: string;
  caption?: string;
  children: React.ReactNode;
}) {
  const palette = usePalette();
  return (
    <View style={styles.group}>
      <AppText variant="section" tone="tertiary" style={styles.groupTitle}>
        {title.toUpperCase()}
      </AppText>
      <View style={[styles.body, { backgroundColor: palette.card, borderColor: palette.border }]}>
        {children}
      </View>
      {caption ? (
        <AppText variant="caption" tone="tertiary" style={styles.caption}>
          {caption}
        </AppText>
      ) : null}
    </View>
  );
}

export function SettingsSwitchRow({
  label,
  description,
  value,
  onChange,
}: {
  label: string;
  description?: string;
  value: boolean;
  onChange: (next: boolean) => void;
}) {
  const palette = usePalette();
  return (
    <View style={styles.row}>
      <View style={styles.rowText}>
        <AppText variant="body">{label}</AppText>
        {description ? (
          <AppText variant="caption" tone="tertiary" style={styles.description}>
            {description}
          </AppText>
        ) : null}
      </View>
      <Switch
        value={value}
        onValueChange={(next) => {
          haptics.tap();
          onChange(next);
        }}
        trackColor={{ false: palette.border, true: palette.accent }}
        thumbColor={palette.card}
        ios_backgroundColor={palette.border}
      />
    </View>
  );
}

/** A row whose control is a row of chips laid out underneath the label. */
export function SettingsChoiceRow({
  label,
  description,
  children,
}: {
  label: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.choiceRow}>
      <View style={styles.rowText}>
        <AppText variant="body">{label}</AppText>
        {description ? (
          <AppText variant="caption" tone="tertiary" style={styles.description}>
            {description}
          </AppText>
        ) : null}
      </View>
      <View style={styles.choices}>{children}</View>
    </View>
  );
}

export function SettingsDivider() {
  const palette = usePalette();
  return <View style={[styles.divider, { backgroundColor: palette.border }]} />;
}

const styles = StyleSheet.create({
  group: {
    gap: spacing.sm,
  },
  groupTitle: {
    letterSpacing: 1,
    paddingHorizontal: spacing.xs,
  },
  body: {
    borderRadius: radius.md,
    borderWidth: 1,
    overflow: 'hidden',
  },
  caption: {
    paddingHorizontal: spacing.xs,
    lineHeight: 17,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  choiceRow: {
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
  description: {
    lineHeight: 17,
  },
  choices: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  divider: {
    height: 1,
    marginLeft: spacing.md,
  },
});
