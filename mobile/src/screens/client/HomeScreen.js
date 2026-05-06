import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import CategoryFilterBar from '../../components/CategoryFilterBar';
import CompactCustomerHeader from '../../components/CompactCustomerHeader';
import EmptyState from '../../components/EmptyState';
import ErrorBanner from '../../components/ErrorBanner';
import LatestProductsCarousel from '../../components/LatestProductsCarousel';
import ProductCard from '../../components/ProductCard';
import SearchBar from '../../components/SearchBar';
import ScreenContainer from '../../components/ScreenContainer';
import { confirmAddProductToCart } from '../../services/cartAlerts';
import { useAppStore } from '../../store/AppStore';
import { filterProducts } from '../../store/selectors';
import { useThemedStyles } from '../../theme';

const PRODUCTS_PER_PAGE = 10;

export default function HomeScreen({ navigation }) {
  const {
    user,
    company,
    products,
    cartItems,
    addToCart,
    cartSummary,
    state,
    latestProducts,
    productCategories,
  } = useAppStore();
  const styles = useThemedStyles(createStyles);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const categories = [
    {
      id: 'all',
      label: 'Todas',
      count: products.length,
    },
    ...productCategories,
  ];

  const filteredProducts = useMemo(
    () =>
      filterProducts(products, {
        query: searchQuery,
        categoryId: selectedCategory,
      }),
    [products, searchQuery, selectedCategory],
  );
  const promotionalCount = products.filter((product) => product.isPromotion).length;
  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / PRODUCTS_PER_PAGE));
  const currentPageSafe = Math.min(currentPage, totalPages);
  const paginatedProducts = useMemo(() => {
    const startIndex = (currentPageSafe - 1) * PRODUCTS_PER_PAGE;
    return filteredProducts.slice(startIndex, startIndex + PRODUCTS_PER_PAGE);
  }, [currentPageSafe, filteredProducts]);
  const visibleRangeStart = filteredProducts.length
    ? (currentPageSafe - 1) * PRODUCTS_PER_PAGE + 1
    : 0;
  const visibleRangeEnd = filteredProducts.length
    ? Math.min(currentPageSafe * PRODUCTS_PER_PAGE, filteredProducts.length)
    : 0;

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedCategory]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  function handleAddToCart(product) {
    confirmAddProductToCart({
      product,
      cartItems,
      addToCart,
    });
  }

  return (
    <ScreenContainer scroll contentContainerStyle={styles.content}>
      <CompactCustomerHeader user={user} onNotificationsPress={() => undefined} />

      {/* <View style={styles.hero}>
        <Text style={styles.heroTitle}>{company?.appName}</Text>
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
      </View> */}

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
        <Text style={styles.sectionMeta}>
          {filteredProducts.length} productos encontrados
        </Text>
      </View>
      {filteredProducts.length ? (
        <View style={styles.resultsMetaRow}>
          <Text style={styles.resultsMetaText}>
            Mostrando {visibleRangeStart}-{visibleRangeEnd} de {filteredProducts.length}
          </Text>
          <Text style={styles.resultsMetaText}>Pagina {currentPageSafe} de {totalPages}</Text>
        </View>
      ) : null}

      {paginatedProducts.length ? (
        paginatedProducts.map((product) => (
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

      {filteredProducts.length > PRODUCTS_PER_PAGE ? (
        <View style={styles.paginationRow}>
          <Pressable
            disabled={currentPageSafe === 1}
            onPress={() => setCurrentPage((page) => Math.max(1, page - 1))}
            style={({ pressed }) => [
              styles.paginationButton,
              currentPageSafe === 1 && styles.paginationButtonDisabled,
              pressed && currentPageSafe > 1 && styles.paginationButtonPressed,
            ]}
          >
            <Text
              style={[
                styles.paginationButtonText,
                currentPageSafe === 1 && styles.paginationButtonTextDisabled,
              ]}
            >
              Anterior
            </Text>
          </Pressable>

          <Pressable
            disabled={currentPageSafe === totalPages}
            onPress={() =>
              setCurrentPage((page) => Math.min(totalPages, page + 1))
            }
            style={({ pressed }) => [
              styles.paginationButton,
              currentPageSafe === totalPages && styles.paginationButtonDisabled,
              pressed &&
                currentPageSafe < totalPages &&
                styles.paginationButtonPressed,
            ]}
          >
            <Text
              style={[
                styles.paginationButtonText,
                currentPageSafe === totalPages && styles.paginationButtonTextDisabled,
              ]}
            >
              Siguiente
            </Text>
          </Pressable>
        </View>
      ) : null}
    </ScreenContainer>
  );
}

const createStyles = ({ colors, radius, spacing, typography }) =>
  StyleSheet.create({
    content: {
      gap: spacing.lg,
    },
    hero: {
      backgroundColor: colors.primaryDark,
      borderRadius: radius.xl,
      padding: spacing.xxl,
      gap: spacing.md,
    },
    heroTitle: {
      ...typography.display,
      color: colors.white,
    },
    heroSubtitle: {
      ...typography.body,
      color: colors.onDarkSoft,
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
      backgroundColor: colors.overlay,
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
    resultsMetaRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: spacing.md,
      marginTop: -spacing.sm,
    },
    resultsMetaText: {
      ...typography.caption,
      color: colors.muted,
    },
    paginationRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: spacing.md,
      marginTop: spacing.xs,
    },
    paginationButton: {
      flex: 1,
      minHeight: 44,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: spacing.md,
    },
    paginationButtonPressed: {
      opacity: 0.88,
    },
    paginationButtonDisabled: {
      backgroundColor: colors.surfaceAlt,
      borderColor: colors.border,
      opacity: 0.55,
    },
    paginationButtonText: {
      ...typography.bodyStrong,
      color: colors.text,
    },
    paginationButtonTextDisabled: {
      color: colors.muted,
    },
  });
