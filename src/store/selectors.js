export function getCartSummary(cartItems) {
  const itemCount = cartItems.reduce((total, item) => total + item.quantity, 0);
  const subtotal = cartItems.reduce(
    (total, item) => total + item.price * item.quantity,
    0,
  );
  const tax = subtotal * 0.12;
  const total = subtotal + tax;

  return {
    itemCount,
    subtotal,
    tax,
    total,
  };
}

export function findProductById(products, productId) {
  return products.find((product) => product.id === productId);
}

export function getProductPricing(product) {
  const originalPrice = Number(product?.price || 0);
  const hasPromotion =
    Boolean(product?.isPromotion) && Number(product?.promotionDiscount || 0) > 0;
  const finalPrice = hasPromotion
    ? originalPrice * (1 - Number(product.promotionDiscount || 0) / 100)
    : originalPrice;

  return {
    originalPrice,
    finalPrice,
    hasPromotion,
    discount: hasPromotion ? Number(product.promotionDiscount || 0) : 0,
  };
}

export function getLatestProducts(products, limit = 5) {
  return [...products]
    .sort((left, right) => new Date(right.createdAt) - new Date(left.createdAt))
    .slice(0, limit);
}

export function getAvailableCategories(products) {
  const categoriesMap = new Map();

  products.forEach((product) => {
    const existing = categoriesMap.get(product.categoryId);

    if (existing) {
      existing.count += 1;
      return;
    }

    categoriesMap.set(product.categoryId, {
      id: product.categoryId,
      label: product.category,
      count: 1,
    });
  });

  return [...categoriesMap.values()].sort((left, right) =>
    left.label.localeCompare(right.label),
  );
}

export function filterProducts(products, filters) {
  const normalizedQuery = filters.query.trim().toLowerCase();

  return products.filter((product) => {
    const matchesCategory =
      filters.categoryId === 'all' || product.categoryId === filters.categoryId;
    const matchesQuery =
      !normalizedQuery ||
      product.name.toLowerCase().includes(normalizedQuery) ||
      product.category.toLowerCase().includes(normalizedQuery);

    return matchesCategory && matchesQuery;
  });
}
