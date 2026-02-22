'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useSession } from '@/auth/SessionProvider';
import { hasPermission, getDefaultPath } from '@/auth/permissions';

// An improved loading skeleton with a spinner for better UX.
const GuardLoadingSkeleton = () => (
  <div className="flex h-full w-full min-h-[calc(100vh-15rem)] items-center justify-center">
    <div className="flex flex-col items-center gap-4">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <div className="text-center">
        <p className="text-lg font-semibold">جاري التحقق من الصلاحيات...</p>
        <p className="text-sm text-muted-foreground">الرجاء الانتظار</p>
      </div>
    </div>
  </div>
);

export function RoleGuard({ children }: { children: React.ReactNode }) {
  const { user, role, isLoading } = useSession();
  const pathname = usePathname();
  const router = useRouter();
  const didRedirect = useRef(false);

  useEffect(() => {
    // Prevent any logic from running while session data is loading or if a redirect is already in progress.
    if (isLoading || didRedirect.current) {
      return;
    }
    
    const publicPaths = ['/', '/register', '/forgot-password'];
    const isPublicPath = publicPaths.includes(pathname) || pathname.startsWith('/product');

    // --- Case 1: User is not authenticated ---
    if (!user) {
      if (!isPublicPath) {
        console.warn(`RoleGuard: Unauthenticated access to private route (${pathname}). Redirecting to login.`);
        didRedirect.current = true;
        router.replace('/');
      }
      return;
    }

    // --- From here, we know the user is authenticated ---

    const defaultPath = getDefaultPath(role);

    // --- Case 2: User is on a public-only path (like login/register) ---
    if (isPublicPath && !pathname.startsWith('/product')) {
      if (pathname !== defaultPath) {
        console.warn(`RoleGuard: Authenticated user on public-only route (${pathname}). Redirecting to default path: ${defaultPath}`);
        didRedirect.current = true;
        router.replace(defaultPath);
      }
      return;
    }

    // --- Case 3: User is on a protected page but lacks permission ---
    if (!hasPermission(role, pathname)) {
      if (pathname !== defaultPath) {
        console.warn(`RoleGuard: Permission denied for role '${role || 'null'}' on path '${pathname}'. Redirecting to default path: ${defaultPath}`);
        didRedirect.current = true;
        router.replace(defaultPath);
      }
      return;
    }

    // If we reach here, the user has permission to view the page.

  }, [isLoading, user, role, pathname, router]);

  // While loading, show a skeleton to prevent layout shifts or blank screens.
  if (isLoading) {
    return <GuardLoadingSkeleton />;
  }

  // If a redirect is about to happen, render the skeleton to avoid flashing the unauthorized content.
  if (didRedirect.current) {
      return <GuardLoadingSkeleton />;
  }

  return <>{children}</>;
}
