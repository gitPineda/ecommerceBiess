import brand from './brand.json';

const currencyFormatter = new Intl.NumberFormat(brand.defaultLocale, {
  style: 'currency',
  currency: brand.currency,
  minimumFractionDigits: 2,
});

export function formatCurrency(value) {
  return currencyFormatter.format(Number(value || 0));
}
