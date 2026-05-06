import { isApiMode } from '../config/env';
import { isAdminRole } from '../config/roles';
import productsData from '../data/products.json';
import usersData from '../data/users.json';
import { apiRequest } from './apiClient';
import { mapApiProduct, mapApiUser } from './apiMappers';
import { listCategories } from './categoryService';
import { normalizeProduct } from './productUtils';

const NETWORK_DELAY_MS = 450;

function clone(data) {
  return JSON.parse(JSON.stringify(data));
}

export async function bootstrapCatalog(storedProducts, storedUsers, storedCategories) {
  return bootstrapCatalogWithSession(storedProducts, storedUsers, storedCategories, null);
}

export async function bootstrapCatalogWithSession(
  storedProducts,
  storedUsers,
  storedCategories,
  session,
) {
  if (isApiMode()) {
    const shouldLoadManagedProducts =
      isAdminRole(session?.user?.role) || session?.user?.role === 'seller';
    const productsResponse = await apiRequest(
      shouldLoadManagedProducts ? '/products/managed' : '/products',
      shouldLoadManagedProducts
        ? {
            accessToken: session?.accessToken,
          }
        : undefined,
    );
    let users = [];

    if (isAdminRole(session?.user?.role)) {
      const usersResponse = await apiRequest('/users', {
        accessToken: session.accessToken,
      });
      users = (usersResponse.items || []).map(mapApiUser);
    }

    const categories = await listCategories(session);

    return {
      products: (productsResponse.items || []).map(mapApiProduct),
      users,
      categories,
    };
  }

  await new Promise((resolve) => setTimeout(resolve, NETWORK_DELAY_MS));

  return {
    products: (storedProducts?.length ? clone(storedProducts) : clone(productsData)).map(
      normalizeProduct,
    ),
    users: storedUsers?.length ? clone(storedUsers) : clone(usersData),
    categories: storedCategories?.length ? clone(storedCategories) : await listCategories(session),
  };
}

export async function createCatalogProduct(payload, session) {
  if (isApiMode()) {
    const product = await apiRequest('/products', {
      method: 'POST',
      accessToken: session?.accessToken,
      body: {
        name: payload.name.trim(),
        sku: payload.sku.trim().toUpperCase(),
        categoryId: payload.categoryId,
        price: Number(payload.price),
        stock: Number(payload.stock),
        featured: Boolean(payload.featured),
        isPromotion: Boolean(payload.isPromotion),
        promotionDiscount: Number(payload.promotionDiscount || 0),
        sellerId: payload.sellerId || undefined,
        description: payload.description.trim(),
        imageBase64: payload.imageBase64 || undefined,
        imageMimeType: payload.imageMimeType || undefined,
        imageFileName: payload.imageFileName || undefined,
      },
    });

    return mapApiProduct(product);
  }

  return null;
}

export async function updateCatalogProduct(productId, payload, session) {
  if (isApiMode()) {
    const product = await apiRequest(`/products/${productId}`, {
      method: 'PATCH',
      accessToken: session?.accessToken,
      body: {
        name: payload.name.trim(),
        price: Number(payload.price),
        stock: Number(payload.stock),
        description: payload.description.trim(),
      },
    });

    return mapApiProduct(product);
  }

  return normalizeProduct({
    ...payload.currentProduct,
    name: payload.name.trim(),
    price: Number(payload.price),
    stock: Number(payload.stock),
    description: payload.description.trim(),
    updatedAt: new Date().toISOString(),
  });
}
