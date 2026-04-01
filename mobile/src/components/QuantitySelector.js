import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing, typography } from '../theme';

export default function QuantitySelector({ value, onDecrease, onIncrease }) {
  return (
    <View style={styles.wrapper}>
      <Pressable style={styles.control} onPress={onDecrease}>
        <Text style={styles.symbol}>-</Text>
      </Pressable>
      <Text style={styles.value}>{value}</Text>
      <Pressable style={styles.control} onPress={onIncrease}>
        <Text style={styles.symbol}>+</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  control: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceAlt,
  },
  symbol: {
    ...typography.subtitle,
    color: colors.text,
  },
  value: {
    ...typography.bodyStrong,
    color: colors.text,
    minWidth: 24,
    textAlign: 'center',
  },
});
