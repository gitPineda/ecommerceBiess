import brand from './brand.json';

export function getDefaultCompanyConfig() {
  return {
    id: 'default',
    appName: brand.appName,
    shortName: brand.shortName,
    slug: brand.slug,
    tagline: brand.tagline,
    welcomeTitle: brand.welcomeTitle,
    welcomeMessage: brand.welcomeMessage,
    supportEmail: brand.supportEmail,
    currency: brand.currency,
    currencySymbol: brand.currencySymbol,
    defaultLocale: brand.defaultLocale,
    vatRate: 0.15,
    vatPercent: 15,
    logoText: brand.logoText,
    logoMimeType: null,
    logoFileName: null,
    logoDataUri: null,
    hasCustomLogo: false,
    createdAt: null,
    updatedAt: null,
  };
}
