export type AppRole = 'superadmin' | 'admin' | 'seller' | 'customer';

export function isAdminRole(role?: AppRole | null) {
  return role === 'admin' || role === 'superadmin';
}

export function hasRequiredRole(role: AppRole, requiredRoles: AppRole[]) {
  if (requiredRoles.includes(role)) {
    return true;
  }

  if (role === 'superadmin' && requiredRoles.includes('admin')) {
    return true;
  }

  return false;
}

export function mapPrismaRole(role: string): AppRole {
  if (role === 'superadmin') {
    return 'superadmin';
  }

  if (role === 'admin') {
    return 'admin';
  }

  if (role === 'seller') {
    return 'seller';
  }

  return 'customer';
}

export function mapAppRoleToPrisma(role: AppRole): string {
  return role;
}
