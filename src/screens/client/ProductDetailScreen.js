import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import EmptyState from '../../components/EmptyState';
import PrimaryButton from '../../components/PrimaryButton';
import ScreenContainer from '../../components/ScreenContainer';
import { formatCurrency } from '../../config/formatters';
import { useAppStore } from '../../store/AppStore';
import { findProductById } from '../../store/selectors';
import { colors, radius, spacing, typography } from '../../theme';

export default function ProductDetailScreen({ route, navigation }) {
  const { products, addToCart } = useAppStore();
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

  return (
    <ScreenContainer scroll contentContainerStyle={styles.content}>
      <View style={styles.visual}>
        <Ionicons name="cube-outline" size={72} color={colors.primary} />
      </View>

      <View style={styles.card}>
        <Text style={styles.category}>{product.category}</Text>
        <Text style={styles.title}>{product.name}</Text>
        <Text style={styles.price}>{formatCurrency(product.price)}</Text>
        <Text style={styles.description}>{product.description}</Text>

        <View style={styles.metaRow}>
          <View style={styles.metaChip}>
            <Text style={styles.metaText}>SKU: {product.sku}</Text>
          </View>
          <View style={styles.metaChip}>
            <Text style={styles.metaText}>Stock: {product.stock}</Text>
          </View>
        </View>

        <PrimaryButton title="Agregar al carrito" onPress={() => addToCart(product.id)} />
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
  category: {
    ...typography.caption,
    color: colors.primary,
  },
  title: {
    ...typography.display,
    color: colors.text,
  },
  price: {
    ...typography.title,
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
  metaText: {
    ...typography.caption,
    color: colors.text,
  },
});
