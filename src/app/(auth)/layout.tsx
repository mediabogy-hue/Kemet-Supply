'use client';

import { useSession } from "@/auth/SessionProvider";
import { getDefaultPath } from "@/auth/permissions";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Rocket } from "lucide-react";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const { user, role, isLoading } = useSession();
  const router = useRouter();

  // Redirect logged-in users away from auth pages
  useEffect(() => {
    if (!isLoading && user && role) {
      const defaultPath = getDefaultPath(role);
      router.replace(defaultPath);
    }
  }, [isLoading, user, role, router]);

  // Show a loading screen while session is loading or while redirecting a logged-in user.
  if (isLoading || (!isLoading && user && role)) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Rocket className="h-5 w-5 animate-pulse text-primary" />
            <span>جاري التحميل...</span>
          </div>
      </div>
    );
  }

  // If not loading and no user, show the auth page (e.g., Login).
  return <>{children}</>;
}
