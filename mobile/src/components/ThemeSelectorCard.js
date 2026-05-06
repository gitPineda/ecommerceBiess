import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useAppTheme, useThemedStyles } from '../theme';

export default function ThemeSelectorCard({ title = 'Tema visual', compact = false }) {
  const { currentTheme, selectTheme, themeOptions, colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const activeTheme =
    themeOptions.find((option) => option.id === currentTheme.id) || themeOptions[0];

  return (
    <View style={styles.card}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>
        El tema seleccionado se aplica a toda la aplicacion.
      </Text>

      <View style={styles.switchRail}>
        {themeOptions.map((option) => {
          const isActive = option.id === currentTheme.id;
          const accentColor = option.palette.primary;

          return (
            <Pressable
              key={option.id}
              style={[styles.switchOption, isActive && styles.switchOptionActive]}
              onPress={() => selectTheme(option.id)}
            >
              <View style={[styles.dot, { backgroundColor: accentColor }]} />
              <Text style={[styles.switchLabel, isActive && styles.switchLabelActive]}>
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {!compact ? (
        <View style={styles.activeThemeCard}>
          <Text style={styles.activeThemeTitle}>{activeTheme.label}</Text>
          <Text style={styles.activeThemeText}>{activeTheme.description}</Text>
        </View>
      ) : null}
    </View>
  );
}

const createStyles = ({ colors, radius, spacing, typography }) =>
  StyleSheet.create({
    card: {
      backgroundColor: colors.surface,
      borderRadius: radius.xl,
      borderWidth: 1,
      borderColor: colors.border,
      padding: spacing.xl,
      gap: spacing.md,
    },
    title: {
      ...typography.subtitle,
      color: colors.text,
    },
    subtitle: {
      ...typography.body,
      color: colors.muted,
    },
    switchRail: {
      flexDirection: 'row',
      gap: spacing.sm,
      padding: spacing.xs,
      borderRadius: radius.pill,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.background,
    },
    switchOption: {
      flex: 1,
      minHeight: 56,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: radius.pill,
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.xs,
    },
    switchOptionActive: {
      backgroundColor: colors.surfaceAlt,
      borderWidth: 1,
      borderColor: colors.primary,
    },
    dot: {
      width: 14,
      height: 14,
      borderRadius: 7,
    },
    switchLabel: {
      ...typography.bodyStrong,
      color: colors.muted,
    },
    switchLabelActive: {
      color: colors.text,
    },
    activeThemeCard: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.lg,
      backgroundColor: colors.background,
      padding: spacing.md,
      gap: spacing.xs,
    },
    activeThemeTitle: {
      ...typography.bodyStrong,
      color: colors.text,
    },
    activeThemeText: {
      ...typography.caption,
      color: colors.muted,
    },
  });
