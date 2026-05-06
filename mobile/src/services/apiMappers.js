import { buildCategoryId, normalizeProduct } from './productUtils';

export function mapApiUser(user) {
  return {
    id: user.id,
    name: user.fullName || `${user.firstName || ''} ${user.lastName || ''}`.trim(),
    username: user.username || buildCategoryId(user.email?.split('@')[0] || 'cliente'),
    email: user.email,
    phoneNumber: user.phoneNumber || '',
    role: user.role,
    sellerRating: Number(user.sellerRating ?? user.rating ?? 0),
    sellerStarsTotal: Number(user.sellerStarsTotal || 0),
    sellerRatedProductsCount: Number(
      user.sellerRatedProductsCount ?? user.ratedProductsCount ?? 0,
    ),
    customerRating: Number(user.customerRating || 0),
    customerStarsTotal: Number(user.customerStarsTotal || 0),
    customerRatedOrdersCount: Number(user.customerRatedOrdersCount || 0),
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

export function mapApiProduct(product) {
  return normalizeProduct({
    ...product,
    sellerId: product.sellerId,
    sellerName: product.sellerName,
    sellerUsername: product.sellerUsername,
    sellerEmail: product.sellerEmail,
    sellerRating: Number(product.sellerRating || product.seller?.rating || 0),
    sellerRatedProductsCount: Number(
      product.sellerRatedProductsCount || product.seller?.ratedProductsCount || 0,
    ),
    seller: product.seller,
    price: Number(product.price || 0),
    stock: Number(product.stock || 0),
    promotionDiscount: Number(product.promotionDiscount || 0),
  });
}

export function mapApiCategory(category) {
  return {
    id: category.id,
    label: category.label || category.name || '',
    name: category.name || category.label || '',
    icon: category.icon || 'cube-outline',
    description: category.description || '',
    isActive: category.isActive !== false,
    sortOrder: Number(category.sortOrder || 0),
    createdAt: category.createdAt || null,
    updatedAt: category.updatedAt || null,
  };
}

export function mapApiOrder(order) {
  return {
    id: order.id,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt || null,
    status: order.status,
    orderStatus: order.orderStatus || order.status,
    paymentStatus: order.paymentStatus || '',
    paymentMethod: order.paymentMethod,
    ratingEligible: Boolean(order.ratingEligible),
    hasPendingRatings: Boolean(order.hasPendingRatings),
    customerCanRateSeller: Boolean(order.customerCanRateSeller),
    sellerCanRateCustomer: Boolean(order.sellerCanRateCustomer),
    subtotal: Number(order.subtotal || 0),
    tax: Number(order.tax || 0),
    total: Number(order.total || 0),
    shippingAddress: order.shippingAddress || {},
    paymentProvider: order.paymentProvider || '',
    user: order.user ? mapApiUser(order.user) : null,
    assignedSeller: order.assignedSeller ? mapApiUser(order.assignedSeller) : null,
    customerPhoneNumber: order.customerPhoneNumber || '',
    customerCountryCode: order.customerCountryCode || '',
    paymentExpiresAt: order.paymentExpiresAt || null,
    paymentApprovedAt: order.paymentApprovedAt || null,
    confirmedAt: order.confirmedAt || null,
    preparingAt: order.preparingAt || null,
    inTransitAt: order.inTransitAt || null,
    deliveredAt: order.deliveredAt || null,
    paidAt: order.paidAt || null,
    completedAt: order.completedAt || null,
    cancelledAt: order.cancelledAt || null,
    rejectedAt: order.rejectedAt || null,
    deliveryOtp: order.deliveryOtp || '',
    hasVisibleDeliveryOtp: Boolean(order.hasVisibleDeliveryOtp),
    customerRatedAt: order.customerRatedAt || null,
    sellerCustomerRating:
      order.sellerCustomerRating === null || order.sellerCustomerRating === undefined
        ? null
        : Number(order.sellerCustomerRating),
    sellerCustomerRatedAt: order.sellerCustomerRatedAt || null,
    payphoneClientTransactionId: order.payphoneClientTransactionId || '',
    payphoneTransactionId: order.payphoneTransactionId || '',
    payphoneTransactionStatus: order.payphoneTransactionStatus || '',
    payphoneStatusCode:
      order.payphoneStatusCode === null || order.payphoneStatusCode === undefined
        ? null
        : Number(order.payphoneStatusCode),
    payphoneAuthorizationCode: order.payphoneAuthorizationCode || '',
    payphoneMessage: order.payphoneMessage || '',
    payphoneMessageCode:
      order.payphoneMessageCode === null || order.payphoneMessageCode === undefined
        ? null
        : Number(order.payphoneMessageCode),
    timeline: (order.timeline || []).map((event) => ({
      id: Number(event.id || 0),
      fromStatus: event.fromStatus || null,
      toStatus: event.toStatus || '',
      changedBy: event.changedBy ? mapApiUser(event.changedBy) : null,
      changedByRole: event.changedByRole || '',
      note: event.note || '',
      metadata: event.metadata || null,
      createdAt: event.createdAt || null,
    })),
    actions: {
      customerCanRateSeller: Boolean(order.actions?.customerCanRateSeller),
      sellerCanRateCustomer: Boolean(order.actions?.sellerCanRateCustomer),
      payphoneCanRefresh: Boolean(order.actions?.payphoneCanRefresh),
      canAccept: Boolean(order.actions?.canAccept),
      canReject: Boolean(order.actions?.canReject),
      canPrepare: Boolean(order.actions?.canPrepare),
      canDispatch: Boolean(order.actions?.canDispatch),
      canConfirmDelivery: Boolean(order.actions?.canConfirmDelivery),
      canConfirmPayment: Boolean(order.actions?.canConfirmPayment),
      canRateCustomer: Boolean(order.actions?.canRateCustomer),
    },
    items: (order.items || []).map((item) => ({
      id: Number(item.id || 0),
      productId: item.productId,
      sellerId: item.sellerId,
      sellerName: item.sellerName,
      sellerRating: Number(item.sellerRating || 0),
      name: item.name,
      category: item.category,
      imageUrl: item.imageUrl || '',
      price: Number(item.unitPrice || 0),
      unitPrice: Number(item.unitPrice || 0),
      quantity: Number(item.quantity || 0),
      customerRating:
        item.customerRating === null || item.customerRating === undefined
          ? null
          : Number(item.customerRating),
      ratedAt: item.ratedAt || null,
    })),
  };
}

export function mapApiSale(sale) {
  return {
    id: sale.id,
    orderId: sale.orderId,
    createdAt: sale.createdAt,
    updatedAt: sale.updatedAt,
    status: sale.status,
    orderStatus: sale.orderStatus || sale.status,
    paymentStatus: sale.paymentStatus || '',
    paymentMethod: sale.paymentMethod,
    shippingAddress: sale.shippingAddress || {},
    customer: sale.customer || null,
    seller: sale.seller || null,
    subtotal: Number(sale.subtotal || 0),
    tax: Number(sale.tax || 0),
    total: Number(sale.total || 0),
    totalUnits: Number(sale.totalUnits || 0),
    items: (sale.items || []).map((item) => ({
      id: item.id,
      productId: item.productId,
      sellerId: item.sellerId,
      sellerName: item.sellerName,
      name: item.name,
      category: item.category,
      imageUrl: item.imageUrl || '',
      unitPrice: Number(item.unitPrice || 0),
      quantity: Number(item.quantity || 0),
      lineTotal: Number(item.lineTotal || 0),
      customerRating:
        item.customerRating === null || item.customerRating === undefined
          ? null
          : Number(item.customerRating),
      ratedAt: item.ratedAt || null,
      currentStock: Number(item.currentStock || 0),
    })),
  };
}

export function mapApiCompany(company) {
  return {
    id: company.id,
    appName: company.appName,
    shortName: company.shortName,
    slug: company.slug,
    tagline: company.tagline,
    welcomeTitle: company.welcomeTitle,
    welcomeMessage: company.welcomeMessage,
    supportEmail: company.supportEmail,
    currency: company.currency,
    currencySymbol: company.currencySymbol,
    defaultLocale: company.defaultLocale,
    vatRate: Number(company.vatRate ?? 0.15),
    vatPercent: Number(company.vatPercent ?? 15),
    logoText: company.logoText,
    logoMimeType: company.logoMimeType || null,
    logoFileName: company.logoFileName || null,
    logoDataUri: company.logoDataUri || null,
    hasCustomLogo: Boolean(company.hasCustomLogo),
    createdAt: company.createdAt || null,
    updatedAt: company.updatedAt || null,
  };
}
