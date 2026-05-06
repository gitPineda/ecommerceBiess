export const DEFAULT_CURRENCY = 'USD';
export const PAYPHONE_PAYMENT_METHOD = 'payphone';
export const CASH_ON_DELIVERY_PAYMENT_METHOD = 'contra_entrega';
export const PAYPHONE_PROVIDER = 'payphone';
export const CASH_ON_DELIVERY_PROVIDER = 'cod';
export const PAYPHONE_DEFAULT_COUNTRY_CODE = '593';
export const PAYPHONE_PENDING_MINUTES = 5;
export const COD_DELIVERY_OTP_LENGTH = 6;

export type SupportedPaymentMethod =
  | typeof PAYPHONE_PAYMENT_METHOD
  | typeof CASH_ON_DELIVERY_PAYMENT_METHOD;
