import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import EmptyState from '../../components/EmptyState';
import PrimaryButton from '../../components/PrimaryButton';
import ScreenContainer from '../../components/ScreenContainer';
import { formatCurrency, formatPercentage } from '../../config/formatters';
import { confirmAddProductToCart } from '../../services/cartAlerts';
import { getCategoryMeta } from '../../config/productCategories';
import { useAppStore } from '../../store/AppStore';
import { findProductById, getProductPricing } from '../../store/selectors';
import { colors, radius, spacing, typography } from '../../theme';

export default function ProductDetailScreen({ route, navigation }) {
  const { products, cartItems, addToCart } = useAppStore();
  const product = findProductById(products, route.params?.productId);

  if (!product) {
    return (
      <ScreenContainer contentContainerStyle={styles.centered}>
        <EmptyState
          title="Producto no encontrado"
          description="Regresa al catalogo para seleccionar otro articulo."
          actionLabel="Volver"
          onAction={() => navigation.goBack()}
        />
      </ScreenContainer>
    );
  }

  const categoryMeta = getCategoryMeta(product.categoryId, product.category);
  const pricing = getProductPricing(product);

  function handleAddToCart() {
    confirmAddProductToCart({
      product,
      cartItems,
      addToCart,
    });
  }

  return (
    <ScreenContainer scroll contentContainerStyle={styles.content}>
      <View style={styles.visual}>
        <Ionicons name={categoryMeta.icon} size={72} color={colors.primary} />
      </View>

      <View style={styles.card}>
        <View style={styles.badgeRow}>
          <View style={styles.metaChip}>
            <Text style={styles.metaText}>{categoryMeta.label}</Text>
          </View>
          <View style={styles.metaChip}>
            <Text style={styles.metaText}>Stock: {product.stock}</Text>
          </View>
          {pricing.hasPromotion ? (
            <View style={[styles.metaChip, styles.promoChip]}>
              <Text style={styles.promoChipText}>
                Promocion {formatPercentage(pricing.discount)}
              </Text>
            </View>
          ) : null}
        </View>

        <Text style={styles.title}>{product.name}</Text>
        {pricing.hasPromotion ? (
          <View style={styles.priceGroup}>
            <Text style={styles.promoLead}>
              Producto en promocion con {formatPercentage(pricing.discount)} de descuento
            </Text>
            <Text style={styles.originalPrice}>{formatCurrency(pricing.originalPrice)}</Text>
            <Text style={styles.price}>{formatCurrency(pricing.finalPrice)}</Text>
            <View style={styles.promoBadge}>
              <Text style={styles.promoBadgeText}>
                Ahorra {formatPercentage(pricing.discount)}
              </Text>
            </View>
          </View>
        ) : (
          <Text style={styles.price}>{formatCurrency(pricing.finalPrice)}</Text>
        )}
        <Text style={styles.description}>{product.description}</Text>

        <View style={styles.metaRow}>
          <View style={styles.metaChip}>
            <Text style={styles.metaText}>SKU: {product.sku}</Text>
          </View>
        </View>

        <PrimaryButton title="Agregar al carrito" onPress={handleAddToCart} />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  centered: {
    justifyContent: 'center',
  },
  content: {
    gap: spacing.lg,
  },
  visual: {
    minHeight: 220,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xxl,
    gap: spacing.lg,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  title: {
    ...typography.display,
    color: colors.text,
  },
  price: {
    ...typography.title,
    color: colors.secondary,
  },
  priceGroup: {
    gap: spacing.sm,
  },
  promoLead: {
    ...typography.bodyStrong,
    color: colors.secondary,
  },
  originalPrice: {
    ...typography.body,
    color: colors.muted,
    textDecorationLine: 'line-through',
  },
  promoBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: '#FDE5D3',
  },
  promoBadgeText: {
    ...typography.caption,
    color: colors.secondary,
  },
  description: {
    ...typography.body,
    color: colors.muted,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  metaChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.background,
  },
  promoChip: {
    backgroundColor: '#FDE5D3',
  },
  metaText: {
    ...typography.caption,
    color: colors.text,
  },
  promoChipText: {
    ...typography.caption,
    color: colors.secondary,
  },
});
