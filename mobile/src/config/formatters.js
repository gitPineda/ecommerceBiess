import brand from './brand.json';

const currencyFormatter = new Intl.NumberFormat(brand.defaultLocale, {
  style: 'currency',
  currency: brand.currency,
  minimumFractionDigits: 2,
});

export function formatCurrency(value) {
  return currencyFormatter.format(Number(value || 0));
}

export function formatPercentage(value) {
  return `${Number(value || 0)}%`;
}

const dateTimeFormatter = new Intl.DateTimeFormat(brand.defaultLocale, {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: 'America/Guayaquil',
});

export function formatDateTime(value) {
  if (!value) {
    return '';
  }

  return dateTimeFormatter.format(new Date(value));
}

const auditDateTimeFormatter = new Intl.DateTimeFormat(brand.defaultLocale, {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: 'UTC',
});

export function formatAuditDateTime(value) {
  if (!value) {
    return '';
  }

  return auditDateTimeFormatter.format(new Date(value));
}
