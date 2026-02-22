
import type { UserProfile } from '@/lib/types';

// Define a type for roles for clarity
export type UserRole = UserProfile['role'];

// Map roles to their default landing pages
export const DEFAULT_PATHS: Record<UserRole, string> = {
  Admin: '/admin/dashboard',
  OrdersManager: '/admin/orders',
  FinanceManager: '/admin/withdrawals',
  ProductManager: '/admin/products',
  Dropshipper: '/dashboard',
};

// Map roles to the route prefixes they are allowed to access
export const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  Admin: ['/admin'],
  OrdersManager: ['/admin/orders', '/admin/shipping'],
  FinanceManager: ['/admin/withdrawals', '/admin/payments'],
  ProductManager: ['/admin/products', '/admin/inventory', '/admin/categories', '/admin/inquiries'],
  Dropshipper: ['/dashboard', '/products', '/orders', '/reports', '/profile', '/messages', '/policy'],
};

// Universally accessible paths for any logged-in user
const UNIVERSAL_PATHS = ['/profile', '/messages', '/policy'];

/**
 * Checks if a user with a given role has permission to access a path.
 * @param role The user's role.
 * @param path The path they are trying to access.
 * @returns True if access is allowed, false otherwise.
 */
export function hasPermission(role: UserRole | null, path: string): boolean {
  if (!role) {
    return false;
  }

  // Allow access to universal paths for any role
  if (UNIVERSAL_PATHS.some(p => path.startsWith(p))) {
    return true;
  }

  const allowedRoutes = ROLE_PERMISSIONS[role] || [];
  return allowedRoutes.some(allowedPath => path.startsWith(allowedPath));
}

/**
 * Gets the default landing page for a given role.
 * @param role The user's role.
 * @returns The default path for the role, or a safe fallback.
 */
export function getDefaultPath(role: UserRole | null): string {
  if (role && DEFAULT_PATHS[role]) {
    return DEFAULT_PATHS[role];
  }
  // A logged-in user with an unknown or null role should be sent to a safe page.
  // The SessionProvider should handle logging them out, but as a robust fallback,
  // we direct them to the root where their state can be re-evaluated safely.
  return '/';
}
