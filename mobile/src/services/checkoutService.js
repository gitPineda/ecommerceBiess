import { isApiMode } from '../config/env';
import { apiRequest } from './apiClient';
import { mapApiOrder } from './apiMappers';

const CHECKOUT_DELAY_MS = 500;

export async function processCheckout(payload, session) {
  if (isApiMode()) {
    const order = await apiRequest('/orders', {
      method: 'POST',
      accessToken: session?.accessToken,
      body: {
        paymentMethod: payload.paymentMethod,
        shippingAddress: payload.shippingAddress,
        items: payload.items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
        })),
      },
    });

    return mapApiOrder(order);
  }

  await new Promise((resolve) => setTimeout(resolve, CHECKOUT_DELAY_MS));

  return {
    id: `ord-${Date.now()}`,
    createdAt: new Date().toISOString(),
    status: 'confirmed',
    paymentMethod: payload.paymentMethod,
    total: payload.total,
    shippingAddress: payload.shippingAddress,
    items: payload.items,
  };
}
