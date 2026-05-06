import { Platform } from 'react-native';
import { envConfig, isApiMode } from '../config/env';

let currentAccessToken = '';

export function setApiAccessToken(token) {
  currentAccessToken = token || '';
}

function buildHeaders(options = {}) {
  const headers = {
    ...(options.body ? { 'Content-Type': 'application/json' } : {}),
    'X-Client-Device': `${envConfig.appName} | ${Platform.OS} ${Platform.Version}`,
    ...(options.headers || {}),
  };

  const token = options.accessToken || currentAccessToken;

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return headers;
}

export async function apiRequest(endpoint, options = {}) {
  if (!isApiMode()) {
    throw new Error('La API remota no esta habilitada para esta compilacion.');
  }

  const response = await fetch(`${envConfig.apiBaseUrl}${endpoint}`, {
    ...options,
    headers: buildHeaders(options),
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const responseText = await response.text();
  const payload = responseText ? parseApiResponse(responseText) : null;

  if (!response.ok) {
    const message =
      payload?.message ||
      payload?.error ||
      (typeof payload === 'string' ? payload : '') ||
      'No se pudo completar la solicitud remota.';

    throw new Error(Array.isArray(message) ? message.join(', ') : message);
  }

  return payload;
}

function parseApiResponse(rawResponse) {
  const normalizedResponse = rawResponse.replace(/^\uFEFF/, '').trim();

  if (!normalizedResponse) {
    return null;
  }

  try {
    return JSON.parse(normalizedResponse);
  } catch {
    return normalizedResponse;
  }
}
