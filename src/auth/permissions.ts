
import type { UserProfile } from '@/lib/types';

export type UserRole = UserProfile['role'];

// Define paths for each role.
// The key is the role, the value is an array of path prefixes that role can access.
const PERMISSIONS: Record<UserRole, string[]> = {
  Admin: ['/admin'],
  OrdersManager: ['/admin/orders', '/admin/shipping', '/admin/dashboard', '/admin/products', '/admin/categories', '/admin/inventory'],
  FinanceManager: ['/admin/withdrawals', '/admin/payments', '/admin/dashboard', '/admin/settlements'],
  Dropshipper: ['/dashboard', '/products', '/orders', '/reports', '/profile', '/policy'],
  Merchant: ['/merchant', '/profile', '/policy'],
};

// Common paths accessible by any authenticated user
const COMMON_PATHS: string[] = ['/profile', '/policy'];

/**
 * Checks if a user with a given role has permission to access a specific path.
 * @param role The user's role.
 * @param path The path to check.
 * @returns `true` if the user has permission, `false` otherwise.
 */
export function hasPermission(role: UserRole | null, path: string): boolean {
  if (!role) {
    return false; // No role, no access to protected routes
  }

  // Get the specific permissions for the user's role.
  const rolePermissions = PERMISSIONS[role] || [];
  
  // Combine role-specific paths and common paths.
  const allowedPaths = [...new Set([...rolePermissions, ...COMMON_PATHS])];

  // Check if the current path starts with any of the allowed prefixes.
  return allowedPaths.some(p => path.startsWith(p));
}

/**
 * Gets the default path for a user based on their role.
 * @param role The user's role.
 * @returns The default path for the user.
 */
export function getDefaultPath(role: UserRole | null): string {
  if (role === 'Admin') return '/admin/dashboard';
  if (role === 'OrdersManager') return '/admin/orders';
  if (role === 'FinanceManager') return '/admin/withdrawals';
  if (role === 'Dropshipper') return '/dashboard';
  if (role === 'Merchant') return '/merchant/dashboard';
  
  // Default fallback for unhandled or null roles
  return '/login';
}
