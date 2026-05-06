import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { formatCurrency, formatPercentage } from '../config/formatters';
import { getCategoryMeta } from '../config/productCategories';
import { getProductPricing } from '../store/selectors';
import { useThemedStyles } from '../theme';
import PrimaryButton from './PrimaryButton';
import ProductMedia from './ProductMedia';

export default function ProductCard({ product, onPress, onAddToCart }) {
  const styles = useThemedStyles(createStyles);
  const categoryMeta = getCategoryMeta(
    product.categoryId,
    product.category,
    product.categoryIcon,
  );
  const pricing = getProductPricing(product);

  return (
    <View style={styles.card}>
      <View style={styles.topRow}>
        <Text style={styles.category}>{categoryMeta.label}</Text>
        {pricing.hasPromotion ? (
          <View style={styles.promoBadge}>
            <Text style={styles.promoText}>Promo {formatPercentage(pricing.discount)}</Text>
          </View>
        ) : null}
      </View>

      <Pressable style={styles.header} onPress={onPress}>
        <View style={styles.headerInner}>
          <ProductMedia product={product} variant="card" width={72} height={72} />
          <View style={styles.info}>
            <Text style={styles.title}>{product.name}</Text>
            <Text style={styles.description} numberOfLines={2}>
              {product.description}
            </Text>
          </View>
        </View>
      </Pressable>

      <View style={styles.footer}>
        <View>
          {pricing.hasPromotion ? (
            <>
              <Text style={styles.originalPrice}>{formatCurrency(pricing.originalPrice)}</Text>
              <Text style={styles.promoNote}>
                Descuento activo: {formatPercentage(pricing.discount)}
              </Text>
            </>
          ) : null}
          <Text style={styles.price}>{formatCurrency(pricing.finalPrice)}</Text>
          <Text style={styles.stock}>Stock: {product.stock}</Text>
        </View>
        <View style={styles.buttonWrapper}>
          <PrimaryButton title="Agregar" onPress={onAddToCart} />
        </View>
      </View>
    </View>
  );
}

const createStyles = ({ colors, radius, shadows, spacing, typography }) =>
  StyleSheet.create({
    card: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      padding: spacing.lg,
      gap: spacing.lg,
      borderWidth: 1,
      borderColor: colors.border,
      ...shadows.card,
    },
    topRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: spacing.sm,
    },
    header: {
      borderRadius: radius.md,
    },
    headerInner: {
      flexDirection: 'row',
      gap: spacing.md,
    },
    info: {
      flex: 1,
      gap: spacing.xs,
    },
    category: {
      ...typography.caption,
      color: colors.primary,
    },
    promoBadge: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: radius.pill,
      backgroundColor: colors.promoSurface,
      borderWidth: 1,
      borderColor: colors.promoBorder,
    },
    promoText: {
      ...typography.caption,
      color: colors.promoText,
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
    originalPrice: {
      ...typography.caption,
      color: colors.muted,
      textDecorationLine: 'line-through',
    },
    promoNote: {
      ...typography.caption,
      color: colors.promoText,
    },
    stock: {
      ...typography.caption,
      color: colors.muted,
    },
    buttonWrapper: {
      minWidth: 110,
    },
  });
