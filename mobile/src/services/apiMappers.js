import { buildCategoryId, normalizeProduct } from './productUtils';

export function mapApiUser(user) {
  return {
    id: user.id,
    name: user.fullName || `${user.firstName || ''} ${user.lastName || ''}`.trim(),
    username: user.username || buildCategoryId(user.email?.split('@')[0] || 'cliente'),
    email: user.email,
    role: user.role,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

export function mapApiProduct(product) {
  return normalizeProduct({
    ...product,
    price: Number(product.price || 0),
    stock: Number(product.stock || 0),
    promotionDiscount: Number(product.promotionDiscount || 0),
  });
}

export function mapApiOrder(order) {
  return {
    id: order.id,
    createdAt: order.createdAt,
    status: order.status,
    paymentMethod: order.paymentMethod,
    subtotal: Number(order.subtotal || 0),
    tax: Number(order.tax || 0),
    total: Number(order.total || 0),
    shippingAddress: order.shippingAddress || {},
    items: (order.items || []).map((item) => ({
      productId: item.productId,
      name: item.name,
      category: item.category,
      price: Number(item.unitPrice || 0),
      quantity: Number(item.quantity || 0),
    })),
  };
}
