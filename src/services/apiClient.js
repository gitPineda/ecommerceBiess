import { envConfig } from '../config/env';

export async function apiRequest(endpoint, options = {}) {
  if (envConfig.dataSource !== 'http') {
    throw new Error(
      'La API remota no esta habilitada. Cambia src/config/env.js para usar HTTP o Supabase.',
    );
  }

  const response = await fetch(`${envConfig.apiBaseUrl}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  });

  if (!response.ok) {
    throw new Error('No se pudo completar la solicitud remota.');
  }

  return response.json();
}
