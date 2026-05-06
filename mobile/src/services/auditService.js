import { isApiMode } from '../config/env';
import { apiRequest } from './apiClient';

export async function listAudits(session) {
  if (isApiMode()) {
    const response = await apiRequest('/auditoria?limit=100', {
      accessToken: session?.accessToken,
    });

    return response.items || [];
  }

  return [];
}
