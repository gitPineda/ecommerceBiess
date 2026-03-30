export function buildCategoryId(value = 'General') {
  return value
    .toString()
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'general';
}

function clampDiscount(value) {
  return Math.max(0, Math.min(Number(value || 0), 90));
}

export function normalizeProduct(product) {
  const category = product.category?.trim() || 'General';
  const categoryId = product.categoryId?.trim() || buildCategoryId(category);
  const promotionDiscount = clampDiscount(product.promotionDiscount);
  const isPromotion = Boolean(product.isPromotion) && promotionDiscount > 0;

  return {
    ...product,
    category,
    categoryId,
    price: Number(product.price || 0),
    stock: Number(product.stock || 0),
    featured: Boolean(product.featured),
    isPromotion,
    promotionDiscount: isPromotion ? promotionDiscount : 0,
    createdAt: product.createdAt || new Date().toISOString(),
  };
}

export function createProductFromPayload(payload) {
  return normalizeProduct({
    id: `prd-${Date.now()}`,
    name: payload.name.trim(),
    sku: payload.sku.trim().toUpperCase(),
    category: payload.category.trim(),
    categoryId: buildCategoryId(payload.category),
    price: Number(payload.price),
    stock: Number(payload.stock),
    featured: Boolean(payload.featured),
    isPromotion: Boolean(payload.isPromotion),
    promotionDiscount: Number(payload.promotionDiscount || 0),
    description: payload.description.trim(),
    createdAt: new Date().toISOString(),
  });
}
