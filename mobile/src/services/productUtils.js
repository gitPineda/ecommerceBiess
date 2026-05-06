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
    sellerId: product.sellerId || '',
    sellerName: product.sellerName || product.seller?.fullName || '',
    sellerUsername: product.sellerUsername || product.seller?.username || '',
    sellerEmail: product.sellerEmail || product.seller?.email || '',
    categoryIcon: product.categoryIcon || '',
    price: Number(product.price || 0),
    stock: Number(product.stock || 0),
    isActive: product.isActive !== false,
    featured: Boolean(product.featured),
    isPromotion,
    promotionDiscount: isPromotion ? promotionDiscount : 0,
    imageProvider: product.imageProvider || '',
    imagePublicId: product.imagePublicId || '',
    imageAssetId: product.imageAssetId || '',
    imageUrl: product.imageUrl || product.imageSecureUrl || '',
    imageSecureUrl: product.imageSecureUrl || product.imageUrl || '',
    imageThumbUrl:
      product.imageThumbUrl || product.imageCardUrl || product.imageUrl || '',
    imageCardUrl:
      product.imageCardUrl || product.imageThumbUrl || product.imageUrl || '',
    imageDetailUrl:
      product.imageDetailUrl || product.imageUrl || product.imageCardUrl || '',
    imageWidth: Number(product.imageWidth || 0),
    imageHeight: Number(product.imageHeight || 0),
    imageBytes: Number(product.imageBytes || 0),
    imageFormat: product.imageFormat || '',
    imageResourceType: product.imageResourceType || '',
    imageMimeType: product.imageMimeType || '',
    imageFolder: product.imageFolder || '',
    imageVersion: product.imageVersion || '',
    imageOriginalName: product.imageOriginalName || '',
    imageUploadedAt: product.imageUploadedAt || null,
    hasImage: Boolean(
      product.hasImage ||
        product.imageUrl ||
        product.imageSecureUrl ||
        product.imageThumbUrl ||
        product.imageCardUrl ||
        product.imageDetailUrl,
    ),
    createdAt: product.createdAt || new Date().toISOString(),
  };
}

export function createProductFromPayload(payload) {
  return normalizeProduct({
    id: `prd-${Date.now()}`,
    name: payload.name.trim(),
    sku: payload.sku.trim().toUpperCase(),
    sellerId: payload.sellerId || '',
    sellerName: payload.sellerName || '',
    sellerUsername: payload.sellerUsername || '',
    sellerEmail: payload.sellerEmail || '',
    category: payload.category.trim(),
    categoryId: payload.categoryId || buildCategoryId(payload.category),
    categoryIcon: payload.categoryIcon || '',
    price: Number(payload.price),
    stock: Number(payload.stock),
    featured: Boolean(payload.featured),
    isPromotion: Boolean(payload.isPromotion),
    promotionDiscount: Number(payload.promotionDiscount || 0),
    description: payload.description.trim(),
    imageUrl: payload.imagePreviewUri || '',
    imageSecureUrl: payload.imagePreviewUri || '',
    imageThumbUrl: payload.imagePreviewUri || '',
    imageCardUrl: payload.imagePreviewUri || '',
    imageDetailUrl: payload.imagePreviewUri || '',
    hasImage: Boolean(payload.imagePreviewUri),
    createdAt: new Date().toISOString(),
  });
}

export function getProductImageUrl(product, variant = 'card') {
  if (!product) {
    return '';
  }

  if (variant === 'thumb') {
    return product.imageThumbUrl || product.imageCardUrl || product.imageUrl || '';
  }

  if (variant === 'detail') {
    return (
      product.imageDetailUrl ||
      product.imageCardUrl ||
      product.imageUrl ||
      product.imageThumbUrl ||
      ''
    );
  }

  return product.imageCardUrl || product.imageThumbUrl || product.imageUrl || '';
}
