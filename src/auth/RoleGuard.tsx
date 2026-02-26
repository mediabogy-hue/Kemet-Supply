'use client';

import { useSession } from './SessionProvider';
import { hasPermission } from './permissions';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { getDefaultPath } from './permissions';
import { Rocket } from 'lucide-react';

export function RoleGuard({ children }: { children: React.ReactNode }) {
  const { user, role, isLoading } = useSession();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) {
      return; // Wait until loading is complete
    }

    if (!user) {
      // If not loading and no user, redirect to login
      router.replace('/login');
      return;
    }

    // If user is logged in, check for permissions
    if (!hasPermission(role, pathname)) {
      // If no permission, redirect to their default allowed page
      const defaultPath = getDefaultPath(role);
      router.replace(defaultPath);
    }
  }, [isLoading, user, role, pathname, router]);

  // Render a loading state while loading or before redirection logic kicks in.
  if (isLoading || !user || !hasPermission(role, pathname)) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Rocket className="h-5 w-5 animate-pulse text-primary" />
          <span>جاري التحميل...</span>
        </div>
      </div>
    );
  }

  // If all checks pass, render the children
  return <>{children}</>;
}
