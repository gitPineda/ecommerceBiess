export interface RequestLike {
  headers?: Record<string, string | string[] | undefined>;
  ip?: string;
  socket?: {
    remoteAddress?: string | null;
  };
}

export interface AuditRequestContext {
  ipAddress: string | null;
  deviceInfo: string | null;
}
