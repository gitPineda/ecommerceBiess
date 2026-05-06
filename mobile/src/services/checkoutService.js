import { isApiMode } from '../config/env';
import { apiRequest } from './apiClient';
import { mapApiOrder } from './apiMappers';
import {
  CASH_ON_DELIVERY_PAYMENT_METHOD,
  PAYPHONE_COUNTRY_CODE,
  PAYPHONE_PAYMENT_METHOD,
} from '../config/commerce';

const CHECKOUT_DELAY_MS = 500;

export async function processCheckout(payload, session) {
  if (isApiMode()) {
    const order = await apiRequest('/orders', {
      method: 'POST',
      accessToken: session?.accessToken,
      body: {
        paymentMethod: payload.paymentMethod,
        phoneNumber: payload.phoneNumber,
        countryCode: payload.countryCode || PAYPHONE_COUNTRY_CODE,
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
    status:
      payload.paymentMethod === PAYPHONE_PAYMENT_METHOD
        ? 'pendiente'
        : 'pendiente',
    orderStatus: 'pendiente',
    paymentStatus: 'pending',
    paymentMethod: payload.paymentMethod,
    paymentProvider:
      payload.paymentMethod === PAYPHONE_PAYMENT_METHOD ? 'payphone' : 'cod',
    customerPhoneNumber: payload.phoneNumber || '',
    customerCountryCode: payload.countryCode || PAYPHONE_COUNTRY_CODE,
    total: payload.total,
    shippingAddress: payload.shippingAddress,
    deliveryOtp:
      payload.paymentMethod === CASH_ON_DELIVERY_PAYMENT_METHOD ? '123456' : '',
    hasVisibleDeliveryOtp: payload.paymentMethod === CASH_ON_DELIVERY_PAYMENT_METHOD,
    actions: {
      customerCanRateSeller: false,
      sellerCanRateCustomer: false,
      payphoneCanRefresh: payload.paymentMethod === PAYPHONE_PAYMENT_METHOD,
    },
    items: payload.items,
  };
}

export async function refreshOrderPaymentStatus(orderId, session) {
  if (isApiMode()) {
    const order = await apiRequest(`/orders/${orderId}/payphone/refresh`, {
      method: 'POST',
      accessToken: session?.accessToken,
    });

    return mapApiOrder(order);
  }

  await new Promise((resolve) => setTimeout(resolve, CHECKOUT_DELAY_MS));

  return {
    id: orderId,
    status: 'completado',
    orderStatus: 'completado',
    paymentStatus: 'paid',
    paymentMethod: PAYPHONE_PAYMENT_METHOD,
    paymentProvider: 'payphone',
    payphoneTransactionStatus: 'Approved',
    payphoneStatusCode: 3,
    payphoneMessage: '',
    ratingEligible: true,
    hasPendingRatings: true,
    customerCanRateSeller: true,
    actions: {
      customerCanRateSeller: true,
    },
  };
}

export async function listCurrentOrders(session) {
  if (isApiMode()) {
    const response = await apiRequest('/orders', {
      accessToken: session?.accessToken,
    });

    return (response.items || []).map(mapApiOrder);
  }

  return [];
}

export async function rateOrderProducts(orderId, ratings, session) {
  if (isApiMode()) {
    const order = await apiRequest(`/orders/${orderId}/ratings`, {
      method: 'POST',
      accessToken: session?.accessToken,
      body: {
        ratings: ratings.map((rating) => ({
          orderItemId: rating.orderItemId,
          stars: rating.stars,
        })),
      },
    });

    return mapApiOrder(order);
  }

  await new Promise((resolve) => setTimeout(resolve, CHECKOUT_DELAY_MS));

  return {
    id: orderId,
    status: 'completado',
    orderStatus: 'completado',
    paymentStatus: 'paid',
    paymentMethod: PAYPHONE_PAYMENT_METHOD,
    paymentProvider: 'payphone',
    ratingEligible: false,
    hasPendingRatings: false,
    customerCanRateSeller: false,
    customerRatedAt: new Date().toISOString(),
    items: ratings.map((rating) => ({
      id: rating.orderItemId,
      customerRating: rating.stars,
      ratedAt: new Date().toISOString(),
    })),
  };
}
