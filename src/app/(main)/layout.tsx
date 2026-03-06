'use client';
import { Sidebar } from "@/components/ui/sidebar";
import { Header } from "@/components/layout/header";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { Logo } from "@/components/logo";
import { SidebarContent, SidebarHeader } from "@/components/ui/sidebar";
import Link from "next/link";
import { useSession } from '@/auth/SessionProvider';
import { hasPermission, getDefaultPath } from '@/auth/permissions';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Rocket } from 'lucide-react';

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const { user, role, isLoading } = useSession();
  const pathname = usePathname();
  const router = useRouter();

  const authorized = hasPermission(role, pathname);

  useEffect(() => {
    if (isLoading) {
      return; // Don't do anything while loading.
    }

    if (!user) {
      // If not loading and no user, redirect to login.
      router.replace('/login');
      return;
    }

    // If user is loaded, but they don't have permission for the current page.
    if (!authorized) {
      // Redirect to their default allowed page.
      const defaultPath = getDefaultPath(role);
      router.replace(defaultPath);
    }
  }, [isLoading, user, role, authorized, pathname, router]);

  // Show a loading spinner if the session is loading, or if the user is about to be redirected.
  if (isLoading || !user || !authorized) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Rocket className="h-5 w-5 animate-pulse text-primary" />
          <span>جاري التحميل...</span>
        </div>
      </div>
    );
  }

  // If all checks pass (loaded, user exists, authorized), render the main layout.
  return (
      <div className="flex h-screen">
        <Sidebar>
            <SidebarHeader>
                <Link href="/">
                  <Logo />
                </Link>
            </SidebarHeader>
            <SidebarContent>
                <SidebarNav />
            </SidebarContent>
        </Sidebar>
        <div className="flex flex-col flex-1 h-screen overflow-hidden">
          <Header />
          <main className="flex-1 overflow-y-auto p-6 md:p-10">
            {children}
          </main>
        </div>
      </div>
  );
}
