
'use client';

import { usePathname, useRouter } from 'next/navigation';
import { Loader2, ShieldAlert } from 'lucide-react';
import { useSession } from '@/auth/SessionProvider';
import { hasPermission, getDefaultPath } from '@/auth/permissions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/firebase';
import { signOut } from 'firebase/auth';
import { useEffect } from 'react';

const FullPageLoader = ({ message }: { message: string}) => (
     <div className="flex min-h-screen w-full items-center justify-center bg-background">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          <span>{message}</span>
        </div>
      </div>
);

const AuthErrorState = ({ error }: { error: string }) => {
    const auth = useAuth();
    return (
        <div className="flex h-full w-full items-center justify-center p-4">
             <Card className="w-full max-w-md">
                <CardHeader>
                    <CardTitle>خطأ في الحساب</CardTitle>
                </CardHeader>
                <CardContent>
                    <Alert variant="destructive">
                        <ShieldAlert className="h-4 w-4" />
                        <AlertTitle>فشل تحميل بيانات الجلسة!</AlertTitle>
                        <AlertDescription>
                            {error}.
                             الرجاء تسجيل الخروج والمحاولة مرة أخرى. إذا استمرت المشكلة، تواصل مع الدعم.
                        </AlertDescription>
                    </Alert>
                    {auth && <Button variant="outline" className="mt-4 w-full" onClick={() => signOut(auth)}>تسجيل الخروج</Button>}
                </CardContent>
            </Card>
        </div>
    )
};


export function RoleGuard({ children }: { children: React.ReactNode }) {
  const { user, role, isLoading, error } = useSession();
  const pathname = usePathname();
  const router = useRouter();

  // This effect handles all navigation side-effects based on auth state.
  useEffect(() => {
    if (isLoading) {
      return; // Wait for session data to be fully loaded
    }

    if (!user) {
      // If not logged in, redirect to the login page
      router.replace('/');
    } else if (role && !hasPermission(role, pathname)) {
      // If logged in but lacks permission for the current path, redirect to their default page
      router.replace(getDefaultPath(role));
    }
  }, [isLoading, user, role, pathname, router]);

  // Render a loader while session data is being fetched.
  if (isLoading) {
    return <FullPageLoader message="جاري تحميل بيانات الحساب..." />;
  }

  // Render an error message if the session failed to load.
  if (error) {
    return <AuthErrorState error={error} />;
  }
  
  // After loading, if the user has the correct role and permission, render the page.
  if (user && role && hasPermission(role, pathname)) {
    return <>{children}</>;
  }

  // In all other cases (e.g., no user, or waiting for redirect), show a generic loader.
  // This prevents flashing unauthorized content while the redirect initiated by the useEffect is in progress.
  return <FullPageLoader message="جاري التوجيه..." />;
}
