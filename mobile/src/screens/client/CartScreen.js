import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import EmptyState from '../../components/EmptyState';
import PrimaryButton from '../../components/PrimaryButton';
import QuantitySelector from '../../components/QuantitySelector';
import ScreenContainer from '../../components/ScreenContainer';
import { formatCurrency } from '../../config/formatters';
import { showStockInsufficientAlert } from '../../services/cartAlerts';
import { useAppStore } from '../../store/AppStore';
import { findProductById } from '../../store/selectors';
import { colors, radius, spacing, typography } from '../../theme';

export default function CartScreen({ navigation }) {
  const { cartItems, products, cartSummary, updateCartQuantity, removeFromCart } = useAppStore();

  function handleIncrease(item) {
    try {
      updateCartQuantity(item.productId, item.quantity + 1);
    } catch (error) {
      showStockInsufficientAlert(
        error.message || 'No hay stock suficiente para este producto.',
      );
    }
  }

  if (!cartItems.length) {
    return (
      <ScreenContainer contentContainerStyle={styles.centered}>
        <EmptyState
          icon="cart-outline"
          title="Tu carrito esta vacio"
          description="Agrega productos desde el catalogo para continuar con el pago."
        />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer scroll contentContainerStyle={styles.content}>
      {cartItems.map((item) => {
        const product = findProductById(products, item.productId);

        return (
          <View key={item.productId} style={styles.itemCard}>
            <View style={styles.itemHeader}>
              <View style={styles.itemCopy}>
                <Text style={styles.itemTitle}>{item.name}</Text>
                <Text style={styles.itemMeta}>
                  {item.category} | {formatCurrency(item.price)}
                </Text>
              </View>
              <Pressable onPress={() => removeFromCart(item.productId)}>
                <Text style={styles.removeText}>Eliminar</Text>
              </Pressable>
            </View>

            <View style={styles.itemFooter}>
              <QuantitySelector
                value={item.quantity}
                onDecrease={() => updateCartQuantity(item.productId, item.quantity - 1)}
                onIncrease={() => handleIncrease(item)}
              />
              <Text style={styles.itemPrice}>
                {formatCurrency(item.price * item.quantity)}
              </Text>
            </View>

            <Text style={styles.stockText}>Stock disponible: {product?.stock || 0}</Text>
          </View>
        );
      })}

      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>Resumen</Text>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Subtotal</Text>
          <Text style={styles.summaryValue}>{formatCurrency(cartSummary.subtotal)}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Impuesto 12%</Text>
          <Text style={styles.summaryValue}>{formatCurrency(cartSummary.tax)}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryTotalLabel}>Total</Text>
          <Text style={styles.summaryTotalValue}>{formatCurrency(cartSummary.total)}</Text>
        </View>
        <PrimaryButton title="Ir al pago" onPress={() => navigation.navigate('Checkout')} />
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
  itemCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xl,
    gap: spacing.md,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  itemCopy: {
    flex: 1,
    gap: spacing.xs,
  },
  itemTitle: {
    ...typography.subtitle,
    color: colors.text,
  },
  itemMeta: {
    ...typography.body,
    color: colors.muted,
  },
  removeText: {
    ...typography.bodyStrong,
    color: colors.danger,
  },
  itemFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.md,
  },
  itemPrice: {
    ...typography.subtitle,
    color: colors.primary,
  },
  stockText: {
    ...typography.caption,
    color: colors.muted,
  },
  summaryCard: {
    backgroundColor: colors.primaryDark,
    borderRadius: radius.xl,
    padding: spacing.xxl,
    gap: spacing.md,
  },
  summaryTitle: {
    ...typography.title,
    color: colors.white,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    ...typography.body,
    color: '#D9F1ED',
  },
  summaryValue: {
    ...typography.bodyStrong,
    color: colors.white,
  },
  summaryTotalLabel: {
    ...typography.subtitle,
    color: colors.white,
  },
  summaryTotalValue: {
    ...typography.title,
    color: '#FDE5D3',
  },
});
