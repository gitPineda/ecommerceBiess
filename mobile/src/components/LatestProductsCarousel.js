import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { formatCurrency, formatPercentage } from '../config/formatters';
import { getCategoryMeta } from '../config/productCategories';
import { getProductPricing } from '../store/selectors';
import { colors, radius, spacing, typography } from '../theme';
import PrimaryButton from './PrimaryButton';

export default function LatestProductsCarousel({ products, onSelectProduct, onAddToCart }) {
  return (
    <View style={styles.wrapper}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.row}>
          {products.map((product) => {
            const categoryMeta = getCategoryMeta(product.categoryId, product.category);
            const pricing = getProductPricing(product);

            return (
              <View key={product.id} style={styles.card}>
                <Pressable style={styles.content} onPress={() => onSelectProduct(product.id)}>
                  <View style={styles.mediaShell}>
                    <View style={styles.badgeRow}>
                      <View style={styles.newBadge}>
                        <Text style={styles.newBadgeText}>Nuevo</Text>
                      </View>
                      {pricing.hasPromotion ? (
                        <View style={styles.promoBadge}>
                          <Text style={styles.promoBadgeText}>
                            Promo {formatPercentage(pricing.discount)}
                          </Text>
                        </View>
                      ) : null}
                    </View>

                    <View style={styles.iconShell}>
                      <Ionicons name={categoryMeta.icon} size={22} color={colors.primary} />
                    </View>
                  </View>

                  <View style={styles.copyBlock}>
                    <Text style={styles.category}>{categoryMeta.label}</Text>
                    <Text style={styles.title} numberOfLines={2}>
                      {product.name}
                    </Text>
                    <Text style={styles.description} numberOfLines={1}>
                      {product.description}
                    </Text>
                  </View>
                </Pressable>

                <View style={styles.footer}>
                  <View style={styles.priceBlock}>
                    {pricing.hasPromotion ? (
                      <Text style={styles.originalPrice}>
                        {formatCurrency(pricing.originalPrice)}
                      </Text>
                    ) : null}
                    <Text style={styles.finalPrice}>{formatCurrency(pricing.finalPrice)}</Text>
                  </View>
                  <PrimaryButton
                    title="Agregar"
                    onPress={() => onAddToCart(product)}
                    size="sm"
                  />
                </View>
              </View>
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
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  card: {
    width: 252,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.sm,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  mediaShell: {
    width: 72,
    alignItems: 'center',
    gap: spacing.xs,
  },
  badgeRow: {
    width: '100%',
    flexDirection: 'column',
    alignItems: 'center',
    gap: spacing.xs,
  },
  newBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceAlt,
  },
  newBadgeText: {
    ...typography.caption,
    color: colors.primary,
  },
  promoBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    backgroundColor: '#FDE5D3',
  },
  promoBadgeText: {
    ...typography.caption,
    color: colors.secondary,
  },
  iconShell: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceAlt,
  },
  copyBlock: {
    flex: 1,
    gap: spacing.xs,
  },
  category: {
    ...typography.caption,
    color: colors.primary,
  },
  title: {
    ...typography.bodyStrong,
    color: colors.text,
  },
  description: {
    ...typography.caption,
    color: colors.muted,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  priceBlock: {
    flex: 1,
    gap: 2,
  },
  originalPrice: {
    ...typography.caption,
    color: colors.muted,
    textDecorationLine: 'line-through',
  },
  finalPrice: {
    ...typography.subtitle,
    color: colors.text,
  },
});
