import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import CategoryFilterBar from '../../components/CategoryFilterBar';
import EmptyState from '../../components/EmptyState';
import ErrorBanner from '../../components/ErrorBanner';
import LatestProductsCarousel from '../../components/LatestProductsCarousel';
import ProductCard from '../../components/ProductCard';
import SearchBar from '../../components/SearchBar';
import ScreenContainer from '../../components/ScreenContainer';
import brand from '../../config/brand.json';
import { confirmAddProductToCart } from '../../services/cartAlerts';
import { useAppStore } from '../../store/AppStore';
import { filterProducts } from '../../store/selectors';
import { colors, radius, spacing, typography } from '../../theme';

export default function HomeScreen({ navigation }) {
  const {
    user,
    products,
    cartItems,
    addToCart,
    cartSummary,
    state,
    latestProducts,
    productCategories,
  } = useAppStore();
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const categories = [
    {
      id: 'all',
      label: 'Todas',
      count: products.length,
    },
    ...productCategories,
  ];

  const filteredProducts = filterProducts(products, {
    query: searchQuery,
    categoryId: selectedCategory,
  });
  const promotionalCount = products.filter((product) => product.isPromotion).length;

  function handleAddToCart(product) {
    confirmAddProductToCart({
      product,
      cartItems,
      addToCart,
    });
  }

  return (
    <ScreenContainer scroll contentContainerStyle={styles.content}>
      <View style={styles.hero}>
        <Text style={styles.greeting}>Hola, {user?.name}</Text>
        <Text style={styles.heroTitle}>{brand.appName}</Text>
        <Text style={styles.heroSubtitle}>
          Descubre ultimos ingresos, filtra por categoria y encuentra productos por nombre.
        </Text>
        <View style={styles.heroBadgeRow}>
          <View style={styles.heroBadge}>
            <Text style={styles.heroBadgeText}>{cartSummary.itemCount} articulos en carrito</Text>
          </View>
          <View style={styles.heroBadge}>
            <Text style={styles.heroBadgeText}>{promotionalCount} promociones activas</Text>
          </View>
        </View>
      </View>

      <ErrorBanner message={state.appError} />

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Ultimos ingresos</Text>
        <Text style={styles.sectionMeta}>5 productos mas recientes</Text>
      </View>
      <LatestProductsCarousel
        products={latestProducts}
        onSelectProduct={(productId) =>
          navigation.navigate('DetalleProducto', { productId })
        }
        onAddToCart={handleAddToCart}
      />

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Categorias</Text>
        <Text style={styles.sectionMeta}>{productCategories.length} disponibles</Text>
      </View>
      <CategoryFilterBar
        categories={categories}
        selectedCategoryId={selectedCategory}
        onSelectCategory={setSelectedCategory}
      />

      <SearchBar
        value={searchQuery}
        onChangeText={setSearchQuery}
        placeholder="Busca por nombre o categoria"
      />

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Resultados</Text>
        <Text style={styles.sectionMeta}>{filteredProducts.length} productos encontrados</Text>
      </View>

      {filteredProducts.length ? (
        filteredProducts.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            onPress={() => navigation.navigate('DetalleProducto', { productId: product.id })}
            onAddToCart={() => handleAddToCart(product)}
          />
        ))
      ) : (
        <EmptyState
          icon="search-outline"
          title="Sin coincidencias"
          description="Prueba otra categoria o escribe otro nombre para seguir explorando."
        />
      )}
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
  heroBadgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
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
