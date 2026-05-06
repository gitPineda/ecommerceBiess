export const PAYPHONE_COUNTRY_CODE = '593';
export const PAYPHONE_PAYMENT_METHOD = 'payphone';
export const CASH_ON_DELIVERY_PAYMENT_METHOD = 'contra_entrega';
export const PAYMENT_PROVIDER_PAYPHONE = 'payphone';
export const PAYMENT_PROVIDER_COD = 'cod';

export const PAYMENT_METHODS = [
  {
    value: PAYPHONE_PAYMENT_METHOD,
    label: 'Tarjeta PayPhone',
  },
  {
    value: CASH_ON_DELIVERY_PAYMENT_METHOD,
    label: 'Contra entrega',
  },
];

const PAYMENT_METHOD_LABELS = {
  [PAYPHONE_PAYMENT_METHOD]: 'Tarjeta PayPhone',
  [CASH_ON_DELIVERY_PAYMENT_METHOD]: 'Contra entrega',
  tarjeta: 'Tarjeta',
  tarjeta_payphone: 'Tarjeta PayPhone',
  tarjeta_simulada: 'Tarjeta PayPhone',
  contraentrega: 'Contra entrega',
};

const ORDER_STATUS_LABELS = {
  pending_payment: 'Pago pendiente',
  payment_approved: 'Pago aprobado',
  payment_canceled: 'Pago cancelado',
  payment_failed: 'Pago fallido',
  confirmed: 'Confirmado',
  paid: 'Pagado',
  cancelled: 'Cancelado',
  pendiente: 'Pendiente',
  confirmado: 'Confirmado',
  en_preparacion: 'En preparacion',
  en_camino: 'En camino',
  entregado: 'Entregado',
  completado: 'Completado',
  cancelado: 'Cancelado',
  rechazado: 'Rechazado',
};

const PAYMENT_STATUS_LABELS = {
  pending: 'Pago pendiente',
  paid: 'Pagado',
  failed: 'Pago fallido',
  canceled: 'Pago cancelado',
};

function humanize(rawValue = '') {
  return rawValue
    .replace(/_/g, ' ')
    .trim()
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

export function getPaymentMethodLabel(method) {
  const normalizedMethod = String(method || '').trim().toLowerCase();
  return PAYMENT_METHOD_LABELS[normalizedMethod] || humanize(normalizedMethod);
}

export function getOrderStatusLabel(status) {
  const normalizedStatus = String(status || '').trim().toLowerCase();
  return ORDER_STATUS_LABELS[normalizedStatus] || humanize(normalizedStatus);
}

export function getPaymentStatusLabel(status) {
  const normalizedStatus = String(status || '').trim().toLowerCase();
  return PAYMENT_STATUS_LABELS[normalizedStatus] || humanize(normalizedStatus);
}

export function isPendingPayphoneOrder(order) {
  return (
    order?.paymentProvider === PAYMENT_PROVIDER_PAYPHONE &&
    (String(order?.paymentStatus || '').toLowerCase() === 'pending' ||
      String(order?.status || '').toLowerCase() === 'pending_payment')
  );
}

export function isCashOnDeliveryOrder(order) {
  return (
    String(order?.paymentMethod || '').trim().toLowerCase() ===
      CASH_ON_DELIVERY_PAYMENT_METHOD ||
    String(order?.paymentProvider || '').trim().toLowerCase() === PAYMENT_PROVIDER_COD
  );
}

export function canRateCompletedOrder(order) {
  return (
    (String(order?.orderStatus || order?.status || '').toLowerCase() === 'completado' ||
      String(order?.status || '').toLowerCase() === 'payment_approved') &&
    (String(order?.paymentStatus || '').toLowerCase() === 'paid' ||
      String(order?.status || '').toLowerCase() === 'payment_approved') &&
    Boolean(
      order?.customerCanRateSeller ||
        order?.actions?.customerCanRateSeller ||
        order?.hasPendingRatings ||
        order?.ratingEligible,
    )
  );
}

export function canSellerRateCompletedOrder(order) {
  return (
    String(order?.orderStatus || order?.status || '').toLowerCase() === 'completado' &&
    String(order?.paymentStatus || '').toLowerCase() === 'paid' &&
    Boolean(order?.sellerCanRateCustomer || order?.actions?.canRateCustomer)
  );
}

export function shouldShowDeliveryOtp(order) {
  return Boolean(order?.hasVisibleDeliveryOtp && order?.deliveryOtp);
}
