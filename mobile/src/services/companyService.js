import { getDefaultCompanyConfig } from '../config/company';
import { isApiMode } from '../config/env';
import { apiRequest } from './apiClient';
import { mapApiCompany } from './apiMappers';

export async function loadCompanyConfig() {
  if (!isApiMode()) {
    return getDefaultCompanyConfig();
  }

  const response = await apiRequest('/company');
  return mapApiCompany(response);
}

export async function updateCompanyConfig(payload, session) {
  const normalizedVatPercent = Number(payload.vatPercent ?? 15);

  if (!isApiMode()) {
    return {
      ...getDefaultCompanyConfig(),
      appName: payload.appName.trim(),
      shortName: payload.shortName.trim(),
      slug: payload.slug.trim().toLowerCase(),
      tagline: payload.tagline.trim(),
      welcomeTitle: payload.welcomeTitle.trim(),
      welcomeMessage: payload.welcomeMessage.trim(),
      supportEmail: payload.supportEmail.trim().toLowerCase(),
      currency: payload.currency.trim().toUpperCase(),
      currencySymbol: payload.currencySymbol.trim(),
      defaultLocale: payload.defaultLocale.trim(),
      vatRate: Number((normalizedVatPercent / 100).toFixed(4)),
      vatPercent: normalizedVatPercent,
      logoText: payload.logoText.trim(),
      logoDataUri: payload.clearLogo ? null : payload.logoPreviewUri || null,
      hasCustomLogo: payload.clearLogo ? false : Boolean(payload.logoPreviewUri),
      updatedAt: new Date().toISOString(),
    };
  }

  const response = await apiRequest('/company', {
    method: 'PUT',
    accessToken: session?.accessToken,
    body: {
      appName: payload.appName.trim(),
      shortName: payload.shortName.trim(),
      slug: payload.slug.trim().toLowerCase(),
      tagline: payload.tagline.trim(),
      welcomeTitle: payload.welcomeTitle.trim(),
      welcomeMessage: payload.welcomeMessage.trim(),
      supportEmail: payload.supportEmail.trim().toLowerCase(),
      currency: payload.currency.trim().toUpperCase(),
      currencySymbol: payload.currencySymbol.trim(),
      defaultLocale: payload.defaultLocale.trim(),
      vatPercent: normalizedVatPercent,
      logoText: payload.logoText.trim(),
      logoBase64: payload.logoBase64 || undefined,
      logoMimeType: payload.logoMimeType || undefined,
      logoFileName: payload.logoFileName || undefined,
      clearLogo: Boolean(payload.clearLogo),
    },
  });

  return mapApiCompany(response);
}
