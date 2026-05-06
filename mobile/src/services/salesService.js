import { isApiMode } from '../config/env';
import { apiRequest } from './apiClient';
import { mapApiSale } from './apiMappers';

export async function listSellerSales(session) {
  if (!isApiMode()) {
    return [];
  }

  const response = await apiRequest('/orders/sales', {
    accessToken: session?.accessToken,
  });

  return (response.items || []).map(mapApiSale);
}
