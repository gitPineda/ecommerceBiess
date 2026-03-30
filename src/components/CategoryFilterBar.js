import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing, typography } from '../theme';

export default function CategoryFilterBar({
  categories,
  selectedCategoryId,
  onSelectCategory,
}) {
  return (
    <View style={styles.wrapper}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.row}>
          {categories.map((category) => {
            const isActive = category.id === selectedCategoryId;

            return (
              <Pressable
                key={category.id}
                style={[styles.chip, isActive && styles.chipActive]}
                onPress={() => onSelectCategory(category.id)}
              >
                <Text style={[styles.label, isActive && styles.labelActive]}>
                  {category.label}
                </Text>
                <Text style={[styles.count, isActive && styles.labelActive]}>
                  {category.count}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginHorizontal: -spacing.lg,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  label: {
    ...typography.bodyStrong,
    color: colors.text,
  },
  labelActive: {
    color: colors.white,
  },
  count: {
    ...typography.caption,
    color: colors.muted,
  },
});
