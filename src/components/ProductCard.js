import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { formatCurrency } from '../config/formatters';
import { colors, radius, shadows, spacing, typography } from '../theme';
import PrimaryButton from './PrimaryButton';

const CATEGORY_ICONS = {
  Audio: 'headset-outline',
  Wearables: 'watch-outline',
  Accesorios: 'briefcase-outline',
  Hogar: 'home-outline',
  Computo: 'laptop-outline',
  Lifestyle: 'leaf-outline',
};

export default function ProductCard({ product, onPress, onAddToCart }) {
  return (
    <View style={styles.card}>
      <Pressable style={styles.header} onPress={onPress}>
        <View style={styles.headerInner}>
          <View style={styles.iconShell}>
            <Ionicons
              name={CATEGORY_ICONS[product.category] || 'cube-outline'}
              size={26}
              color={colors.primary}
            />
          </View>
          <View style={styles.info}>
            <Text style={styles.category}>{product.category}</Text>
            <Text style={styles.title}>{product.name}</Text>
            <Text style={styles.description} numberOfLines={2}>
              {product.description}
            </Text>
          </View>
        </View>
      </Pressable>

      <View style={styles.footer}>
        <View>
          <Text style={styles.price}>{formatCurrency(product.price)}</Text>
          <Text style={styles.stock}>Stock: {product.stock}</Text>
        </View>
        <View style={styles.buttonWrapper}>
          <PrimaryButton title="Agregar" onPress={onAddToCart} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  header: {
    borderRadius: radius.md,
  },
  headerInner: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  iconShell: {
    width: 60,
    height: 60,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceAlt,
  },
  info: {
    flex: 1,
    gap: spacing.xs,
  },
  category: {
    ...typography.caption,
    color: colors.primary,
  },
  title: {
    ...typography.subtitle,
    color: colors.text,
  },
  description: {
    ...typography.body,
    color: colors.muted,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  price: {
    ...typography.subtitle,
    color: colors.text,
  },
  stock: {
    ...typography.caption,
    color: colors.muted,
  },
  buttonWrapper: {
    minWidth: 110,
  },
});
