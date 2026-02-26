'use client';

import { useSession } from "@/firebase";
import { getDefaultPath } from "@/auth/permissions";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Rocket } from "lucide-react";

export default function RootPage() {
  const { user, role, isLoading } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      if (user) {
        // User is logged in, redirect to their dashboard
        const defaultPath = getDefaultPath(role);
        router.replace(defaultPath);
      } else {
        // User is not logged in, redirect to the login page
        router.replace('/login');
      }
    }
  }, [isLoading, user, role, router]);

  // Render a loading indicator while the session is being checked
  return (
    <div className="flex h-screen w-full items-center justify-center bg-background">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Rocket className="h-5 w-5 animate-pulse text-primary" />
        <span>جاري التحميل...</span>
      </div>
    </div>
  );
}
