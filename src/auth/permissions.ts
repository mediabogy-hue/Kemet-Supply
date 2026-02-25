
import type { UserProfile } from '@/lib/types';

export type UserRole = UserProfile['role'];

const COMMON_PATHS = ['/profile'];

const PERMISSIONS: Record<UserRole, string[]> = {
  Admin: ['/admin'],
  OrdersManager: ['/admin/orders', '/admin/shipping'],
  FinanceManager: ['/admin/withdrawals', '/admin/payments'],
  ProductManager: ['/admin/products', '/admin/inventory'],
  Dropshipper: ['/dashboard', '/products', '/orders', '/reports'],
};

export function hasPermission(role: UserRole | null, path: string): boolean {
  if (!role) return false;

  if (COMMON_PATHS.some(p => path.startsWith(p))) {
    return true;
  }
  
  const allowedPaths = PERMISSIONS[role] || [];
  return allowedPaths.some(p => path.startsWith(p));
}

export function getDefaultPath(role: UserRole | null): string {
  if (role === 'Admin') return '/admin/dashboard';
  if (role === 'OrdersManager') return '/admin/orders';
  if (role === 'FinanceManager') return '/admin/withdrawals';
  if (role === 'ProductManager') return '/admin/products';
  if (role === 'Dropshipper') return '/dashboard';
  return '/';
}
