import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import ErrorBanner from '../../components/ErrorBanner';
import ProductCard from '../../components/ProductCard';
import ScreenContainer from '../../components/ScreenContainer';
import brand from '../../config/brand.json';
import { useAppStore } from '../../store/AppStore';
import { colors, radius, spacing, typography } from '../../theme';

export default function HomeScreen({ navigation }) {
  const { user, products, featuredProducts, addToCart, cartSummary, state } = useAppStore();

  return (
    <ScreenContainer scroll contentContainerStyle={styles.content}>
      <View style={styles.hero}>
        <Text style={styles.greeting}>Hola, {user?.name}</Text>
        <Text style={styles.heroTitle}>{brand.appName}</Text>
        <Text style={styles.heroSubtitle}>
          Explora el catalogo, revisa detalles y administra tu carrito desde cualquier pantalla.
        </Text>
        <View style={styles.heroBadge}>
          <Text style={styles.heroBadgeText}>{cartSummary.itemCount} articulos en carrito</Text>
        </View>
      </View>

      <ErrorBanner message={state.appError} />

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Destacados</Text>
        <Text style={styles.sectionMeta}>{featuredProducts.length} seleccionados</Text>
      </View>
      {featuredProducts.map((product) => (
        <ProductCard
          key={product.id}
          product={product}
          onPress={() => navigation.navigate('DetalleProducto', { productId: product.id })}
          onAddToCart={() => addToCart(product.id)}
        />
      ))}

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Todo el catalogo</Text>
        <Text style={styles.sectionMeta}>{products.length} productos</Text>
      </View>
      {products.map((product) => (
        <ProductCard
          key={product.id}
          product={product}
          onPress={() => navigation.navigate('DetalleProducto', { productId: product.id })}
          onAddToCart={() => addToCart(product.id)}
        />
      ))}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.lg,
  },
  hero: {
    backgroundColor: colors.primaryDark,
    borderRadius: radius.xl,
    padding: spacing.xxl,
    gap: spacing.md,
  },
  greeting: {
    ...typography.bodyStrong,
    color: '#BFE7E1',
  },
  heroTitle: {
    ...typography.display,
    color: colors.white,
  },
  heroSubtitle: {
    ...typography.body,
    color: '#D9F1ED',
  },
  heroBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  heroBadgeText: {
    ...typography.caption,
    color: colors.white,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    ...typography.title,
    color: colors.text,
  },
  sectionMeta: {
    ...typography.caption,
    color: colors.muted,
  },
});
