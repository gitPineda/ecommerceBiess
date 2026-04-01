import { isApiMode } from '../config/env';
import productsData from '../data/products.json';
import usersData from '../data/users.json';
import { apiRequest } from './apiClient';
import { mapApiProduct, mapApiUser } from './apiMappers';
import { normalizeProduct } from './productUtils';

const NETWORK_DELAY_MS = 450;

function clone(data) {
  return JSON.parse(JSON.stringify(data));
}

export async function bootstrapCatalog(storedProducts, storedUsers) {
  return bootstrapCatalogWithSession(storedProducts, storedUsers, null);
}

export async function bootstrapCatalogWithSession(storedProducts, storedUsers, session) {
  if (isApiMode()) {
    const productsResponse = await apiRequest('/products');
    let users = [];

    if (session?.user?.role === 'admin') {
      const usersResponse = await apiRequest('/users', {
        accessToken: session.accessToken,
      });
      users = (usersResponse.items || []).map(mapApiUser);
    }

    return {
      products: (productsResponse.items || []).map(mapApiProduct),
      users,
    };
  }

  await new Promise((resolve) => setTimeout(resolve, NETWORK_DELAY_MS));

  return {
    products: (storedProducts?.length ? clone(storedProducts) : clone(productsData)).map(
      normalizeProduct,
    ),
    users: storedUsers?.length ? clone(storedUsers) : clone(usersData),
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
        category: payload.category.trim(),
        categoryId: payload.categoryId,
        price: Number(payload.price),
        stock: Number(payload.stock),
        featured: Boolean(payload.featured),
        isPromotion: Boolean(payload.isPromotion),
        promotionDiscount: Number(payload.promotionDiscount || 0),
        description: payload.description.trim(),
      },
    });

    return mapApiProduct(product);
  }

  return null;
}
