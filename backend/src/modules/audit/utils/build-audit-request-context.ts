import {
  AuditRequestContext,
  RequestLike,
} from '../interfaces/audit-request-context.interface';

function getHeaderValue(value?: string | string[]) {
  if (Array.isArray(value)) {
    return value.join(', ').trim();
  }

  return value?.trim() || '';
}

export function buildAuditRequestContext(
  request?: RequestLike,
): AuditRequestContext {
  const forwardedFor = getHeaderValue(request?.headers?.['x-forwarded-for']);
  const realIp = getHeaderValue(request?.headers?.['x-real-ip']);
  const ipAddress =
    forwardedFor.split(',')[0]?.trim() ||
    realIp ||
    request?.ip?.trim() ||
    request?.socket?.remoteAddress?.trim() ||
    null;

  const clientDevice = getHeaderValue(request?.headers?.['x-client-device']);
  const userAgent = getHeaderValue(request?.headers?.['user-agent']);
  const deviceInfo = [clientDevice, userAgent].filter(Boolean).join(' | ') || null;

  return {
    ipAddress,
    deviceInfo,
  };
}
