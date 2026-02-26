
import type { UserProfile } from '@/lib/types';

export type UserRole = UserProfile['role'];

// Define paths for each role. Admin has implicit access to everything starting with '/admin'
const PERMISSIONS: Record<UserRole, string[]> = {
  Admin: ['/admin'],
  OrdersManager: ['/admin/orders', '/admin/shipping', '/admin/dashboard'],
  FinanceManager: ['/admin/withdrawals', '/admin/payments', '/admin/dashboard'],
  Merchant: ['/merchant'],
  Dropshipper: ['/dashboard', '/products', '/orders', '/reports', '/profile', '/policy'],
};

// Common paths accessible by any authenticated user
const COMMON_PATHS = ['/profile', '/policy'];

export function hasPermission(role: UserRole | null, path: string): boolean {
  if (!role) return false; // No role, no access to protected routes

  if (COMMON_PATHS.some(p => path.startsWith(p))) {
    return true;
  }
  
  // Admin has access to all admin routes implicitly.
  // Admins can also access the merchant portal for supervision.
  if (role === 'Admin' && (path.startsWith('/admin') || path.startsWith('/merchant'))) {
    return true;
  }

  const allowedPaths = PERMISSIONS[role] || [];
  return allowedPaths.some(p => path.startsWith(p));
}

export function getDefaultPath(role: UserRole | null): string {
  if (role === 'Admin') return '/admin/dashboard';
  if (role === 'OrdersManager') return '/admin/orders';
  if (role === 'FinanceManager') return '/admin/withdrawals';
  if (role === 'Merchant') return '/merchant/dashboard';
  if (role === 'Dropshipper') return '/dashboard';
  
  // Default fallback for unhandled or null roles
  return '/';
}
