
'use client';

import { useSession } from './SessionProvider';
import { hasPermission } from './permissions';
import { usePathname } from 'next/navigation';

export function RoleGuard({ children }: { children: React.ReactNode }) {
  const { role, isLoading } = useSession();
  const pathname = usePathname();

  if (isLoading) {
    return null; // Or a loading spinner, but null is fine to prevent layout shifts
  }

  const canAccess = hasPermission(role, pathname);

  if (!canAccess) {
    // This is a fallback. The main redirect logic is in SessionProvider.
    // This will prevent rendering children if the user somehow lands on a forbidden page.
    return null;
  }

  return <>{children}</>;
}
