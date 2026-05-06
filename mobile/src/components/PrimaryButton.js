import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';
import { useAppTheme, useThemedStyles } from '../theme';

export default function PrimaryButton({
  title,
  onPress,
  disabled = false,
  loading = false,
  tone = 'primary',
  size = 'md',
}) {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const tones = {
    primary: {
      backgroundColor: colors.primary,
      textColor: colors.white,
      borderColor: colors.primary,
    },
    secondary: {
      backgroundColor: colors.surfaceAlt,
      textColor: colors.text,
      borderColor: colors.border,
    },
    danger: {
      backgroundColor: colors.danger,
      textColor: colors.white,
      borderColor: colors.danger,
    },
  };
  const palette = tones[tone] || tones.primary;
  const isDisabled = disabled || loading;

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.button,
        size === 'sm' && styles.buttonSmall,
        {
          backgroundColor: palette.backgroundColor,
          borderColor: palette.borderColor,
          opacity: isDisabled ? 0.55 : pressed ? 0.9 : 1,
        },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={palette.textColor} />
      ) : (
        <Text
          style={[
            styles.label,
            size === 'sm' && styles.labelSmall,
            { color: palette.textColor },
          ]}
        >
          {title}
        </Text>
      )}
    </Pressable>
  );
}

const createStyles = ({ radius, spacing, typography }) =>
  StyleSheet.create({
    button: {
      minHeight: 52,
      borderRadius: radius.md,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      paddingHorizontal: spacing.lg,
    },
    buttonSmall: {
      minHeight: 42,
      paddingHorizontal: spacing.md,
    },
    label: {
      ...typography.button,
    },
    labelSmall: {
      fontSize: 14,
      lineHeight: 18,
    },
  });
