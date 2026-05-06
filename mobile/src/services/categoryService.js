import { isApiMode } from '../config/env';
import {
  PRODUCT_CATEGORY_ICON_OPTIONS,
  PRODUCT_CATEGORY_META,
} from '../config/productCategories';
import { apiRequest } from './apiClient';
import { mapApiCategory } from './apiMappers';
import { buildCategoryId } from './productUtils';

function buildMockCategories() {
  const iconMap = new Map(
    PRODUCT_CATEGORY_ICON_OPTIONS.map((item) => [item.id, item.label]),
  );

  return Object.entries(PRODUCT_CATEGORY_META)
    .map(([id, meta], index) => ({
      id,
      label: meta.label,
      name: meta.label,
      icon: meta.icon,
      description: iconMap.get(meta.icon) || '',
      isActive: true,
      sortOrder: index,
      createdAt: null,
      updatedAt: null,
    }))
    .sort((left, right) => left.label.localeCompare(right.label));
}

export async function listCategories(session) {
  if (isApiMode()) {
    const response = await apiRequest('/product-categories', {
      accessToken: session?.accessToken,
    });

    return (response.items || []).map(mapApiCategory);
  }

  return buildMockCategories();
}

export async function listManagedCategories(session) {
  if (isApiMode()) {
    const response = await apiRequest('/product-categories/managed', {
      accessToken: session?.accessToken,
    });

    return (response.items || []).map(mapApiCategory);
  }

  return buildMockCategories();
}

export async function createProductCategory(payload, session) {
  if (isApiMode()) {
    const category = await apiRequest('/product-categories', {
      method: 'POST',
      accessToken: session?.accessToken,
      body: {
        name: payload.name.trim(),
        icon: payload.icon,
        description: payload.description?.trim() || undefined,
        sortOrder: Number(payload.sortOrder || 0),
      },
    });

    return mapApiCategory(category);
  }

  return {
    id: buildCategoryId(payload.name),
    label: payload.name.trim(),
    name: payload.name.trim(),
    icon: payload.icon,
    description: payload.description?.trim() || '',
    isActive: true,
    sortOrder: Number(payload.sortOrder || 0),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}
