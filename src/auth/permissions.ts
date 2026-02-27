
import type { UserProfile } from '@/lib/types';

export type UserRole = UserProfile['role'];

// Define paths for each role.
// The key is the role, the value is an array of path prefixes that role can access.
const PERMISSIONS: Record<UserRole, string[]> = {
  Admin: ['/admin'], // Admins can access anything under /admin
  OrdersManager: ['/admin/orders', '/admin/shipping', '/admin/dashboard'],
  FinanceManager: ['/admin/withdrawals', '/admin/payments', '/admin/dashboard'],
  Dropshipper: ['/dashboard', '/products', '/orders', '/reports', '/profile', '/policy'],
  Merchant: ['/merchant', '/profile'], // Merchants can access anything under /merchant and their profile
};

// Common paths accessible by any authenticated user
const COMMON_PATHS: string[] = ['/profile', '/policy'];

export function hasPermission(role: UserRole | null, path: string): boolean {
  if (!role) {
    return false; // No role, no access to protected routes
  }

  // Combine role-specific paths and common paths, removing duplicates.
  const allowedPaths = [...new Set([...(PERMISSIONS[role] || []), ...COMMON_PATHS])];

  // Use `some` to check if the current path starts with any of the allowed prefixes.
  return allowedPaths.some(p => path.startsWith(p));
}

export function getDefaultPath(role: UserRole | null): string {
  if (role === 'Admin') return '/admin/dashboard';
  if (role === 'OrdersManager') return '/admin/orders';
  if (role === 'FinanceManager') return '/admin/withdrawals';
  if (role === 'Dropshipper') return '/dashboard';
  if (role === 'Merchant') return '/merchant/dashboard';
  
  // Default fallback for unhandled or null roles
  return '/login';
}
