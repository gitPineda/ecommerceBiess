import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing, typography } from '../theme';

export default function ErrorBanner({ message, tone = 'danger' }) {
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

const styles = StyleSheet.create({
  banner: {
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
  },
  danger: {
    backgroundColor: '#FDECEC',
    borderColor: '#F8C1C1',
  },
  success: {
    backgroundColor: '#EAF8EF',
    borderColor: '#B8E3C6',
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
