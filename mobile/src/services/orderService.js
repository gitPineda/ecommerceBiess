import { isApiMode } from '../config/env';
import { apiRequest } from './apiClient';
import { mapApiOrder } from './apiMappers';

const ORDER_ACTION_DELAY_MS = 400;

async function waitForMockResponse() {
  await new Promise((resolve) => setTimeout(resolve, ORDER_ACTION_DELAY_MS));
}

async function postOrderAction(path, session, body) {
  const order = await apiRequest(path, {
    method: 'POST',
    accessToken: session?.accessToken,
    body,
  });

  return mapApiOrder(order);
}

export async function listAssignedCashOnDeliveryOrders(session) {
  if (isApiMode()) {
    const response = await apiRequest('/orders/assigned', {
      accessToken: session?.accessToken,
    });

    return (response.items || []).map(mapApiOrder);
  }

  return [];
}

export async function acceptCashOnDeliveryOrder(orderId, session) {
  if (isApiMode()) {
    return postOrderAction(`/orders/${orderId}/cod/accept`, session);
  }

  await waitForMockResponse();
  return {
    id: orderId,
    status: 'confirmado',
    orderStatus: 'confirmado',
    paymentStatus: 'pending',
    paymentMethod: 'contra_entrega',
  };
}

export async function rejectCashOnDeliveryOrder(orderId, session) {
  if (isApiMode()) {
    return postOrderAction(`/orders/${orderId}/cod/reject`, session);
  }

  await waitForMockResponse();
  return {
    id: orderId,
    status: 'rechazado',
    orderStatus: 'rechazado',
    paymentStatus: 'canceled',
    paymentMethod: 'contra_entrega',
  };
}

export async function markCashOnDeliveryInPreparation(orderId, session) {
  if (isApiMode()) {
    return postOrderAction(`/orders/${orderId}/cod/prepare`, session);
  }

  await waitForMockResponse();
  return {
    id: orderId,
    status: 'en_preparacion',
    orderStatus: 'en_preparacion',
    paymentStatus: 'pending',
    paymentMethod: 'contra_entrega',
  };
}

export async function markCashOnDeliveryInTransit(orderId, session) {
  if (isApiMode()) {
    return postOrderAction(`/orders/${orderId}/cod/dispatch`, session);
  }

  await waitForMockResponse();
  return {
    id: orderId,
    status: 'en_camino',
    orderStatus: 'en_camino',
    paymentStatus: 'pending',
    paymentMethod: 'contra_entrega',
  };
}

export async function confirmCashOnDeliveryWithOtp(orderId, otp, session) {
  if (isApiMode()) {
    return postOrderAction(`/orders/${orderId}/cod/delivery/confirm`, session, {
      otp,
    });
  }

  await waitForMockResponse();
  return {
    id: orderId,
    status: 'entregado',
    orderStatus: 'entregado',
    paymentStatus: 'pending',
    paymentMethod: 'contra_entrega',
  };
}

export async function confirmCashOnDeliveryPayment(orderId, note, session) {
  if (isApiMode()) {
    return postOrderAction(`/orders/${orderId}/cod/payment/confirm`, session, {
      note,
    });
  }

  await waitForMockResponse();
  return {
    id: orderId,
    status: 'pagado',
    orderStatus: 'pagado',
    paymentStatus: 'paid',
    paymentMethod: 'contra_entrega',
  };
}

export async function rateCustomerForOrder(orderId, stars, session) {
  if (isApiMode()) {
    return postOrderAction(`/orders/${orderId}/customer-rating`, session, {
      stars,
    });
  }

  await waitForMockResponse();
  return {
    id: orderId,
    status: 'completado',
    orderStatus: 'completado',
    paymentStatus: 'paid',
    sellerCustomerRating: stars,
    sellerCustomerRatedAt: new Date().toISOString(),
  };
}
