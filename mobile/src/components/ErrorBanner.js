import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useThemedStyles } from '../theme';

export default function ErrorBanner({ message, tone = 'danger' }) {
  const styles = useThemedStyles(createStyles);

  if (!message) {
    return null;
  }

  return (
    <View
      style={[
        styles.banner,
        tone === 'success' ? styles.success : styles.danger,
      ]}
    >
      <Text style={[styles.text, tone === 'success' ? styles.successText : styles.dangerText]}>
        {message}
      </Text>
    </View>
  );
}

const createStyles = ({ colors, radius, spacing, typography }) =>
  StyleSheet.create({
    banner: {
      borderRadius: radius.md,
      padding: spacing.md,
      borderWidth: 1,
    },
    danger: {
      backgroundColor: colors.dangerSoft,
      borderColor: colors.dangerBorder,
    },
    success: {
      backgroundColor: colors.successSoft,
      borderColor: colors.successBorder,
    },
    text: {
      ...typography.body,
    },
    dangerText: {
      color: colors.danger,
    },
    successText: {
      color: colors.success,
    },
  });
